import React, { useState } from 'react';
import { Project, DailyReportItem, RabItem } from '../types/project';
import { getPeriodNumberForDate, formatPercent, formatIDR } from '../utils/calculator';
import { CameraCaptureModal } from './CameraCaptureModal';
import { generateProjectPdfReport, generateDailyReportPdf } from '../utils/pdfExporter';
import { exportDailyReportsToCsv } from '../utils/dataExporter';
import {
  ClipboardList,
  PlusCircle,
  Calendar,
  Camera,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Eye,
  X,
  User,
  FileText,
  Building,
  Image as ImageIcon,
  Sparkles,
  MapPin,
  Clock,
  Upload,
  Download,
  Loader2,
} from 'lucide-react';

interface DailyReportProps {
  project: Project;
  onAddDailyReport: (newReport: Omit<DailyReportItem, 'id' | 'createdAt'>) => void;
  onDeleteDailyReport: (reportId: string) => void;
}

export const DailyReport: React.FC<DailyReportProps> = ({
  project,
  onAddDailyReport,
  onDeleteDailyReport,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [isExportingAllPdf, setIsExportingAllPdf] = useState(false);
  const [exportingReportId, setExportingReportId] = useState<string | null>(null);

  // Export all documentation photos to PDF
  const handleExportFullReportPdf = async () => {
    setIsExportingAllPdf(true);
    try {
      await generateProjectPdfReport(project);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Gagal mengekspor dokumen PDF.');
    } finally {
      setIsExportingAllPdf(false);
    }
  };

  // Export single daily sheet to PDF
  const handleExportDailyItemPdf = async (report: DailyReportItem) => {
    setExportingReportId(report.id);
    try {
      await generateDailyReportPdf(project, report);
    } catch (err) {
      console.error('Failed to export daily PDF:', err);
      alert('Gagal mengekspor lembar laporan harian.');
    } finally {
      setExportingReportId(null);
    }
  };

  // Default Form State
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedRabItemId, setSelectedRabItemId] = useState<string>(
    project.rabItems[0]?.id || ''
  );
  const [volumeInput, setVolumeInput] = useState<number>(0);
  const [notesInput, setNotesInput] = useState<string>('');
  const [reporterInput, setReporterInput] = useState<string>('Site Inspector');
  const [photoUrlInput, setPhotoUrlInput] = useState<string>('');

  // Sample Site Construction Photos for quick selection
  const samplePhotos = [
    {
      label: 'Pembersihan & Pondasi',
      url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: 'Pebesian & Bekisting',
      url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: 'Pengecoran Beton',
      url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: 'Pasangan Dinding',
      url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80',
    },
    {
      label: 'Pengukuran Lapangan',
      url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80',
    },
  ];

  // Selected RAB Item calculations
  const selectedItem = project.rabItems.find((i) => i.id === selectedRabItemId) || project.rabItems[0];
  
  // Calculate existing volume already reported for selected item
  const existingReportedVolume = project.dailyReports
    .filter((r) => r.rabItemId === selectedRabItemId)
    .reduce((acc, r) => acc + (r.volumeProgress || 0), 0);

  const remainingVolume = Math.max(0, (selectedItem?.volume || 0) - existingReportedVolume);

  // Calculate percentage and weight added based on volume input
  const percentageAdded = selectedItem && selectedItem.volume > 0
    ? (volumeInput / selectedItem.volume) * 100
    : 0;

  const weightAdded = selectedItem
    ? (volumeInput / (selectedItem.volume || 1)) * selectedItem.weightPercentage
    : 0;

  // Period number for report date
  const periodNumber = getPeriodNumberForDate(project.startDate, formDate, project.totalPeriods);

  // Handle Image File Upload (convert to DataURL / Object URL)
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoUrlInput(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Form
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || volumeInput <= 0) return;

    onAddDailyReport({
      date: formDate,
      periodNumber,
      rabItemId: selectedItem.id,
      rabItemCode: selectedItem.code,
      rabItemDescription: selectedItem.description,
      volumeProgress: Number(volumeInput),
      percentageAdded: Number(percentageAdded.toFixed(2)),
      weightAdded: Number(weightAdded.toFixed(4)),
      notes: notesInput,
      photoUrl: photoUrlInput,
      reporterName: reporterInput,
    });

    setSubmitSuccessMsg(
      `Laporan harian berhasil disimpan! Tambahan progres +${weightAdded.toFixed(2)}% telah di-update secara real-time pada Kurva S.`
    );
    setIsFormOpen(false);
    setVolumeInput(0);
    setNotesInput('');
    setPhotoUrlInput('');

    setTimeout(() => setSubmitSuccessMsg(null), 5000);
  };

  // Filter Reports List
  const filteredReports = [...project.dailyReports]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .filter((r) => {
      const matchesSearch =
        (r.rabItemDescription || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.reporterName || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesWeek =
        filterWeek === 'all' || r.periodNumber.toString() === filterWeek;

      return matchesSearch && matchesWeek;
    });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-500" />
            Pelaporan Harian & Update Garis Aktual
          </h2>
          <p className="text-xs text-slate-500">
            Catat progres fisik pekerjaan harian di lapangan untuk otomatis memperbarui Kurva S Aktual.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => exportDailyReportsToCsv(project)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
            title="Export Rekap Laporan Harian ke Format CSV"
          >
            <Download className="w-4 h-4 text-purple-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportFullReportPdf}
            disabled={isExportingAllPdf}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 font-bold text-xs rounded-xl border border-amber-500/40 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Export Laporan Lengkap dengan Lampiran Foto & Kurva S ke PDF"
          >
            {isExportingAllPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            ) : (
              <Download className="w-4 h-4 text-amber-600" />
            )}
            <span>Export Laporan + Foto (PDF)</span>
          </button>

          <button
            onClick={() => {
              setIsFormOpen(true);
              setFormDate(new Date().toISOString().split('T')[0]);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Input Laporan Harian Baru</span>
          </button>
        </div>
      </div>

      {submitSuccessMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 border border-emerald-200 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{submitSuccessMsg}</span>
        </div>
      )}

      {/* Input Form Modal / Collapsible Section */}
      {isFormOpen && (
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              FORM INPUT LAPORAN PROGRESS HARIAN
            </h3>
            <button
              onClick={() => setIsFormOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Report Date */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tanggal Laporan</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Otomatis masuk Minggu ke-{periodNumber}
                </span>
              </div>

              {/* RAB Item Selector */}
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">Pilih Pekerjaan RAB</label>
                <select
                  value={selectedRabItemId}
                  onChange={(e) => {
                    setSelectedRabItemId(e.target.value);
                    setVolumeInput(0);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {project.rabItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.code}] {item.description} ({item.volume} {item.unit}) - Bobot {formatPercent(item.weightPercentage)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Volume Input & Realtime Calculated Impact */}
            {selectedItem && (
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-slate-300">
                  <span>
                    Total Volume RAB: <strong className="text-white">{selectedItem.volume} {selectedItem.unit}</strong>
                  </span>
                  <span>
                    Volume Terlapor Lalu: <strong className="text-blue-400">{existingReportedVolume} {selectedItem.unit}</strong>
                  </span>
                  <span>
                    Sisa Volume: <strong className="text-amber-400">{remainingVolume} {selectedItem.unit}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block font-semibold text-slate-200 mb-1">
                      Volume Dikerjakan Hari Ini ({selectedItem.unit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={volumeInput || ''}
                      onChange={(e) => setVolumeInput(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                      placeholder={`Contoh: ${Math.round(remainingVolume * 0.2)}`}
                    />
                  </div>

                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 flex flex-col justify-center">
                    <span className="text-slate-400 text-[10px]">Persentase Item Tambahan:</span>
                    <span className="font-extrabold text-blue-400 text-sm font-mono">
                      +{formatPercent(percentageAdded)}
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-amber-500/30 flex flex-col justify-center">
                    <span className="text-slate-400 text-[10px]">Dampak Bobot Kurva S:</span>
                    <span className="font-extrabold text-amber-400 text-sm font-mono">
                      +{formatPercent(weightAdded)} Total
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes & Reporter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Catatan / Keterangan Progres Lapangan</label>
                <textarea
                  rows={3}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 placeholder-slate-500"
                  placeholder="Instruksi mandor, kendala cuaca, penggunaan material/alat..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Pelapor / Inspector</label>
                <input
                  type="text"
                  value={reporterInput}
                  onChange={(e) => setReporterInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 mb-2"
                  placeholder="Ir. Budi / Mandor Utama"
                />

                {/* Upgraded GPS Timestamp Camera & Photo Upload Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-300">
                      Dokumentasi Foto Lapangan
                    </label>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                      GPS + Waktu + Watermark Tisna
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Main Camera GPS Button */}
                    <button
                      type="button"
                      onClick={() => setIsCameraModalOpen(true)}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      <Camera className="w-4 h-4 text-slate-950" />
                      <span>Buka Kamera GPS / Upload</span>
                    </button>

                    <span className="text-[11px] text-slate-400">Atau contoh cepat:</span>
                  </div>

                  {/* Sample Photo Pickers */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
                    {samplePhotos.map((sp, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPhotoUrlInput(sp.url)}
                        className={`relative w-12 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                          photoUrlInput === sp.url
                            ? 'border-amber-400 scale-105 shadow-md'
                            : 'border-slate-700 opacity-70 hover:opacity-100'
                        }`}
                        title={sp.label}
                      >
                        <img src={sp.url} alt={sp.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Photo Preview */}
            {photoUrlInput && (
              <div className="relative rounded-xl overflow-hidden border border-amber-500/40 max-h-56 bg-slate-950 p-1 flex items-center justify-center">
                <img
                  src={photoUrlInput}
                  alt="Preview Foto Lapangan"
                  className="w-full max-h-52 object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrlInput('')}
                  className="absolute top-3 right-3 bg-black/80 text-white p-1.5 rounded-full hover:bg-rose-600 shadow-md cursor-pointer transition-colors"
                  title="Hapus foto"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-3 bg-slate-900/90 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-amber-500/40 shadow">
                  ✓ Foto Terlampir dengan Watermark &amp; GPS
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white rounded-xl font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors shadow flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan & Update Kurva S</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History Table & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Riwayat Laporan Progress Harian
            </h3>
            <p className="text-xs text-slate-500">
              Total {project.dailyReports.length} catatan laporan tersimpan
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
              <select
                value={filterWeek}
                onChange={(e) => setFilterWeek(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-2"
              >
                <option value="all">Semua Minggu</option>
                {Array.from({ length: project.totalPeriods }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w.toString()}>
                    Minggu ke-{w}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Cari laporan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Reports Cards / Table */}
        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
              Belum ada riwayat laporan harian yang sesuai filter.
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-4 bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  {report.photoUrl ? (
                    <button
                      onClick={() => setSelectedPhotoModal(report.photoUrl!)}
                      className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 relative group cursor-pointer"
                    >
                      <img src={report.photoUrl} alt="Foto Log" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Eye className="w-4 h-4" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {report.rabItemDescription || 'Pekerjaan RAB'}
                      </span>
                      <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-2 py-0.5 rounded-md font-semibold">
                        {report.rabItemCode || '-'}
                      </span>
                      <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                        Minggu ke-{report.periodNumber}
                      </span>
                    </div>

                    <p className="text-slate-600 line-clamp-2 italic">
                      "{report.notes || 'Tidak ada catatan tambahan.'}"
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(report.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span>• Pelapor: {report.reporterName || 'Site Staff'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Progres Ditambah:</span>
                    <span className="font-extrabold text-amber-600 text-sm font-mono">
                      +{formatPercent(report.weightAdded)} Bobot
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono block">
                      ({report.volumeProgress} unit)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleExportDailyItemPdf(report)}
                      disabled={exportingReportId === report.id}
                      className="px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:text-amber-700 bg-slate-100 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      title="Cetak Lembar Laporan Harian Ini ke PDF"
                    >
                      {exportingReportId === report.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Cetak PDF</span>
                    </button>

                    <button
                      onClick={() => onDeleteDailyReport(report.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Laporan Ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Photo Preview Modal */}
      {selectedPhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl p-2">
            <button
              onClick={() => setSelectedPhotoModal(null)}
              className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded-full hover:bg-rose-600 z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedPhotoModal}
              alt="Dokumentasi Foto Lapangan Detail"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* GPS Timestamp Camera Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onPhotoCaptured={(dataUrl) => {
          setPhotoUrlInput(dataUrl);
        }}
        projectName={project.name}
        itemDescription={
          selectedItem
            ? `[${selectedItem.code}] ${selectedItem.description}`
            : 'Pekerjaan Lapangan'
        }
        locationName={project.location || 'Site Lapangan'}
        reporterName={reporterInput || 'Site Inspector'}
      />
    </div>
  );
};
