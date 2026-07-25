import React, { useState, useRef } from 'react';
import { Project, PlannedPeriodDistribution, RabItem } from '../types/project';
import { generateAutoPlannedDistributions, calculateSCurvePoints, formatPercent, getPeriodDateRange } from '../utils/calculator';
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
  const [startDate, setStartDate] = useState(project.startDate || '2026-06-01');
  const [totalPeriods, setTotalPeriods] = useState(project.totalPeriods || 12);
  const [distributions, setDistributions] = useState<PlannedPeriodDistribution[]>(
    project.plannedDistributions || []
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
  const handleSaveTimeline = () => {
    // Calculate new end date (startDate + totalPeriods * 7 days)
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + totalPeriods * 7 - 1);
    const endDateStr = end.toISOString().split('T')[0];

    onUpdateTimeline(distributions, totalPeriods, startDate, endDateStr);
    setSaveMessage('Jadwal & Garis Rencana Kurva S berhasil disimpan!');
    setTimeout(() => setSaveMessage(null), 4000);
  };

  // Calculate sum of planned weights per period
  const periodPlannedSums: Record<number, number> = {};
  periods.forEach((p) => {
    periodPlannedSums[p] = 0;
  });

  distributions.forEach((d) => {
    if (d.periodWeights) {
      Object.entries(d.periodWeights).forEach(([pStr, w]) => {
        const p = parseInt(pStr, 10);
        const wNum = typeof w === 'number' ? w : parseFloat(String(w)) || 0;
        if (periodPlannedSums[p] !== undefined) {
          periodPlannedSums[p] = (periodPlannedSums[p] || 0) + wNum;
        }
      });
    }
  });

  // Calculate cumulative planned percentages per period
  let cum = 0;
  const periodCumulativeSums: Record<number, number> = {};
  periods.forEach((p) => {
    cum += periodPlannedSums[p] || 0;
    periodCumulativeSums[p] = Math.min(100, cum);
  });

  return (
    <div className="space-y-6">
      {/* Header & Control Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-blue-600" />
              Generate Timeline & Garis Rencana Kurva S
            </h2>
            <p className="text-xs text-slate-500">
              Tentukan periode pelaksanaan pekerjaan dan secara otomatis hitung distribusi bobot mingguan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoGenerate}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Auto-Generate Kurva S</span>
            </button>

            <button
              onClick={handleSaveTimeline}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Simpan Jadwal Rencana</span>
            </button>
          </div>
        </div>

        {/* Project Date & Duration Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Mulai Proyek</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Durasi Proyek (Minggu)</label>
            <select
              value={totalPeriods}
              onChange={(e) => setTotalPeriods(parseInt(e.target.value, 10))}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {[4, 6, 8, 10, 12, 16, 20, 24, 32, 52].map((num) => (
                <option key={num} value={num}>
                  {num} Minggu ({Math.round((num / 4) * 10) / 10} Bulan)
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
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveMessage}</span>
          </div>
        )}
      </div>

      {/* Gantt & Period Weight Matrix */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            Matriks Distribusi Bobot Rencana Per Minggu (Gantt Schedule)
          </h3>
          <span className="text-xs text-slate-500">
            Geser minggu awal & akhir untuk menyesuaikan jadwal tiap item pekerjaan
          </span>
        </div>

        {/* Intuitive Mobile Scroll Indicator & Scroll Navigation */}
        <div className="flex items-center justify-between bg-blue-50/90 border border-blue-200/90 rounded-xl px-3.5 py-2 text-xs text-blue-950 shadow-xs">
          <div className="flex items-center gap-2">
            <MoveHorizontal className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
            <span className="font-semibold text-[11px] sm:text-xs">
              Geser matriks ke kanan/kiri untuk melihat jadwal &amp; bobot minggu 1 sampai {totalPeriods}
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
          className="overflow-x-auto custom-table-scrollbar touch-scroll-x border border-slate-200 rounded-xl shadow-xs"
        >
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider sticky top-0 z-20">
              <tr>
                <th className="py-3 px-2 w-9 text-center sticky left-0 bg-slate-900 z-30 border-r border-slate-800">
                  No
                </th>
                <th className="py-3 px-3 min-w-[180px] sm:min-w-[220px] sticky left-[36px] bg-slate-900 z-30 border-r border-slate-700 sticky-col-shadow-right">
                  Item Pekerjaan
                </th>
                <th className="py-3 px-2 text-right w-16 whitespace-nowrap">Bobot %</th>
                <th className="py-3 px-2 text-center w-28 whitespace-nowrap">Mulai - Selesai</th>
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
                    <td className="py-2.5 px-2 text-center text-slate-400 font-mono sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-200/60">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 sticky left-[36px] bg-white group-hover:bg-slate-50 z-10 border-r border-slate-300 sticky-col-shadow-right">
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
                <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider sticky left-0 bg-slate-100 z-10 border-r border-slate-300 sticky-col-shadow-right">
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
                <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider sticky left-0 bg-slate-900 z-10 text-white border-r border-slate-800 sticky-col-shadow-right">
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
      </div>
    </div>
  );
};
