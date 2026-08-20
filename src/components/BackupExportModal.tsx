import React, { useState, useRef } from 'react';
import { Project } from '../types/project';
import {
  exportProjectToJson,
  exportAllProjectsToJson,
  exportRabToCsv,
  exportDailyReportsToCsv,
  parseJsonBackupFile,
} from '../utils/dataExporter';
import {
  X,
  FileJson,
  FileSpreadsheet,
  Download,
  Upload,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  Layers,
  Database,
  Calendar,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { formatIDR } from '../utils/calculator';

interface BackupExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project;
  allProjects: Project[];
  onImportProjects: (importedProjects: Project[]) => void;
}

export const BackupExportModal: React.FC<BackupExportModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  allProjects,
  onImportProjects,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'restore'>('export');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setSuccessMessage(null);
    } else {
      setSuccessMessage(msg);
      setErrorMessage(null);
    }
    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 4500);
  };

  const handleExportSingleJson = () => {
    try {
      exportProjectToJson(currentProject);
      showNotification(`File backup JSON untuk proyek "${currentProject.name}" berhasil diunduh!`);
    } catch (e: any) {
      showNotification(`Gagal mengunduh backup JSON: ${e.message}`, true);
    }
  };

  const handleExportAllJson = () => {
    try {
      exportAllProjectsToJson(allProjects);
      showNotification(`File backup bundle (${allProjects.length} proyek) berhasil diunduh!`);
    } catch (e: any) {
      showNotification(`Gagal mengunduh backup bundle: ${e.message}`, true);
    }
  };

  const handleExportRabCsv = () => {
    try {
      exportRabToCsv(currentProject);
      showNotification(`File spreadsheet CSV untuk item RAB "${currentProject.name}" berhasil diunduh!`);
    } catch (e: any) {
      showNotification(`Gagal mengunduh CSV RAB: ${e.message}`, true);
    }
  };

  const handleExportDailyCsv = () => {
    try {
      if (currentProject.dailyReports.length === 0) {
        showNotification('Proyek ini belum memiliki data laporan harian untuk diekspor ke CSV.', true);
        return;
      }
      exportDailyReportsToCsv(currentProject);
      showNotification(`File spreadsheet CSV rekap ${currentProject.dailyReports.length} laporan harian berhasil diunduh!`);
    } catch (e: any) {
      showNotification(`Gagal mengunduh CSV Laporan: ${e.message}`, true);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const res = await parseJsonBackupFile(file);
      if (res.success && res.projects && res.projects.length > 0) {
        onImportProjects(res.projects);
        showNotification(res.message || `Berhasil memulihkan ${res.projects.length} proyek!`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        showNotification(res.message || 'File backup JSON tidak valid.', true);
      }
    } catch (err: any) {
      showNotification(`Gagal memproses file: ${err.message}`, true);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Backup &amp; Export Data Lokal</span>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  JSON &amp; CSV
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Amankan salinan data proyek secara offline di luar cloud untuk arsip lokal Anda.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-5 text-xs font-bold">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Data (JSON &amp; CSV)</span>
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'restore'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Restore / Pulihkan dari File JSON</span>
          </button>
        </div>

        {/* Status Notification Banners */}
        {successMessage && (
          <div className="mx-5 mt-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              {/* Active Project Highlight Card */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    Target Proyek Aktif:
                  </span>
                  <p className="font-bold text-white text-sm">{currentProject.name}</p>
                  <p className="text-slate-400 text-[11px]">
                    Kode: {currentProject.code} • {currentProject.rabItems.length} Item RAB • {currentProject.dailyReports.length} Laporan Harian
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-slate-400">Total Nilai Kontrak</span>
                  <p className="font-bold text-amber-400">{formatIDR(currentProject.totalContractValue)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Single Project JSON Backup */}
                <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 rounded-xl p-4 flex flex-col justify-between transition-all group">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                        Backup JSON Proyek Aktif
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Salinan lengkap 1 file JSON (RAB, Distribusi Jadwal Kurva S, Laporan Harian &amp; Foto).
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleExportSingleJson}
                    className="mt-4 w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh File JSON Proyek</span>
                  </button>
                </div>

                {/* 2. All Projects JSON Bundle Backup */}
                <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 rounded-xl p-4 flex flex-col justify-between transition-all group">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <FolderArchive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                        Backup Semua Proyek (Bundle)
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Mengemas seluruh ({allProjects.length}) proyek yang tersimpan di perangkat ke dalam 1 file arsip JSON.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleExportAllJson}
                    className="mt-4 w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Arsip {allProjects.length} Proyek</span>
                  </button>
                </div>

                {/* 3. Export RAB to CSV */}
                <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl p-4 flex flex-col justify-between transition-all group">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                        Export Item RAB ke CSV
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Tabel spreadsheet item pekerjaan RAB, volume, harga satuan, bobot %, dan volume realisasi.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleExportRabCsv}
                    className="mt-4 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh CSV Data RAB</span>
                  </button>
                </div>

                {/* 4. Export Daily Reports to CSV */}
                <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/50 rounded-xl p-4 flex flex-col justify-between transition-all group">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors">
                        Export Laporan Harian ke CSV
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Rekap kronologis seluruh entri laporan harian fisik, tenaga kerja, cuaca, dan catatan mandor.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleExportDailyCsv}
                    className="mt-4 w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh CSV Laporan Harian</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Restore Section */
            <div className="space-y-4 py-2">
              <div className="p-6 border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl bg-slate-950/60 text-center space-y-3 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-white">Pilih File JSON Hasil Backup</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Sistem akan memverifikasi dan memulihkan data proyek secara instan ke dalam memori aplikasi serta Firebase Firestore.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="json-restore-input"
                />

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Membaca Data Backup...</span>
                      </>
                    ) : (
                      <>
                        <FileJson className="w-4 h-4 text-slate-950" />
                        <span>Pilih File .JSON dari Komputer / HP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 text-xs space-y-2 text-slate-300">
                <div className="font-bold text-white flex items-center gap-1.5 text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Informasi Pemulihan (Restore):</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                  <li>Mendukung file backup 1 proyek maupun file backup bundle seluruh proyek.</li>
                  <li>Jika Anda telah login ke Google, proyek yang dipulihkan akan otomatis disinkronkan ke Cloud Firestore.</li>
                  <li>Data proyek yang sudah ada tidak akan terhapus jika memiliki ID yang berbeda.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Format didukung: <strong>.JSON</strong> &amp; <strong>.CSV</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
