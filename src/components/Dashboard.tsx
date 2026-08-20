import React, { useRef, useState } from 'react';
import { Project } from '../types/project';
import { calculateSCurvePoints, getProjectKPI, formatPercent, formatIDR } from '../utils/calculator';
import { SCurveChart } from './SCurveChart';
import { generateProjectPdfReport } from '../utils/pdfExporter';
import { useLanguage } from '../i18n/LanguageContext';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  FileText,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  PlusCircle,
  Activity,
  Award,
  Layers,
  Image as ImageIcon,
  MoveHorizontal,
  ChevronLeft,
  Table,
  CheckCircle2,
  Download,
  Loader2,
  FileCheck2,
  Printer,
  Sparkles,
  HardDrive,
  LayoutGrid,
} from 'lucide-react';

interface DashboardProps {
  project: Project;
  onNavigateTab: (tab: 'rab-import' | 'timeline' | 'daily-report') => void;
  onOpenReportModal: () => void;
  onOpenBackupModal?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  project,
  onNavigateTab,
  onOpenReportModal,
  onOpenBackupModal,
}) => {
  const { t, language } = useLanguage();
  const sPoints = calculateSCurvePoints(project);
  const kpi = getProjectKPI(project);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [dashViewMode, setDashViewMode] = useState<'table' | 'cards'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 'cards' : 'table'
  );

  const dashTableRef = useRef<HTMLDivElement>(null);

  const scrollDashTable = (direction: 'left' | 'right') => {
    if (dashTableRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      dashTableRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      setExportSuccessMsg(null);
      await generateProjectPdfReport(project, {
        chartElementId: 's-curve-chart-container',
      });
      setExportSuccessMsg(language === 'id' ? 'Laporan PDF berhasil diunduh!' : 'PDF Report downloaded successfully!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert(language === 'id' ? 'Gagal mengunduh PDF. Silakan coba kembali.' : 'Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Group RAB items and calculate progress per category
  const categoryProgressMap: Record<string, { totalWeight: number; actualWeight: number; itemsCount: number }> = {};
  
  // Calculate item actual volume
  const itemActualVolMap = new Map<string, number>();
  project.dailyReports.forEach(r => {
    const cur = itemActualVolMap.get(r.rabItemId) || 0;
    itemActualVolMap.set(r.rabItemId, cur + r.volumeProgress);
  });

  project.rabItems.forEach(item => {
    if (!categoryProgressMap[item.category]) {
      categoryProgressMap[item.category] = { totalWeight: 0, actualWeight: 0, itemsCount: 0 };
    }
    const cat = categoryProgressMap[item.category];
    cat.totalWeight += item.weightPercentage;
    cat.itemsCount += 1;

    const doneVol = itemActualVolMap.get(item.id) || 0;
    const itemActualRatio = Math.min(1, doneVol / (item.volume || 1));
    cat.actualWeight += item.weightPercentage * itemActualRatio;
  });

  return (
    <div className="space-y-6">
      {/* Executive PDF Export Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Executive Stakeholder Report
              </span>
              {exportSuccessMsg && (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <FileCheck2 className="w-3 h-3" /> {exportSuccessMsg}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Laporan Ringkasan Eksekutif &amp; Progres Proyek
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cetak dan unduh laporan resmi format PDF lengkap dengan ringkasan KPI, kurva S, breakdown kategori RAB, serta matriks status fisik lapangan untuk diserahkan kepada pihak Owner, Direksi, atau Pengawas.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {onOpenBackupModal && (
              <button
                onClick={onOpenBackupModal}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl border border-slate-600 hover:border-amber-400/60 transition-all shadow-md cursor-pointer"
                title="Backup Data Proyek ke File JSON / CSV"
              >
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>Backup JSON / CSV</span>
              </button>
            )}

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer hover:scale-[1.02]"
              title="Unduh Laporan Format PDF"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Mengolah PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Laporan PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Planned Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Progres Rencana
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {formatPercent(kpi.currentPlanned)}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              (Minggu ke-{kpi.currentPeriodNumber})
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            Target kumulatif bobot periode ini
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpi.currentPlanned)}%` }}
            />
          </div>
        </div>

        {/* Actual Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Progres Aktual
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {formatPercent(kpi.currentActual)}
            </span>
            <span className="text-xs text-slate-500 font-medium">tercapai</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            Total akumulasi laporan harian
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpi.currentActual)}%` }}
            />
          </div>
        </div>

        {/* Deviation (Deviasi) */}
        <div
          className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-all ${
            kpi.deviation >= 0
              ? 'bg-emerald-50/50 border-emerald-200/80'
              : kpi.deviation >= -5
              ? 'bg-amber-50/50 border-amber-200/80'
              : 'bg-rose-50/50 border-rose-200/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                kpi.deviation >= 0
                  ? 'text-emerald-700'
                  : kpi.deviation >= -5
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            >
              Deviasi Progres
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                kpi.deviation >= 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : kpi.deviation >= -5
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {kpi.deviation >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                kpi.deviation >= 0
                  ? 'text-emerald-700'
                  : kpi.deviation >= -5
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            >
              {kpi.deviation >= 0 ? `+${kpi.deviation.toFixed(2)}%` : `${kpi.deviation.toFixed(2)}%`}
            </span>
          </div>
          <p
            className={`text-[11px] font-medium mt-2 flex items-center gap-1 ${
              kpi.deviation >= 0
                ? 'text-emerald-700'
                : kpi.deviation >= -5
                ? 'text-amber-700'
                : 'text-rose-700'
            }`}
          >
            {kpi.statusText}
          </p>
          <div className="w-full bg-black/5 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                kpi.deviation >= 0 ? 'bg-emerald-600' : kpi.deviation >= -5 ? 'bg-amber-500' : 'bg-rose-600'
              }`}
              style={{ width: `${Math.min(100, Math.abs(kpi.deviation) * 10)}%` }}
            />
          </div>
        </div>

        {/* Contract & Item Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Status Pekerjaan
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {kpi.completedItemsCount} / {kpi.totalItemsCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Selesai</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {kpi.inProgressItemsCount} item sedang berjalan
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-slate-800 h-full rounded-full transition-all duration-500"
              style={{
                width: `${
                  kpi.totalItemsCount > 0
                    ? (kpi.completedItemsCount / kpi.totalItemsCount) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Kurva S Chart & Update Info Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Kurva S Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Grafik Kurva S (Planned vs Actual)
              </h2>
              <p className="text-xs text-slate-500">
                Visualisasi kumulatif bobot rencana (biru) vs progres realisasi aktual (oranye)
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title="Cetak Laporan Kurva S PDF"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>Unduh PDF</span>
              </button>

              <button
                onClick={onOpenReportModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold text-xs rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Input Laporan</span>
              </button>
            </div>
          </div>

          {/* Chart Component */}
          <div id="s-curve-chart-container" className="pt-2 bg-white rounded-xl p-2">
            <SCurveChart data={sPoints} height={380} />
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Clock className="w-4 h-4 text-slate-500" />
              Periode Aktif saat ini: <strong>Minggu {kpi.currentPeriodNumber} dari {project.totalPeriods} Minggu</strong>
            </span>
            <button
              onClick={() => onNavigateTab('timeline')}
              className="text-amber-600 hover:text-amber-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Lihat Detail Timeline Matrix <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 1 Col: Panel Informasi Update */}
        <div className="space-y-6">
          {/* Panel Update Info (Requirement #1) */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm tracking-wide text-amber-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                PANEL UPDATE PROYEK
              </h3>
              <span className="text-[11px] font-semibold bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300 border border-slate-700">
                Live Status
              </span>
            </div>

            {/* Key Metrics List */}
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Tanggal Update Terakhir:
                </span>
                <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                  {kpi.lastUpdateDate ? new Date(kpi.lastUpdateDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Progres Rencana:</span>
                <span className="font-bold text-blue-400">{formatPercent(kpi.currentPlanned)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Progres Aktual:</span>
                <span className="font-bold text-amber-400">{formatPercent(kpi.currentActual)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Deviasi (Rencana vs Aktual):</span>
                <span
                  className={`font-black px-2 py-0.5 rounded text-xs ${
                    kpi.deviation >= 0
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {kpi.deviation >= 0 ? `+${kpi.deviation.toFixed(2)}%` : `${kpi.deviation.toFixed(2)}%`}
                </span>
              </div>
            </div>

            {/* Latest Daily Report Summary Box */}
            <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                Laporan Terbaru
              </span>
              {kpi.latestReport ? (
                <div className="space-y-2 text-xs">
                  <div className="font-semibold text-slate-100 line-clamp-1">
                    {kpi.latestReport.rabItemDescription || 'Pekerjaan Terkait'}
                  </div>
                  <p className="text-slate-300 italic line-clamp-2 text-[11px]">
                    "{kpi.latestReport.notes || 'Laporan progres lapangan diserahkan.'}"
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/60">
                    <span>Oleh: {kpi.latestReport.reporterName || 'Site Inspector'}</span>
                    <span className="text-amber-400 font-bold">
                      +{formatPercent(kpi.latestReport.weightAdded)}
                    </span>
                  </div>
                  {kpi.latestReport.photoUrl && (
                    <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-700 max-h-28">
                      <img
                        src={kpi.latestReport.photoUrl}
                        alt="Foto Dokumentasi"
                        className="w-full h-28 object-cover"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Foto Lapangan
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada laporan harian yang diinput.</p>
              )}
            </div>

            <button
              onClick={() => onNavigateTab('daily-report')}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Kelola Semua Laporan Harian</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Category Progress Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Progres Per Kategori Pekerjaan
            </h3>

            <div className="space-y-3 text-xs pt-1">
              {Object.entries(categoryProgressMap).map(([catName, stats]) => {
                const percentDone = stats.totalWeight > 0 ? (stats.actualWeight / stats.totalWeight) * 100 : 0;
                return (
                  <div key={catName} className="space-y-1">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-medium text-slate-800 line-clamp-1 max-w-[170px]" title={catName}>
                        {catName}
                      </span>
                      <span className="font-bold text-slate-900">
                        {stats.actualWeight.toFixed(2)}% / {stats.totalWeight.toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, percentDone)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Mobile-Optimized Table Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Table className="w-4 h-4 text-amber-500" />
              Tabel Ringkasan Status Pekerjaan RAB &amp; Progress Field Real-time
            </h3>
            <p className="text-xs text-slate-500">
              Akses cepat rincian progres fisik setiap item pekerjaan langsung dari Dashboard.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setDashViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  dashViewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Tabel Lengkap"
              >
                <Table className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabel</span>
              </button>
              <button
                onClick={() => setDashViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  dashViewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Kartu Ringkas (Mobile Friendly)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kartu</span>
              </button>
            </div>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold text-xs rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              title="Unduh Laporan PDF Lengkap"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Export PDF</span>
            </button>

            <button
              onClick={() => onNavigateTab('rab-import')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Master RAB Lengkap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {dashViewMode === 'cards' ? (
          /* Mobile Cards View for Dashboard */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {project.rabItems.map((item, idx) => {
              const actualVol = itemActualVolMap.get(item.id) || 0;
              const ratio = Math.min(1, actualVol / (item.volume || 1));
              const actualWeight = item.weightPercentage * ratio;
              const percentDone = ratio * 100;

              return (
                <div
                  key={item.id}
                  className="p-4 bg-white border border-slate-200 hover:border-amber-400/80 rounded-xl shadow-xs space-y-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                        {item.code || `#${idx + 1}`}
                      </span>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 truncate max-w-[150px]">
                        {item.category}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                        percentDone >= 100
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : percentDone > 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {percentDone >= 100 ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai
                        </>
                      ) : percentDone > 0 ? (
                        <>
                          <Activity className="w-3 h-3 text-amber-600" /> {percentDone.toFixed(1)}%
                        </>
                      ) : (
                        'Belum Mulai'
                      )}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-800 text-xs sm:text-sm leading-snug">
                    {item.description}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Volume Target vs Aktual</span>
                      <div className="font-mono text-slate-800 text-xs">
                        <strong className="text-blue-600">{actualVol.toFixed(2)}</strong> / {item.volume} {item.unit}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Bobot Aktual / Target</span>
                      <div className="font-mono text-xs">
                        <strong className="text-amber-700">{formatPercent(actualWeight)}</strong> / {formatPercent(item.weightPercentage)}
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentDone >= 100 ? 'bg-emerald-500' : percentDone > 0 ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, percentDone))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View for Dashboard */
          <>
            {/* Intuitive Mobile Scroll Banner & Controls */}
            <div className="flex items-center justify-between bg-amber-50/90 border border-amber-200/90 rounded-xl px-3.5 py-2 text-xs text-amber-950 shadow-xs">
              <div className="flex items-center gap-2">
                <MoveHorizontal className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                <span className="font-semibold text-[11px] sm:text-xs">
                  Geser tabel ke samping untuk melihat volume realisasi &amp; status penyelesaian
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => scrollDashTable('left')}
                  className="p-1.5 bg-white hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 shadow-xs transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Scroll Kiri"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kiri</span>
                </button>
                <button
                  onClick={() => scrollDashTable('right')}
                  className="p-1.5 bg-white hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 shadow-xs transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Scroll Kanan"
                >
                  <span className="hidden sm:inline">Kanan</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dashboard Horizontal Table Container */}
            <div
              ref={dashTableRef}
              className="w-full overflow-x-auto custom-table-scrollbar touch-scroll-x border border-slate-200 rounded-xl shadow-xs"
            >
              <table className="w-full text-left text-xs border-collapse min-w-[700px] lg:min-w-[800px]">
                <thead className="bg-slate-900 text-slate-200 uppercase font-bold text-[11px] tracking-wider sticky top-0 z-20">
                  <tr>
                    <th className="py-3 px-2 sm:px-3 w-10 text-center bg-slate-900 border-r border-slate-800">
                      No
                    </th>
                    <th className="py-3 px-2 sm:px-3 w-16 sm:w-20 bg-slate-900 border-r border-slate-800">
                      Kode
                    </th>
                    <th className="py-3 px-3 sm:px-4 min-w-[180px] sm:min-w-[200px] bg-slate-900 border-r border-slate-700">
                      Uraian Pekerjaan
                    </th>
                    <th className="py-3 px-2.5 sm:px-3 text-right whitespace-nowrap">Vol RAB</th>
                    <th className="py-3 px-2.5 sm:px-3 text-right whitespace-nowrap">Vol Terlapor</th>
                    <th className="py-3 px-2 sm:px-3 text-center whitespace-nowrap">Sat</th>
                    <th className="py-3 px-2.5 sm:px-3 text-right whitespace-nowrap">Bobot RAB %</th>
                    <th className="py-3 px-2.5 sm:px-3 text-right whitespace-nowrap">Bobot Aktual %</th>
                    <th className="py-3 px-2.5 sm:px-3 text-center whitespace-nowrap">Status Field</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                  {project.rabItems.map((item, idx) => {
                    const actualVol = itemActualVolMap.get(item.id) || 0;
                    const ratio = Math.min(1, actualVol / (item.volume || 1));
                    const actualWeight = item.weightPercentage * ratio;
                    const percentDone = ratio * 100;

                    return (
                      <tr key={item.id} className="hover:bg-amber-50/40 transition-colors group">
                        <td className="py-2.5 px-2 sm:px-3 text-center text-slate-400 font-mono bg-white group-hover:bg-slate-50 border-r border-slate-200/60">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 font-semibold text-slate-900 font-mono bg-white group-hover:bg-slate-50 border-r border-slate-200/60 text-[11px] sm:text-xs">
                          {item.code}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-semibold text-slate-800 bg-white group-hover:bg-slate-50 border-r border-slate-200">
                          <div className="line-clamp-2">{item.description}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{item.category}</div>
                        </td>
                        <td className="py-2.5 px-2.5 sm:px-3 text-right font-mono font-medium whitespace-nowrap">{item.volume}</td>
                        <td className="py-2.5 px-2.5 sm:px-3 text-right font-mono font-bold text-blue-600 whitespace-nowrap">
                          {actualVol.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2 sm:px-3 text-center font-mono text-slate-500 whitespace-nowrap">{item.unit}</td>
                        <td className="py-2.5 px-2.5 sm:px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatPercent(item.weightPercentage)}
                        </td>
                        <td className="py-2.5 px-2.5 sm:px-3 text-right font-mono font-extrabold text-amber-600 bg-amber-50/50 whitespace-nowrap">
                          {formatPercent(actualWeight)}
                        </td>
                        <td className="py-2.5 px-2.5 sm:px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                              percentDone >= 100
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : percentDone > 0
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {percentDone >= 100 ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai
                              </>
                            ) : percentDone > 0 ? (
                              <>
                                <Activity className="w-3 h-3 text-amber-600" /> {percentDone.toFixed(1)}%
                              </>
                            ) : (
                              'Belum Mulai'
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
