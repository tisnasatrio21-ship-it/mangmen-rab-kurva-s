import React, { useState, useRef } from 'react';
import { Project, PlannedPeriodDistribution, RabItem } from '../types/project';
import { generateAutoPlannedDistributions, calculateSCurvePoints, formatPercent, getPeriodDateRange } from '../utils/calculator';
import { useLanguage } from '../i18n/LanguageContext';
import {
  CalendarRange,
  Wand2,
  Save,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  Clock,
  Sparkles,
  MoveHorizontal,
  ChevronLeft,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';

interface TimelinePlannerProps {
  project: Project;
  onUpdateTimeline: (
    updatedDistributions: PlannedPeriodDistribution[],
    totalPeriods: number,
    startDate: string,
    endDate: string
  ) => void;
}

export const TimelinePlanner: React.FC<TimelinePlannerProps> = ({ project, onUpdateTimeline }) => {
  const { t, language } = useLanguage();
  const [startDate, setStartDate] = useState(project.startDate || '2026-06-01');
  const [totalPeriods, setTotalPeriods] = useState(project.totalPeriods || 12);
  const [distributions, setDistributions] = useState<PlannedPeriodDistribution[]>(
    project.plannedDistributions || []
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 'cards' : 'table'
  );

  const matrixContainerRef = useRef<HTMLDivElement>(null);

  const scrollMatrix = (direction: 'left' | 'right') => {
    if (matrixContainerRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      matrixContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Derive periods array [1, 2, ..., totalPeriods]
  const periods = Array.from({ length: totalPeriods }, (_, i) => i + 1);

  // Helper map to quickly get distribution by rabItemId
  const distMap = new Map<string, PlannedPeriodDistribution>();
  distributions.forEach((d) => distMap.set(d.rabItemId, d));

  // Auto Generate Distributions
  const handleAutoGenerate = () => {
    const autoDist = generateAutoPlannedDistributions(project.rabItems, totalPeriods);
    setDistributions(autoDist);
    setSaveMessage('Distribusi Kurva S otomatis berhasil digenerate berdasarkan tahapan pekerjaan!');
    setTimeout(() => setSaveMessage(null), 4000);
  };

  // Change Start/End Period for an item
  const handlePeriodRangeChange = (rabItemId: string, startP: number, endP: number) => {
    const start = Math.max(1, Math.min(startP, totalPeriods));
    const end = Math.max(start, Math.min(endP, totalPeriods));
    const span = end - start + 1;

    // Get item weight
    const item = project.rabItems.find((i) => i.id === rabItemId);
    const weight = item ? item.weightPercentage : 0;

    // Even bell curve distribution
    const rawFactors: number[] = [];
    for (let p = 0; p < span; p++) {
      rawFactors.push(Math.sin((Math.PI * (p + 0.5)) / span));
    }
    const factorSum = rawFactors.reduce((a, b) => a + b, 0);

    const periodWeights: Record<number, number> = {};
    for (let p = 0; p < span; p++) {
      const periodNum = start + p;
      periodWeights[periodNum] = Number(((rawFactors[p] / factorSum) * weight).toFixed(4));
    }

    const updated = distributions.map((d) =>
      d.rabItemId === rabItemId
        ? { ...d, startPeriod: start, endPeriod: end, periodWeights }
        : d
    );

    // If item was not in distributions yet
    if (!distMap.has(rabItemId)) {
      updated.push({
        rabItemId,
        startPeriod: start,
        endPeriod: end,
        periodWeights,
      });
    }

    setDistributions(updated);
  };

  // Save changes
  const handleSave = () => {
    // Calculate endDate from startDate and totalPeriods
    const d = new Date(startDate);
    d.setDate(d.getDate() + totalPeriods * 7);
    const endDate = d.toISOString().split('T')[0];

    onUpdateTimeline(distributions, totalPeriods, startDate, endDate);
    setSaveMessage('Jadwal rencana & matriks bobot berhasil disimpan ke Kurva S!');
    setTimeout(() => setSaveMessage(null), 4000);
  };

  // Calculate S-Curve Preview Points
  const previewProject: Project = {
    ...project,
    startDate,
    totalPeriods,
    plannedDistributions: distributions,
  };
  const scurvePoints = calculateSCurvePoints(previewProject);

  // Calculate sum of planned weights per period
  const periodPlannedSums: Record<number, number> = {};
  const periodCumulativeSums: Record<number, number> = {};
  let cum = 0;
  periods.forEach((p) => {
    let sum = 0;
    distributions.forEach((d) => {
      if (d.periodWeights && d.periodWeights[p]) {
        sum += d.periodWeights[p];
      }
    });
    periodPlannedSums[p] = sum;
    cum += sum;
    periodCumulativeSums[p] = cum;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Project Duration & Auto-generator */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-amber-500 shrink-0" />
              Perencanaan Jadwal &amp; Distribusi Bobot Rencana (S-Curve Planner)
            </h2>
            <p className="text-xs text-slate-500">
              Tentukan periode waktu mulai proyek, total durasi minggu, dan jadwal masing-masing item pekerjaan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoGenerate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs rounded-xl border border-amber-300 transition-colors cursor-pointer"
              title="Generate Otomatis Rencana Distribusi Bobot"
            >
              <Wand2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Auto-Generate Jadwal</span>
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>Simpan Perubahan Jadwal</span>
            </button>
          </div>
        </div>

        {/* Global Timing Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              Tanggal Mulai Proyek (Minggu Ke-1)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Total Durasi Proyek (Minggu)
            </label>
            <select
              value={totalPeriods}
              onChange={(e) => setTotalPeriods(parseInt(e.target.value, 10))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {[4, 6, 8, 10, 12, 16, 20, 24, 30, 36, 48, 52].map((num) => (
                <option key={num} value={num}>
                  {num} Minggu (±{Math.round(num / 4)} Bulan)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 pt-5">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Total Target Kumulatif: <strong className="text-slate-900">{formatPercent(cum)}</strong>
            </span>
          </div>
        </div>

        {saveMessage && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}
      </div>

      {/* Gantt & Period Weight Matrix */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500 shrink-0" />
              Matriks Distribusi Bobot Rencana (Gantt Schedule)
            </h3>
            <p className="text-xs text-slate-500">
              Atur minggu awal &amp; akhir untuk menyesuaikan jadwal tiap item pekerjaan.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tampilan Kartu Pas Layar (Ideal untuk HP & Tablet)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu (Pas Layar)</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tampilan Matriks Tabel Lengkap"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel Matriks</span>
            </button>
          </div>
        </div>

        {viewMode === 'cards' ? (
          /* CARD / ZERO-SCROLL VIEW FOR MOBILE & TABLET */
          <div className="space-y-3">
            {project.rabItems.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 italic text-xs">
                Belum ada data item pekerjaan. Silakan buat atau impor Master RAB terlebih dahulu.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {project.rabItems.map((item, idx) => {
                  const dist = distMap.get(item.id);
                  const startP = dist ? dist.startPeriod : 1;
                  const endP = dist ? dist.endPeriod : totalPeriods;
                  const durationWeeks = endP - startP + 1;

                  return (
                    <div
                      key={item.id}
                      className="p-4 bg-white border border-slate-200 hover:border-amber-400/80 rounded-xl shadow-xs space-y-3 transition-colors"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                            {item.code || `#${idx + 1}`}
                          </span>
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 truncate max-w-[150px]">
                            {item.category}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded shrink-0">
                          Bobot: {formatPercent(item.weightPercentage)}
                        </span>
                      </div>

                      {/* Description */}
                      <div className="font-semibold text-slate-800 text-xs sm:text-sm leading-snug">
                        {item.description}
                      </div>

                      {/* Period Selectors & Duration */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-700">Jadwal Pelaksanaan:</span>
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                            Durasi: {durationWeeks} Minggu
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                              Mulai Minggu
                            </label>
                            <select
                              value={startP}
                              onChange={(e) =>
                                handlePeriodRangeChange(item.id, parseInt(e.target.value, 10), endP)
                              }
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold font-mono focus:outline-none focus:border-amber-500"
                            >
                              {periods.map((p) => (
                                <option key={p} value={p}>
                                  Minggu {p}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                              Selesai Minggu
                            </label>
                            <select
                              value={endP}
                              onChange={(e) =>
                                handlePeriodRangeChange(item.id, startP, parseInt(e.target.value, 10))
                              }
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-bold font-mono focus:outline-none focus:border-amber-500"
                            >
                              {periods.map((p) => (
                                <option key={p} value={p}>
                                  Minggu {p}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Visual Gantt Bar fitting 100% of container */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                            <span>M1</span>
                            <span>M{Math.round(totalPeriods / 2)}</span>
                            <span>M{totalPeriods}</span>
                          </div>
                          <div className="w-full h-3 bg-slate-200 rounded-md overflow-hidden flex gap-0.5 p-0.5">
                            {periods.map((p) => {
                              const isActive = p >= startP && p <= endP;
                              return (
                                <div
                                  key={p}
                                  className={`h-full flex-1 rounded-xs transition-colors ${
                                    isActive ? 'bg-amber-500' : 'bg-transparent'
                                  }`}
                                  title={`Minggu ${p}: ${isActive ? 'Aktif' : 'Tidak aktif'}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* TABLE GANTT MATRIX VIEW */
          <>
            {/* Mobile Scroll Indicator & Navigation */}
            <div className="flex items-center justify-between bg-blue-50/90 border border-blue-200/90 rounded-xl px-3.5 py-2 text-xs text-blue-950 shadow-xs">
              <div className="flex items-center gap-2">
                <MoveHorizontal className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
                <span className="font-semibold text-[11px] sm:text-xs">
                  Geser matriks ke samping untuk melihat jadwal &amp; bobot minggu 1 sampai {totalPeriods}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => scrollMatrix('left')}
                  className="p-1.5 bg-white hover:bg-blue-100 text-blue-900 rounded-lg border border-blue-300 shadow-xs transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Scroll Kiri"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kiri</span>
                </button>
                <button
                  onClick={() => scrollMatrix('right')}
                  className="p-1.5 bg-white hover:bg-blue-100 text-blue-900 rounded-lg border border-blue-300 shadow-xs transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Scroll Kanan"
                >
                  <span className="hidden sm:inline">Kanan</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Matrix Table Container */}
            <div
              ref={matrixContainerRef}
              className="w-full overflow-x-auto custom-table-scrollbar touch-scroll-x border border-slate-200 rounded-xl shadow-xs"
            >
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider sticky top-0 z-20">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center bg-slate-900 border-r border-slate-800">
                      No
                    </th>
                    <th className="py-3 px-4 min-w-[220px] bg-slate-900 border-r border-slate-700">
                      Item Pekerjaan
                    </th>
                    <th className="py-3 px-3 text-right w-20 whitespace-nowrap">Bobot %</th>
                    <th className="py-3 px-3 text-center w-32 whitespace-nowrap">Mulai - Selesai</th>
                    {/* Period Headers */}
                    {periods.map((p) => (
                      <th key={p} className="py-2 px-2 text-center min-w-[68px] border-l border-slate-800 whitespace-nowrap">
                        <div>Mg {p}</div>
                        <div className="text-[9px] text-slate-400 font-normal">
                          {getPeriodDateRange(startDate, p).split('-')[0]}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                  {project.rabItems.map((item, idx) => {
                    const dist = distMap.get(item.id);
                    const startP = dist ? dist.startPeriod : 1;
                    const endP = dist ? dist.endPeriod : totalPeriods;

                    return (
                      <tr key={item.id} className="hover:bg-amber-50/40 transition-colors group">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono bg-white group-hover:bg-slate-50 border-r border-slate-200/60">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 bg-white group-hover:bg-slate-50 border-r border-slate-200">
                          <div className="line-clamp-2">{item.description}</div>
                          <div className="text-[10px] text-slate-400">{item.code} • {item.category}</div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatPercent(item.weightPercentage)}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center gap-1 text-[11px]">
                            <select
                              value={startP}
                              onChange={(e) =>
                                handlePeriodRangeChange(item.id, parseInt(e.target.value, 10), endP)
                              }
                              className="bg-slate-100 border border-slate-200 rounded px-1 py-0.5 text-slate-800 font-mono focus:outline-none"
                            >
                              {periods.map((p) => (
                                <option key={p} value={p}>
                                  M{p}
                                </option>
                              ))}
                            </select>
                            <span className="text-slate-400">-</span>
                            <select
                              value={endP}
                              onChange={(e) =>
                                handlePeriodRangeChange(item.id, startP, parseInt(e.target.value, 10))
                              }
                              className="bg-slate-100 border border-slate-200 rounded px-1 py-0.5 text-slate-800 font-mono focus:outline-none"
                            >
                              {periods.map((p) => (
                                <option key={p} value={p}>
                                  M{p}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Period Columns */}
                        {periods.map((p) => {
                          const isActiveWeek = p >= startP && p <= endP;
                          const weightInPeriod = dist && dist.periodWeights ? dist.periodWeights[p] || 0 : 0;

                          return (
                            <td
                              key={p}
                              className={`py-2 px-1 text-center font-mono text-[11px] border-l border-slate-200/80 ${
                                isActiveWeek ? 'bg-amber-500/10' : ''
                              }`}
                            >
                              {isActiveWeek ? (
                                <div className="bg-amber-500 text-slate-950 font-bold py-1 px-1 rounded shadow-xs text-[10px] whitespace-nowrap">
                                  {weightInPeriod > 0 ? `${weightInPeriod.toFixed(2)}%` : '0%'}
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>

                {/* Matrix Summary Footer */}
                <tfoot className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider bg-slate-100 border-r border-slate-300">
                      Target Bobot Per Minggu:
                    </td>
                    <td colSpan={2} className="py-2.5 px-2 text-right font-mono text-slate-500">
                      (Rencana)
                    </td>
                    {periods.map((p) => (
                      <td key={p} className="py-2.5 px-1 text-center font-mono text-blue-700 bg-blue-50 border-l border-slate-300 whitespace-nowrap">
                        +{formatPercent(periodPlannedSums[p] || 0)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-slate-900 text-amber-400">
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider bg-slate-900 text-white border-r border-slate-800">
                      Kumulatif Garis Rencana (Kurva S):
                    </td>
                    <td colSpan={2} className="py-2.5 px-2 text-right font-mono text-slate-400">
                      (Target 100%)
                    </td>
                    {periods.map((p) => (
                      <td key={p} className="py-2.5 px-1 text-center font-mono text-amber-400 font-extrabold border-l border-slate-800 whitespace-nowrap">
                        {formatPercent(periodCumulativeSums[p] || 0)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
