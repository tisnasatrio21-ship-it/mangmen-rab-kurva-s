import React, { useState } from 'react';
import { Project } from '../types/project';
import { formatIDR } from '../utils/calculator';
import { generateProjectPdfReport } from '../utils/pdfExporter';
import { useFirebase } from '../firebase/FirebaseContext';
import {
  HardHat,
  Building2,
  Calendar,
  MapPin,
  Plus,
  RefreshCw,
  FolderKanban,
  Download,
  Loader2,
  Cloud,
  CloudCheck,
  CloudOff,
  LogIn,
  LogOut,
  ChevronDown,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  currentProject: Project;
  allProjects: Project[];
  onSelectProject: (id: string) => void;
  onOpenNewProjectModal: () => void;
  onResetSampleData: () => void;
  onManualCloudSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProject,
  allProjects,
  onSelectProject,
  onOpenNewProjectModal,
  onResetSampleData,
  onManualCloudSync,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { user, isLoadingAuth, syncStatus, signInWithGoogle, logout } = useFirebase();

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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 shrink-0">
              <HardHat className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">RAB & KURVA S</span>
                <span className="text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Proyek
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Sistem Manajemen Biaya &amp; Progres Konstruksi
              </p>
            </div>
          </div>

          {/* Center/Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Desktop Project Switcher Selector */}
            <div className="hidden xl:flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium">Proyek Aktif:</span>
                <div className="relative flex items-center">
                  <select
                    id="desktop-project-select"
                    value={currentProject.id}
                    onChange={(e) => onSelectProject(e.target.value)}
                    className="bg-transparent font-semibold text-white focus:outline-none cursor-pointer pr-5 appearance-none"
                  >
                    {allProjects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-0 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Firebase Cloud Sync Status Badge */}
            <div className="hidden sm:flex items-center">
              {user ? (
                <button
                  onClick={onManualCloudSync}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  title="Klik untuk sinkronisasi manual ke Firebase Firestore"
                >
                  {syncStatus === 'syncing' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Firebase Connected</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 text-[11px] font-medium rounded-lg">
                  <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mode Lokal</span>
                </span>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Google Login / User Profile - Always clearly visible */}
              {isLoadingAuth ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 rounded-xl text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span className="hidden sm:inline">Memuat...</span>
                </div>
              ) : user ? (
                <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 sm:border-l border-slate-700/80">
                  <button
                    onClick={onManualCloudSync}
                    className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs"
                    title="Klik untuk sinkronisasi paksa ke Firebase Cloud"
                  >
                    {syncStatus === 'syncing' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span className="hidden md:inline">Tersinkron</span>
                  </button>

                  <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-xl px-2 py-1">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full border border-amber-400 object-cover"
                        title={`Login sebagai: ${user.displayName || user.email}`}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                        {user.displayName ? user.displayName.charAt(0) : 'U'}
                      </div>
                    )}
                    <span className="text-[11px] font-semibold text-slate-200 max-w-[80px] sm:max-w-[120px] truncate hidden sm:inline">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <button
                      onClick={logout}
                      className="p-1 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded-md transition-colors cursor-pointer ml-0.5"
                      title="Keluar (Logout)"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-md hover:shadow-blue-500/20 active:scale-95"
                  title="Masuk dengan Google untuk mengaktifkan Cloud Sync Firebase antar perangkat"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden xs:inline">Login Cloud</span>
                  <span className="xs:hidden">Login</span>
                </button>
              )}

              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                title="Export Laporan Dashboard Ke PDF"
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="hidden md:inline">Export PDF</span>
              </button>

              <button
                onClick={onOpenNewProjectModal}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm cursor-pointer"
                title="Buat Proyek Baru"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Proyek Baru</span>
              </button>

              <button
                onClick={onResetSampleData}
                className="hidden lg:flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
                title="Reset ke Data Contoh Proyek"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden xl:inline">Reset Demo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-header Project Switcher & Summary banner (Fully interactive on Mobile & Desktop) */}
      <div className="bg-slate-950/90 border-t border-slate-800/90 py-2.5 px-3 sm:px-6 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
          
          {/* Active Project Dropdown Switcher - Prominently interactive on HP/Mobile */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex items-center bg-slate-900 hover:bg-slate-850 border-2 border-amber-500/60 hover:border-amber-400 rounded-xl px-2.5 py-1.5 text-xs text-white shadow-md shadow-amber-500/10 transition-all w-full sm:w-auto min-w-[220px]">
              <FolderKanban className="w-4 h-4 text-amber-400 shrink-0 mr-1.5" />
              <div className="flex flex-col flex-1 min-w-0 pr-6">
                <span className="text-[9px] font-extrabold text-amber-400 uppercase tracking-wider">
                  Proyek Aktif (Klik untuk Ganti):
                </span>
                <select
                  id="project-switcher-mobile-header"
                  value={currentProject.id}
                  onChange={(e) => onSelectProject(e.target.value)}
                  className="bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer appearance-none truncate w-full"
                >
                  {allProjects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white font-medium py-1">
                      {p.name} {p.code ? `(${p.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <ChevronDown className="w-4 h-4 text-amber-400 absolute right-2.5 pointer-events-none shrink-0" />
            </div>

            <div className="hidden md:flex items-center gap-3 text-slate-400 text-xs">
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[140px]">{currentProject.client}</span>
              </span>
              {currentProject.location && (
                <>
                  <span className="text-slate-600 hidden lg:inline">•</span>
                  <span className="flex items-center gap-1 hidden lg:flex">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[160px]">{currentProject.location}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Project Summary Meta KPIs */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Durasi: <strong className="text-white">{currentProject.totalPeriods} Minggu</strong></span>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
              <span className="text-slate-400 text-[11px]">Nilai Kontrak: </span>
              <strong className="text-amber-400 font-bold">{formatIDR(currentProject.totalContractValue)}</strong>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

