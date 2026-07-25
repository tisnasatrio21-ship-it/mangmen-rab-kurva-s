import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { SPoint } from '../types/project';
import { formatPercent } from '../utils/calculator';
import { TrendingUp, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

interface SCurveChartProps {
  data: SPoint[];
  height?: number;
  showIncremental?: boolean;
}

export const SCurveChart: React.FC<SCurveChartProps> = ({
  data,
  height = 420,
  showIncremental = false,
}) => {
  const [viewType, setViewType] = useState<'cumulative' | 'incremental'>(showIncremental ? 'incremental' : 'cumulative');

  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p: SPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs backdrop-blur-md max-w-xs">
          <div className="flex items-center justify-between gap-3 border-b border-slate-700 pb-2 mb-2">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              {p.label}
            </span>
            <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
              {p.dateRangeStr}
            </span>
          </div>

          <div className="space-y-1.5">
            {/* Planned */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                Kumulatif Rencana:
              </span>
              <span className="font-semibold text-blue-300">
                {formatPercent(p.plannedCumulative)}
              </span>
            </div>

            {/* Actual */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Kumulatif Aktual:
              </span>
              <span className="font-semibold text-amber-300">
                {p.actualCumulative !== null && p.actualCumulative !== undefined
                  ? formatPercent(p.actualCumulative)
                  : 'Belum Ada Data'}
              </span>
            </div>

            {/* Incremental planned vs actual */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Bobot Rencana/Wk:</span>
                <span className="font-medium text-slate-200">+{formatPercent(p.plannedIncremental)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Bobot Aktual/Wk:</span>
                <span className="font-medium text-slate-200">
                  {p.isCompletedPeriod ? `+${formatPercent(p.actualIncremental)}` : '-'}
                </span>
              </div>
            </div>

            {/* Deviation */}
            {p.isCompletedPeriod && (
              <div
                className={`mt-2 pt-2 border-t border-slate-700/80 flex items-center justify-between font-medium ${
                  p.deviation >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span className="flex items-center gap-1">
                  {p.deviation >= 0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  Deviasi:
                </span>
                <span>
                  {p.deviation >= 0 ? `+${p.deviation.toFixed(2)}%` : `${p.deviation.toFixed(2)}%`}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {/* Chart controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewType('cumulative')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                viewType === 'cumulative'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Kurva S Kumulatif (0-100%)
            </button>
            <button
              onClick={() => setViewType('incremental')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                viewType === 'incremental'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Bobot Per Minggu
            </button>
          </div>
        </div>

        {/* Legend pills */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-sm" />
            <span className="font-semibold text-slate-700">Rencana (Planned)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm" />
            <span className="font-semibold text-slate-700">Aktual (Actual)</span>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 15, right: 25, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              dy={10}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              unit="%"
              domain={[0, viewType === 'cumulative' ? 100 : 'auto']}
              dx={-5}
            />

            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Target 100%', fill: '#64748b', fontSize: 10, position: 'insideTopRight' }} />

            {viewType === 'cumulative' ? (
              <>
                {/* Planned Area Fill */}
                <Area
                  type="monotone"
                  dataKey="plannedCumulative"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPlanned)"
                  name="Rencana (Planned)"
                  dot={{ r: 3, fill: '#2563eb', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                />

                {/* Actual Area Fill & Line */}
                <Area
                  type="monotone"
                  dataKey="actualCumulative"
                  stroke="#f59e0b"
                  strokeWidth={3.5}
                  fillOpacity={1}
                  fill="url(#colorActual)"
                  name="Aktual (Actual)"
                  connectNulls={false}
                  dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#ffffff' }}
                />
              </>
            ) : (
              <>
                {/* Incremental Line Chart */}
                <Line
                  type="monotone"
                  dataKey="plannedIncremental"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Rencana Per Minggu"
                  dot={{ r: 3, fill: '#2563eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="actualIncremental"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  name="Aktual Per Minggu"
                  dot={{ r: 4, fill: '#f59e0b' }}
                  connectNulls={false}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
