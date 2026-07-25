import React, { useState } from 'react';
import { Project } from '../types/project';
import { formatIDR } from '../utils/calculator';
import { generateProjectPdfReport } from '../utils/pdfExporter';
import { HardHat, Building2, Calendar, MapPin, Plus, RefreshCw, FolderKanban, Download, Loader2 } from 'lucide-react';

interface NavbarProps {
  currentProject: Project;
  allProjects: Project[];
  onSelectProject: (id: string) => void;
  onOpenNewProjectModal: () => void;
  onResetSampleData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProject,
  allProjects,
  onSelectProject,
  onOpenNewProjectModal,
  onResetSampleData,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await generateProjectPdfReport(currentProject, {
        chartElementId: 's-curve-chart-container',
      });
    } catch (err) {
      console.error(err);
      alert('Gagal mengunduh PDF.');
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">RAB & KURVA S</span>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Proyek
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Sistem Manajemen Biaya & Progres Konstruksi
              </p>
            </div>
          </div>

          {/* Project Switcher Selector */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Building2 className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">Proyek Aktif:</span>
                <select
                  value={currentProject.id}
                  onChange={(e) => onSelectProject(e.target.value)}
                  className="bg-transparent font-semibold text-white focus:outline-none cursor-pointer pr-4"
                >
                  {allProjects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                title="Export Laporan Dashboard Ke PDF"
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="hidden sm:inline">Export PDF</span>
              </button>

              <button
                onClick={onOpenNewProjectModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm cursor-pointer"
                title="Buat Proyek Baru"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Proyek Baru</span>
              </button>

              <button
                onClick={onResetSampleData}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
                title="Reset ke Data Contoh Proyek"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden md:inline">Reset Demo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-header Project Meta summary banner */}
      <div className="bg-slate-950/80 border-t border-slate-800/80 py-2 px-4 sm:px-6 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-white flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
              {currentProject.name}
            </span>
            <span className="text-slate-500">•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {currentProject.client}
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="flex items-center gap-1 text-slate-400 hidden sm:flex">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {currentProject.location}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Durasi: <strong className="text-white">{currentProject.totalPeriods} Minggu</strong></span>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
              <span className="text-slate-400">Nilai Kontrak: </span>
              <strong className="text-amber-400 font-semibold">{formatIDR(currentProject.totalContractValue)}</strong>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
