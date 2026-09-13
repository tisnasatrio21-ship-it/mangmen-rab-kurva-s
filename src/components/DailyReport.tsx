import React, { useState, useRef, useEffect } from 'react';
import { Project, DailyReportItem, RabItem } from '../types/project';
import { getPeriodNumberForDate, formatPercent, formatIDR } from '../utils/calculator';
import { CameraCaptureModal } from './CameraCaptureModal';
import { generateProjectPdfReport, generateDailyReportPdf } from '../utils/pdfExporter';
import { exportDailyReportsToCsv } from '../utils/dataExporter';
import { useLanguage } from '../i18n/LanguageContext';
import {
  loadImageFromFile,
  applyWatermarkToImage,
  getCurrentGpsPosition,
  WatermarkOptions,
} from '../utils/photoWatermark';
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
  Smartphone,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Layers,
} from 'lucide-react';

interface DailyReportProps {
  project: Project;
  onAddDailyReport: (newReport: Omit<DailyReportItem, 'id' | 'createdAt'>) => void;
  onDeleteDailyReport: (reportId: string) => void;
  onUpdateDailyReport?: (updatedReport: DailyReportItem) => void;
}

export const DailyReport: React.FC<DailyReportProps> = ({
  project,
  onAddDailyReport,
  onDeleteDailyReport,
  onUpdateDailyReport,
}) => {
  const { t, language } = useLanguage();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  // Manage photos modal for existing report
  const [managePhotosReport, setManagePhotosReport] = useState<DailyReportItem | null>(null);
  const [managePhotosList, setManagePhotosList] = useState<string[]>([]);
  const [isProcessingManagePhoto, setIsProcessingManagePhoto] = useState(false);
  const [managePhotoError, setManagePhotoError] = useState<string | null>(null);
  const manageGalleryInputRef = useRef<HTMLInputElement>(null);
  const manageCameraInputRef = useRef<HTMLInputElement>(null);

  // Lightbox gallery modal state for viewing multiple photos in high resolution
  const [previewGallery, setPreviewGallery] = useState<{
    photos: string[];
    activeIndex: number;
    title?: string;
    subtitle?: string;
  } | null>(null);

  // Keyboard navigation for photo gallery lightbox
  useEffect(() => {
    if (!previewGallery) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewGallery(null);
      } else if (e.key === 'ArrowLeft') {
        setPreviewGallery((prev) =>
          prev
            ? {
                ...prev,
                activeIndex: (prev.activeIndex - 1 + prev.photos.length) % prev.photos.length,
              }
            : null
        );
      } else if (e.key === 'ArrowRight') {
        setPreviewGallery((prev) =>
          prev
            ? {
                ...prev,
                activeIndex: (prev.activeIndex + 1) % prev.photos.length,
              }
            : null
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewGallery]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [isExportingAllPdf, setIsExportingAllPdf] = useState(false);
  const [exportingReportId, setExportingReportId] = useState<string | null>(null);

  // Helper to extract all photos attached to a daily report item
  const getReportPhotos = (report: DailyReportItem): string[] => {
    if (Array.isArray(report.photoUrls) && report.photoUrls.length > 0) {
      return report.photoUrls.filter(Boolean);
    }
    return report.photoUrl ? [report.photoUrl] : [];
  };

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
  const [photoUrlsInput, setPhotoUrlsInput] = useState<string[]>([]);

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

  // Photo upload & watermarking state in DailyReport
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoProcessError, setPhotoProcessError] = useState<string | null>(null);
  const directGalleryInputRef = useRef<HTMLInputElement>(null);
  const directCameraInputRef = useRef<HTMLInputElement>(null);

  // Handle Direct Photo Uploads (Gallery or Phone Camera) with auto GPS + Watermark
  const handleDirectPhotoFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessingPhoto(true);
    setPhotoProcessError(null);
    try {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (fileArray.length === 0) {
        throw new Error('Harap pilih file gambar yang valid (JPG, PNG, WebP).');
      }

      const gps = await getCurrentGpsPosition();
      const optionsBase: WatermarkOptions = {
        projectName: project.name,
        itemDescription: selectedItem ? `[${selectedItem.code}] ${selectedItem.description}` : 'Pekerjaan Proyek',
        locationName: project.location || 'Lokasi Proyek',
        reporterName: reporterInput,
        customWatermark: 'app by Tisna',
        gpsCoords: gps,
        customDate: new Date(formDate || Date.now()),
      };

      const newStampedUrls: string[] = [];
      for (const file of fileArray) {
        const img = await loadImageFromFile(file);
        const stamped = await applyWatermarkToImage(img, optionsBase);
        newStampedUrls.push(stamped);
      }

      setPhotoUrlsInput((prev) => [...prev, ...newStampedUrls]);
    } catch (err: any) {
      console.error('Error watermarking direct photo(s):', err);
      setPhotoProcessError(err.message || 'Gagal memproses foto. Pastikan format JPG/PNG valid.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleDirectGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleDirectPhotoFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDirectCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleDirectPhotoFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotoUrlsInput((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearAllPhotos = () => {
    setPhotoUrlsInput([]);
  };

  const handleToggleSamplePhoto = (url: string) => {
    setPhotoUrlsInput((prev) => {
      if (prev.includes(url)) {
        return prev.filter((u) => u !== url);
      }
      return [...prev, url];
    });
  };

  // Open modal to manage / add more photos to an existing report
  const handleOpenManagePhotos = (report: DailyReportItem) => {
    setManagePhotosReport(report);
    setManagePhotosList(getReportPhotos(report));
    setManagePhotoError(null);
  };

  // Handle files added to existing report
  const handleManagePhotoFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0 || !managePhotosReport) return;
    setIsProcessingManagePhoto(true);
    setManagePhotoError(null);
    try {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (fileArray.length === 0) {
        throw new Error('Harap pilih file gambar yang valid (JPG, PNG, WebP).');
      }

      const gps = await getCurrentGpsPosition();
      const optionsBase: WatermarkOptions = {
        projectName: project.name,
        itemDescription: managePhotosReport.rabItemDescription
          ? `${managePhotosReport.rabItemCode ? `[${managePhotosReport.rabItemCode}] ` : ''}${managePhotosReport.rabItemDescription}`
          : 'Pekerjaan Proyek',
        locationName: project.location || 'Lokasi Proyek',
        reporterName: managePhotosReport.reporterName || 'Site Staff',
        customWatermark: 'app by Tisna',
        gpsCoords: gps,
        customDate: new Date(managePhotosReport.date || Date.now()),
      };

      const newStampedUrls: string[] = [];
      for (const file of fileArray) {
        const img = await loadImageFromFile(file);
        const stamped = await applyWatermarkToImage(img, optionsBase);
        newStampedUrls.push(stamped);
      }

      setManagePhotosList((prev) => [...prev, ...newStampedUrls]);
    } catch (err: any) {
      console.error('Error watermarking added photo(s):', err);
      setManagePhotoError(err.message || 'Gagal memproses foto.');
    } finally {
      setIsProcessingManagePhoto(false);
    }
  };

  const handleManageGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleManagePhotoFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleManageCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleManagePhotoFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleRemoveManagePhoto = (idxToRemove: number) => {
    setManagePhotosList((prev) => prev.filter((_, i) => i !== idxToRemove));
  };

  const handleSaveManagePhotos = () => {
    if (!managePhotosReport || !onUpdateDailyReport) return;
    const updated: DailyReportItem = {
      ...managePhotosReport,
      photoUrl: managePhotosList[0] || '',
      photoUrls: managePhotosList,
    };
    onUpdateDailyReport(updated);
    const countDiff = managePhotosList.length - getReportPhotos(managePhotosReport).length;
    setSubmitSuccessMsg(
      countDiff > 0
        ? `Berhasil menambahkan ${countDiff} foto baru! Total sekarang ${managePhotosList.length} foto dokumentasi tersimpan.`
        : `Foto dokumentasi laporan berhasil diperbarui (total ${managePhotosList.length} foto).`
    );
    setManagePhotosReport(null);
    setTimeout(() => setSubmitSuccessMsg(null), 5000);
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
      photoUrl: photoUrlsInput[0] || '',
      photoUrls: photoUrlsInput,
      reporterName: reporterInput,
    });

    setSubmitSuccessMsg(
      `Laporan harian berhasil disimpan dengan ${photoUrlsInput.length} foto dokumentasi! Tambahan progres +${weightAdded.toFixed(2)}% telah di-update secara real-time pada Kurva S.`
    );
    setIsFormOpen(false);
    setVolumeInput(0);
    setNotesInput('');
    setPhotoUrlsInput([]);

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

                {/* Upgraded Multi-Photo GPS Timestamp Camera & Photo Upload Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-300">
                      Dokumentasi Foto Lapangan {photoUrlsInput.length > 0 && `(${photoUrlsInput.length} Terpilih)`}
                    </label>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Auto-Watermark: GPS + Waktu + "app by Tisna"
                    </span>
                  </div>

                  {/* Hidden inputs for direct gallery and native camera */}
                  <input
                    ref={directGalleryInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleDirectGalleryChange}
                    className="hidden"
                    id="daily-gallery-input"
                  />
                  <input
                    ref={directCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleDirectCameraChange}
                    className="hidden"
                    id="daily-camera-input"
                  />

                  {/* Processing Watermark Indicator */}
                  {isProcessingPhoto && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs text-amber-300 animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                      <span>Memproses foto &amp; menempel watermark GPS "app by Tisna"...</span>
                    </div>
                  )}

                  {/* Process Error Banner */}
                  {photoProcessError && (
                    <div className="p-2 bg-rose-950/80 border border-rose-600/70 rounded-xl text-xs text-rose-200 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{photoProcessError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhotoProcessError(null)}
                        className="text-rose-400 hover:text-white p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* 3 Upload Options: Gallery (Multiple), Native Camera, & GPS HUD Viewfinder */}
                  <div className="space-y-2">
                    <p className="text-[11px] text-amber-300/90 bg-amber-950/40 border border-amber-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span><strong>Bisa tambah lebih dari 1 foto:</strong> Pilih banyak foto sekaligus dari galeri atau jepret kamera HP berulang kali.</span>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* 1. Gallery Button (Multiple allowed) */}
                      <button
                        type="button"
                        onClick={() => directGalleryInputRef.current?.click()}
                        disabled={isProcessingPhoto}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 hover:border-amber-400/50 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                        title="Pilih 1 atau beberapa foto sekaligus dari galeri HP / komputer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>Galeri HP / File</span>
                      </button>

                      {/* 2. Native Camera Shutter */}
                      <button
                        type="button"
                        onClick={() => directCameraInputRef.current?.click()}
                        disabled={isProcessingPhoto}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 hover:border-emerald-400/50 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                        title="Buka kamera smartphone untuk foto fisik (bisa foto berulang kali)"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Kamera HP</span>
                      </button>

                      {/* 3. Interactive GPS Viewfinder Modal */}
                      <button
                        type="button"
                        onClick={() => setIsCameraModalOpen(true)}
                        disabled={isProcessingPhoto}
                        className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                        title="Lihat HUD live kamera dengan koordinat GPS real-time"
                      >
                        <Camera className="w-3.5 h-3.5 text-slate-950" />
                        <span>Live GPS Pro</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 shrink-0">Contoh cepat:</span>
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                      {samplePhotos.map((sp, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleSamplePhoto(sp.url)}
                          className={`relative w-10 h-8 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            photoUrlsInput.includes(sp.url)
                              ? 'border-amber-400 scale-105 shadow-md ring-2 ring-amber-400/50'
                              : 'border-slate-700 opacity-70 hover:opacity-100'
                          }`}
                          title={`Klik untuk tambah/lepas foto: ${sp.label}`}
                        >
                          <img src={sp.url} alt={sp.label} className="w-full h-full object-cover" />
                          {photoUrlsInput.includes(sp.url) && (
                            <span className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                              <CheckCircle2 className="w-3 h-3 text-amber-300" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Photos Grid Preview (Multi-Photo) */}
            {photoUrlsInput.length > 0 && (
              <div className="space-y-2 bg-slate-900/80 p-3.5 rounded-xl border border-amber-500/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      {photoUrlsInput.length} Foto Dokumentasi Terlampir
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                      Auto-Watermark GPS Aktif
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewGallery({
                          photos: photoUrlsInput,
                          activeIndex: 0,
                          title: selectedItem ? `[${selectedItem.code}] ${selectedItem.description}` : 'Form Laporan',
                          subtitle: `Total ${photoUrlsInput.length} foto dokumentasi siap disimpan`,
                        })
                      }
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Perbesar Galeri
                    </button>
                    {photoUrlsInput.length > 1 && (
                      <button
                        type="button"
                        onClick={handleClearAllPhotos}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer ml-2"
                      >
                        <Trash2 className="w-3 h-3" /> Hapus Semua
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1">
                  {photoUrlsInput.map((url, idx) => (
                    <div
                      key={idx}
                      className="group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-[4/3] shadow-sm hover:border-amber-400 transition-all"
                    >
                      <img
                        src={url}
                        alt={`Dokumentasi Lapangan ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {/* Photo Index Badge */}
                      <span className="absolute top-1.5 left-1.5 bg-black/75 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        #{idx + 1}
                      </span>

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewGallery({
                              photos: photoUrlsInput,
                              activeIndex: idx,
                              title: selectedItem ? `[${selectedItem.code}] ${selectedItem.description}` : 'Form Laporan',
                              subtitle: `Foto #${idx + 1} dari ${photoUrlsInput.length}`,
                            })
                          }
                          className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-white rounded-lg cursor-pointer"
                          title="Lihat Detail Foto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer"
                          title="Hapus Foto Ini"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add More Photos Quick Action Card */}
                  <div className="rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-400/80 bg-slate-900/40 p-2 flex flex-col items-center justify-center text-center aspect-[4/3] transition-colors">
                    <span className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                      <Plus className="w-3 h-3 text-amber-400" /> Tambah Foto
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => directGalleryInputRef.current?.click()}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg cursor-pointer transition-colors"
                        title="Tambah dari Galeri"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => directCameraInputRef.current?.click()}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg cursor-pointer transition-colors"
                        title="Tambah dengan Kamera HP"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCameraModalOpen(true)}
                        className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg cursor-pointer transition-colors"
                        title="Live GPS Pro"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white rounded-xl font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors shadow flex items-center gap-1.5 cursor-pointer"
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
            filteredReports.map((report) => {
              const reportPhotos = getReportPhotos(report);
              const hasMultiplePhotos = reportPhotos.length > 1;

              return (
                <div
                  key={report.id}
                  className="p-4 bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    {reportPhotos.length > 0 ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() =>
                            setPreviewGallery({
                              photos: reportPhotos,
                              activeIndex: 0,
                              title: `${report.rabItemCode ? `[${report.rabItemCode}] ` : ''}${report.rabItemDescription || 'Pekerjaan RAB'}`,
                              subtitle: `Laporan: ${report.date} • Pelapor: ${report.reporterName || 'Site Staff'}${hasMultiplePhotos ? ` (Total ${reportPhotos.length} Foto)` : ''}`,
                            })
                          }
                          className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 relative group cursor-pointer shadow-xs"
                          title="Klik untuk membuka galeri foto inspeksi"
                        >
                          <img src={reportPhotos[0]} alt="Foto Log" className="w-full h-full object-cover" />
                          {hasMultiplePhotos && (
                            <span className="absolute bottom-1 right-1 bg-amber-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                              <Layers className="w-2.5 h-2.5" />
                              {reportPhotos.length}
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </button>

                        {/* Additional mini thumbnails preview on medium screens */}
                        {hasMultiplePhotos && (
                          <div className="hidden sm:flex flex-col gap-1">
                            {reportPhotos.slice(1, 3).map((pUrl, pIdx) => (
                              <button
                                key={pIdx}
                                onClick={() =>
                                  setPreviewGallery({
                                    photos: reportPhotos,
                                    activeIndex: pIdx + 1,
                                    title: `${report.rabItemCode ? `[${report.rabItemCode}] ` : ''}${report.rabItemDescription || 'Pekerjaan RAB'}`,
                                    subtitle: `Laporan: ${report.date} • Foto #${pIdx + 2} dari ${reportPhotos.length}`,
                                  })
                                }
                                className="w-7 h-7 rounded-md overflow-hidden border border-slate-200 hover:border-amber-400 cursor-pointer opacity-80 hover:opacity-100 transition-all"
                                title={`Foto #${pIdx + 2}`}
                              >
                                <img src={pUrl} alt="Thumbnail tambahan" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
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
                        {hasMultiplePhotos && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                            <Layers className="w-3 h-3 text-amber-600" />
                            {reportPhotos.length} Foto
                          </span>
                        )}
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
                      {onUpdateDailyReport && (
                        <button
                          onClick={() => handleOpenManagePhotos(report)}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          title="Tambah atau kelola foto dokumentasi pada laporan ini"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-600" />
                          <span>+ Tambah Foto</span>
                          {reportPhotos.length > 0 && (
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                              {reportPhotos.length}
                            </span>
                          )}
                        </button>
                      )}

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
              );
            })
          )}
        </div>
      </div>

      {/* Multi-Photo Lightbox Gallery Modal with Carousel Navigation */}
      {previewGallery && previewGallery.photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6"
          onClick={() => setPreviewGallery(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
              <div className="min-w-0 pr-2">
                <h4 className="text-sm font-bold text-slate-100 truncate">
                  {previewGallery.title || 'Dokumentasi Lapangan'}
                </h4>
                {previewGallery.subtitle && (
                  <p className="text-[11px] text-slate-400 truncate">{previewGallery.subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                  Foto {previewGallery.activeIndex + 1} / {previewGallery.photos.length}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewGallery(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                  title="Tutup (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Viewer with Next/Prev Arrows */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[440px] p-2">
              <img
                src={previewGallery.photos[previewGallery.activeIndex]}
                alt={`Foto ${previewGallery.activeIndex + 1}`}
                className="max-h-[68vh] w-full object-contain rounded-lg"
              />

              {/* Prev Button */}
              {previewGallery.photos.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewGallery((prev) =>
                      prev
                        ? {
                            ...prev,
                            activeIndex:
                              (prev.activeIndex - 1 + prev.photos.length) % prev.photos.length,
                          }
                        : null
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 bg-black/60 hover:bg-amber-500 text-white hover:text-slate-950 rounded-full cursor-pointer shadow-lg transition-all backdrop-blur-xs"
                  title="Foto Sebelumnya (Panah Kiri)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Next Button */}
              {previewGallery.photos.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewGallery((prev) =>
                      prev
                        ? {
                            ...prev,
                            activeIndex: (prev.activeIndex + 1) % prev.photos.length,
                          }
                        : null
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-black/60 hover:bg-amber-500 text-white hover:text-slate-950 rounded-full cursor-pointer shadow-lg transition-all backdrop-blur-xs"
                  title="Foto Selanjutnya (Panah Kanan)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Bottom Thumbnail Strip for Multi-Photo */}
            {previewGallery.photos.length > 1 && (
              <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] text-slate-400 shrink-0">Semua Foto:</span>
                {previewGallery.photos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setPreviewGallery((prev) => (prev ? { ...prev, activeIndex: i } : null))
                    }
                    className={`relative w-12 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      previewGallery.activeIndex === i
                        ? 'border-amber-400 scale-105 shadow-md'
                        : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={photo} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Kelola & Tambah Foto Laporan Tertentu */}
      {managePhotosReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl p-5 sm:p-6 shadow-2xl text-white my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                    <Camera className="w-5 h-5" />
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Kelola &amp; Tambah Foto Dokumentasi
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  {managePhotosReport.rabItemCode ? `[${managePhotosReport.rabItemCode}] ` : ''}
                  {managePhotosReport.rabItemDescription || 'Pekerjaan RAB'} • Tanggal: {managePhotosReport.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagePhotosReport(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={manageGalleryInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleManageGalleryChange}
              className="hidden"
            />
            <input
              ref={manageCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleManageCameraChange}
              className="hidden"
            />

            {/* Scrollable Content */}
            <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Add New Photos Action Panel */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-amber-400" />
                    Tambah Foto Baru ke Laporan Ini
                  </span>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Auto-Watermark GPS "app by Tisna"
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => manageGalleryInputRef.current?.click()}
                    disabled={isProcessingManagePhoto}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 hover:border-amber-400/50 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    title="Pilih beberapa foto sekaligus dari galeri ponsel/laptop"
                  >
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span>Pilih Banyak (Galeri)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => manageCameraInputRef.current?.click()}
                    disabled={isProcessingManagePhoto}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 hover:border-emerald-400/50 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    title="Jepret foto langsung dengan kamera (bisa berulang kali)"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>Jepret Kamera HP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    disabled={isProcessingManagePhoto}
                    className="px-3 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    title="Buka viewfinder kamera live dengan GPS HUD"
                  >
                    <Camera className="w-4 h-4 text-slate-950" />
                    <span>Live GPS Pro</span>
                  </button>
                </div>

                {isProcessingManagePhoto && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs text-amber-300 animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                    <span>Memproses foto &amp; menempelkan watermark GPS "app by Tisna"...</span>
                  </div>
                )}

                {managePhotoError && (
                  <div className="p-2 bg-rose-950/80 border border-rose-600/70 rounded-xl text-xs text-rose-200 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{managePhotoError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManagePhotoError(null)}
                      className="text-rose-400 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Photo Gallery Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Daftar Foto Dokumentasi ({managePhotosList.length} Foto)
                  </span>
                  {managePhotosList.length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      Klik foto untuk memperbesar, atau ikon tong sampah untuk menghapus
                    </span>
                  )}
                </div>

                {managePhotosList.length === 0 ? (
                  <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                    Belum ada foto dokumentasi yang dilampirkan pada laporan ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {managePhotosList.map((url, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-[4/3] shadow-sm hover:border-amber-400 transition-all"
                      >
                        <img
                          src={url}
                          alt={`Foto Dokumentasi ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <span className="absolute top-1.5 left-1.5 bg-black/80 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                          #{idx + 1}
                        </span>

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewGallery({
                                photos: managePhotosList,
                                activeIndex: idx,
                                title: managePhotosReport.rabItemDescription || 'Dokumentasi',
                                subtitle: `Foto #${idx + 1} dari ${managePhotosList.length}`,
                              })
                            }
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer"
                            title="Lihat Detail Foto"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveManagePhoto(idx)}
                            className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer"
                            title="Hapus Foto Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-400">
                Total: <strong className="text-amber-400">{managePhotosList.length} Foto</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManagePhotosReport(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveManagePhotos}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Foto ({managePhotosList.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GPS Timestamp Camera Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onPhotoCaptured={(dataUrl) => {
          if (managePhotosReport) {
            setManagePhotosList((prev) => [...prev, dataUrl]);
          } else {
            setPhotoUrlsInput((prev) => [...prev, dataUrl]);
          }
        }}
        projectName={project.name}
        itemDescription={
          managePhotosReport
            ? `${managePhotosReport.rabItemCode ? `[${managePhotosReport.rabItemCode}] ` : ''}${managePhotosReport.rabItemDescription || 'Pekerjaan Lapangan'}`
            : selectedItem
            ? `[${selectedItem.code}] ${selectedItem.description}`
            : 'Pekerjaan Lapangan'
        }
        locationName={project.location || 'Site Lapangan'}
        reporterName={managePhotosReport?.reporterName || reporterInput || 'Site Inspector'}
      />
    </div>
  );
};
