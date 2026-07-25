import * as XLSX from 'xlsx';
import { RabItem } from '../types/project';

export interface ParsedRabRow {
  code?: string;
  category?: string;
  description: string;
  volume: number;
  unit: string;
  unitPrice: number;
  totalPrice?: number;
  weightPercentage?: number;
}

/**
 * Parses uploaded Excel or CSV file buffer into RabItem array
 */
export async function parseExcelOrCsvRab(file: File): Promise<ParsedRabRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Grab first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to json array of objects or arrays
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (rawRows.length < 2) {
          resolve([]);
          return;
        }

        // Search for header row
        let headerRowIndex = -1;
        let colIndexMap = {
          code: -1,
          category: -1,
          description: -1,
          volume: -1,
          unit: -1,
          unitPrice: -1,
          totalPrice: -1,
          weight: -1,
        };

        for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
          const rowStr = rawRows[r].map(c => String(c).toLowerCase());
          
          const descIdx = rowStr.findIndex(cell => 
            cell.includes('uraian') || cell.includes('pekerjaan') || cell.includes('nama') || cell.includes('item') || cell.includes('description')
          );

          if (descIdx !== -1) {
            headerRowIndex = r;
            colIndexMap.description = descIdx;
            
            // Map other columns
            rowStr.forEach((cell, idx) => {
              if (cell.includes('kode') || cell.includes('no')) colIndexMap.code = idx;
              if (cell.includes('kategori') || cell.includes('divisi')) colIndexMap.category = idx;
              if (cell.includes('vol') || cell.includes('kuantitas') || cell.includes('volume')) colIndexMap.volume = idx;
              if (cell.includes('sat') || cell.includes('unit') || cell.includes('satuan')) colIndexMap.unit = idx;
              if (cell.includes('harga satuan') || cell.includes('unit price') || cell.includes('tarif')) colIndexMap.unitPrice = idx;
              if (cell.includes('jumlah') || cell.includes('total harga') || cell.includes('jumlah harga')) colIndexMap.totalPrice = idx;
              if (cell.includes('bobot') || cell.includes('weight') || cell.includes('%')) colIndexMap.weight = idx;
            });
            break;
          }
        }

        // If no explicit header row matched, assume standard column order:
        // [0: Kode, 1: Kategori, 2: Uraian, 3: Volume, 4: Satuan, 5: Harga Satuan]
        if (headerRowIndex === -1) {
          headerRowIndex = 0;
          colIndexMap = {
            code: 0,
            category: 1,
            description: 2,
            volume: 3,
            unit: 4,
            unitPrice: 5,
            totalPrice: 6,
            weight: 7,
          };
        }

        const parsedRows: ParsedRabRow[] = [];
        let currentCategory = 'I. Pekerjaan Umum & Persiapan';

        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0) continue;

          const descRaw = colIndexMap.description >= 0 ? String(row[colIndexMap.description] || '').trim() : '';
          const codeRaw = colIndexMap.code >= 0 ? String(row[colIndexMap.code] || '').trim() : '';
          const categoryRaw = colIndexMap.category >= 0 ? String(row[colIndexMap.category] || '').trim() : '';

          // If row is a category header row (e.g. "A. PEKERJAAN STRUKTUR")
          if (descRaw && (descRaw.toUpperCase() === descRaw && descRaw.length > 3 && !row[colIndexMap.volume])) {
            currentCategory = descRaw;
            continue;
          }

          if (!descRaw || descRaw.toLowerCase().includes('total') || descRaw.toLowerCase().includes('jumlah total')) {
            continue;
          }

          const volNum = parseNumber(row[colIndexMap.volume]);
          const unitStr = colIndexMap.unit >= 0 ? String(row[colIndexMap.unit] || 'ls').trim() : 'ls';
          const priceNum = parseNumber(row[colIndexMap.unitPrice]);
          const totalNum = colIndexMap.totalPrice >= 0 ? parseNumber(row[colIndexMap.totalPrice]) : volNum * priceNum;

          if (volNum > 0 || priceNum > 0 || totalNum > 0) {
            parsedRows.push({
              code: codeRaw || `RAB-${parsedRows.length + 1}`,
              category: categoryRaw || currentCategory,
              description: descRaw,
              volume: volNum > 0 ? volNum : 1,
              unit: unitStr || 'ls',
              unitPrice: priceNum > 0 ? priceNum : (volNum > 0 ? totalNum / volNum : totalNum),
              totalPrice: totalNum > 0 ? totalNum : volNum * priceNum,
            });
          }
        }

        resolve(parsedRows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/[^0-9,-.]/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Downloads a sample RAB Excel template for users
 */
export function downloadSampleRabTemplate() {
  const sampleData = [
    ['Kode', 'Kategori Pekerjaan', 'Uraian Pekerjaan', 'Volume', 'Satuan', 'Harga Satuan (Rp)'],
    ['1.1', 'Pekerjaan Persiapan', 'Pembersihan Lahan & Pengukuran', 150, 'm2', 35000],
    ['1.2', 'Pekerjaan Persiapan', 'Pemasangan Bowplank & Direksi Keet', 45, 'm1', 120000],
    ['2.1', 'Pekerjaan Tanah & Pondasi', 'Galian Tanah Pondasi Batu Kali', 85, 'm3', 95000],
    ['2.2', 'Pekerjaan Tanah & Pondasi', 'Pasangan Pondasi Batu Kali 1:4', 60, 'm3', 850000],
    ['2.3', 'Pekerjaan Tanah & Pondasi', 'Urugan Pasir Bawah Pondasi', 12, 'm3', 240000],
    ['3.1', 'Pekerjaan Struktur Beton', 'Beton Sloof 15x20 K-225 Bertulang', 18, 'm3', 4200000],
    ['3.2', 'Pekerjaan Struktur Beton', 'Beton Kolom Utama 25x25 K-250 Bertulang', 24, 'm3', 4800000],
    ['3.3', 'Pekerjaan Struktur Beton', 'Beton Balok & Pelat Lantai K-250 Bertulang', 42, 'm3', 5100000],
    ['4.1', 'Pekerjaan Dinding & Finis', 'Pasangan Dinding Bata Ringan (Hebel)', 320, 'm2', 145000],
    ['4.2', 'Pekerjaan Dinding & Finis', 'Plesteran + Acian Dinding 1:4', 640, 'm2', 850000],
    ['4.3', 'Pekerjaan Dinding & Finis', 'Pengecatan Dinding Interior & Eksterior', 640, 'm2', 45000],
    ['5.1', 'Pekerjaan MEP & Sanitari', 'Instalasi Titik Lampu & Stopkontak', 48, 'titik', 275000],
    ['5.2', 'Pekerjaan MEP & Sanitari', 'Pemasangan Pipa Air Bersih & Kotor', 1, 'ls', 12500000],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RAB_Template');

  XLSX.writeFile(wb, 'Template_RAB_Konstruksi.xlsx');
}

/**
 * Export RAB items to Excel file
 */
export function exportRabToExcel(projectName: string, rabItems: RabItem[], totalValue: number) {
  const headers = ['No', 'Kode', 'Kategori', 'Uraian Pekerjaan', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Jumlah Harga (Rp)', 'Bobot (%)'];
  const rows = rabItems.map((item, index) => [
    index + 1,
    item.code,
    item.category,
    item.description,
    item.volume,
    item.unit,
    item.unitPrice,
    item.totalPrice,
    Number(item.weightPercentage.toFixed(2)),
  ]);

  // Add total summary row
  rows.push([
    '', '', '', 'TOTAL NILAI PROYEK', '', '', '', totalValue, 100.00
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Master_RAB');

  const fileName = `Master_RAB_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
