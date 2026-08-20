import { Project, RabItem, DailyReportItem } from '../types/project';
import { formatPercent, formatIDR } from './calculator';

/**
 * Triggers a browser download of a text/blob file
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Clean string for safe filename
 */
function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
}

/**
 * Get date string for filename (YYYYMMDD_HHMM)
 */
function getTimestampStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}_${hh}${mm}`;
}

/**
 * Export single active project to JSON backup file
 */
export function exportProjectToJson(project: Project): void {
  const exportPayload = {
    app: 'RAB_KURVA_S_MANAJEMEN',
    version: '1.0',
    exportDate: new Date().toISOString(),
    exportType: 'single_project',
    project,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const filename = `Backup_Proyek_${safeFilename(project.code || project.name)}_${getTimestampStr()}.json`;
  downloadFile(jsonStr, filename, 'application/json;charset=utf-8;');
}

/**
 * Export all projects to JSON backup bundle
 */
export function exportAllProjectsToJson(projects: Project[]): void {
  const exportPayload = {
    app: 'RAB_KURVA_S_MANAJEMEN',
    version: '1.0',
    exportDate: new Date().toISOString(),
    exportType: 'all_projects_bundle',
    totalProjects: projects.length,
    projects,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const filename = `Backup_Semua_Proyek_RAB_${getTimestampStr()}.json`;
  downloadFile(jsonStr, filename, 'application/json;charset=utf-8;');
}

/**
 * Escapes CSV field for RFC-4180 compliance
 */
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export Project RAB Items to CSV Spreadsheet (Excel-ready with UTF-8 BOM)
 */
export function exportRabToCsv(project: Project): void {
  // Calculate item progress
  const actualVolMap = new Map<string, number>();
  project.dailyReports.forEach((r) => {
    const cur = actualVolMap.get(r.rabItemId) || 0;
    actualVolMap.set(r.rabItemId, cur + r.volumeProgress);
  });

  const headers = [
    'No',
    'Kode Item',
    'Kategori Pekerjaan',
    'Uraian Pekerjaan',
    'Satuan',
    'Volume RAB',
    'Harga Satuan (Rp)',
    'Total Harga RAB (Rp)',
    'Bobot RAB (%)',
    'Volume Realisasi Terlapor',
    'Capaian Fisik (%)',
    'Nilai Realisasi (Rp)',
  ];

  const rows: string[][] = [];
  rows.push(headers);

  project.rabItems.forEach((item, idx) => {
    const actualVol = actualVolMap.get(item.id) || 0;
    const ratio = Math.min(1, actualVol / (item.volume || 1));
    const pct = ratio * 100;
    const earnedVal = ratio * item.totalPrice;

    rows.push([
      String(idx + 1),
      item.code || '',
      item.category || '',
      item.description,
      item.unit,
      String(item.volume),
      String(item.unitPrice),
      String(item.totalPrice),
      item.weightPercentage.toFixed(4),
      actualVol.toFixed(2),
      pct.toFixed(2),
      Math.round(earnedVal).toString(),
    ]);
  });

  // Convert to CSV with semicolon or comma separator + UTF-8 BOM
  const csvContent = '\uFEFF' + rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  const filename = `RAB_${safeFilename(project.code || project.name)}_${getTimestampStr()}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export Project Daily Reports (Laporan Harian) to CSV Spreadsheet
 */
export function exportDailyReportsToCsv(project: Project): void {
  const headers = [
    'ID Laporan',
    'Tanggal',
    'Minggu Periode Ke',
    'Kode RAB',
    'Uraian Pekerjaan',
    'Penambahan Volume',
    'Satuan',
    'Progress Item Ditambah (%)',
    'Bobot Proyek Ditambah (%)',
    'Nama Pelapor / Pengawas',
    'Catatan / Kendala Lapangan',
    'Status Foto Lapangan',
  ];

  const rows: string[][] = [];
  rows.push(headers);

  // Sort chronological
  const sortedReports = [...project.dailyReports].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedReports.forEach((r) => {
    // find rab item unit
    const matchedRab = project.rabItems.find((item) => item.id === r.rabItemId);
    const unit = matchedRab ? matchedRab.unit : '-';

    rows.push([
      r.id,
      r.date,
      `Minggu ${r.periodNumber}`,
      r.rabItemCode || '',
      r.rabItemDescription || '',
      String(r.volumeProgress),
      unit,
      r.percentageAdded.toFixed(2),
      r.weightAdded.toFixed(4),
      r.reporterName || 'Site Staff',
      r.notes || '',
      r.photoUrl ? 'Ada Foto (GPS Timestamp)' : 'Tanpa Foto',
    ]);
  });

  const csvContent = '\uFEFF' + rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  const filename = `Laporan_Harian_${safeFilename(project.code || project.name)}_${getTimestampStr()}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

export interface ImportJsonResult {
  success: boolean;
  projects?: Project[];
  importedCount?: number;
  message?: string;
}

/**
 * Parse and validate JSON backup file
 */
export async function parseJsonBackupFile(file: File): Promise<ImportJsonResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed) {
          return resolve({ success: false, message: 'Format file JSON kosong atau tidak valid.' });
        }

        // Case 1: All projects bundle export
        if (parsed.exportType === 'all_projects_bundle' && Array.isArray(parsed.projects)) {
          const validProjects = parsed.projects.filter(isValidProject);
          if (validProjects.length === 0) {
            return resolve({ success: false, message: 'Tidak ada struktur proyek valid dalam file backup bundle.' });
          }
          return resolve({
            success: true,
            projects: validProjects,
            importedCount: validProjects.length,
            message: `Berhasil membaca ${validProjects.length} proyek dari file backup bundle.`,
          });
        }

        // Case 2: Single project export
        if (parsed.exportType === 'single_project' && parsed.project && isValidProject(parsed.project)) {
          return resolve({
            success: true,
            projects: [parsed.project],
            importedCount: 1,
            message: `Berhasil membaca proyek "${parsed.project.name}".`,
          });
        }

        // Case 3: Raw Project Object
        if (isValidProject(parsed)) {
          return resolve({
            success: true,
            projects: [parsed],
            importedCount: 1,
            message: `Berhasil membaca proyek "${parsed.name}".`,
          });
        }

        // Case 4: Raw Array of Projects
        if (Array.isArray(parsed)) {
          const validProjects = parsed.filter(isValidProject);
          if (validProjects.length > 0) {
            return resolve({
              success: true,
              projects: validProjects,
              importedCount: validProjects.length,
              message: `Berhasil membaca ${validProjects.length} proyek.`,
            });
          }
        }

        return resolve({
          success: false,
          message: 'Struktur file JSON tidak sesuai dengan format backup proyek RAB & Kurva S.',
        });
      } catch (err: any) {
        resolve({
          success: false,
          message: `Gagal membaca file JSON: ${err.message || 'Format tidak valid'}`,
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, message: 'Terjadi kesalahan saat membaca file.' });
    };

    reader.readAsText(file);
  });
}

function isValidProject(p: any): p is Project {
  return (
    p &&
    typeof p === 'object' &&
    typeof p.name === 'string' &&
    Array.isArray(p.rabItems) &&
    typeof p.totalContractValue === 'number'
  );
}
