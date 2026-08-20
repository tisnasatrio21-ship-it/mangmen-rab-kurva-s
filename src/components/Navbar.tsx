import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types/project';
import { formatIDR } from '../utils/calculator';
import { generateProjectPdfReport } from '../utils/pdfExporter';
import { useFirebase } from '../firebase/FirebaseContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  HardHat,
  Building2,
  Calendar,
  MapPin,
  Plus,
  FolderKanban,
  Download,
  Loader2,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  ChevronDown,
  HardDrive,
  ShieldCheck,
  Languages,
  MoreVertical,
  X,
  Smartphone,
} from 'lucide-react';

interface NavbarProps {
  currentProject: Project;
  allProjects: Project[];
  onSelectProject: (id: string) => void;
  onOpenNewProjectModal: () => void;
  onOpenBackupModal?: () => void;
  onOpenDeviceModal?: () => void;
  onResetSampleData: () => void;
  onManualCloudSync?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProject,
  allProjects,
  onSelectProject,
  onOpenNewProjectModal,
  onOpenBackupModal,
  onOpenDeviceModal,
  onResetSampleData,
  onManualCloudSync,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const { user, isLoadingAuth, syncStatus, signInWithGoogle, logout } = useFirebase();
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'id' ? 'en' : 'id');
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await generateProjectPdfReport(currentProject, {
        chartElementId: 's-curve-chart-container',
      });
    } catch (err) {
      console.error(err);
      alert(language === 'id' ? 'Gagal mengunduh PDF.' : 'Failed to export PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Close mobile menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-lg w-full">
      {/* Primary Top Bar - Strictly 100% Fit with ZERO horizontal scroll on any screen */}
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-3">
          
          {/* Left Zone: Brand Logo & Title */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 shrink-0">
              <HardHat className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                {/* On small mobile: RAB & Kurva S, on sm+: Manajemen RAB & Kurva S */}
                <span className="font-extrabold text-xs xs:text-sm sm:text-base tracking-tight text-white truncate">
                  <span className="xs:hidden">RAB &amp; Kurva S</span>
                  <span className="hidden xs:inline">{t.appTitle}</span>
                </span>
                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.2 rounded uppercase tracking-wider hidden sm:inline shrink-0">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden lg:block truncate">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Center Zone: Active Project Switcher */}
          <div className="flex-1 max-w-[130px] xs:max-w-[170px] sm:max-w-xs md:max-w-sm mx-1 sm:mx-2 min-w-0">
            <div className="relative flex items-center bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/50 rounded-lg sm:rounded-xl px-2 py-1 sm:py-1.5 transition-colors shadow-xs">
              <FolderKanban className="w-3.5 h-3.5 text-amber-400 shrink-0 mr-1 sm:mr-1.5 hidden xs:block" />
              <div className="flex flex-col flex-1 min-w-0 pr-3 sm:pr-4">
                <span className="text-[8px] sm:text-[9px] font-bold text-amber-400/90 uppercase tracking-wider truncate hidden sm:block">
                  {t.activeProject}
                </span>
                <select
                  value={currentProject.id}
                  onChange={(e) => onSelectProject(e.target.value)}
                  className="bg-transparent font-bold text-white text-[11px] sm:text-xs focus:outline-none cursor-pointer appearance-none truncate w-full"
                  title="Pilih Proyek Aktif"
                >
                  {allProjects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white py-1">
                      {p.name} {p.code ? `(${p.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 absolute right-1.5 sm:right-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Right Zone: Actions & Login Button (ALWAYS FITS & VISIBLE) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            
            {/* Desktop-only Action Pills */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-amber-400/50 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
              >
                <Languages className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-mono text-xs">{language === 'id' ? 'ID' : 'EN'}</span>
              </button>

              {/* Device Security Button */}
              {onOpenDeviceModal && (
                <button
                  onClick={onOpenDeviceModal}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-emerald-500/50 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                  title="Otorisasi & Keamanan Perangkat (WhatsApp Gate)"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="hidden lg:inline">{t.devices}</span>
                </button>
              )}

              {/* Backup / Export Button */}
              {onOpenBackupModal && (
                <button
                  onClick={onOpenBackupModal}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-amber-400/50 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                  title="Backup & Export Data Proyek"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden lg:inline">{t.backupExport}</span>
                </button>
              )}

              {/* Export PDF Button */}
              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
                title={t.exportPdf}
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span>PDF</span>
              </button>
            </div>

            {/* Mobile "More Options" Dropdown Trigger */}
            <div className="relative md:hidden" ref={mobileMenuRef}>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                title="Menu Opsi Lainnya"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Mobile Dropdown Menu Popup */}
              {isMobileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 animate-fadeIn">
                  <div className="px-2 py-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800">
                    Menu &amp; Fitur Tambahan
                  </div>

                  {/* Language */}
                  <button
                    onClick={() => {
                      toggleLanguage();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Languages className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bahasa / Language</span>
                    </span>
                    <span className="font-mono text-[10px] font-bold bg-slate-800 px-1.5 py-0.5 rounded text-amber-400">
                      {language.toUpperCase()}
                    </span>
                  </button>

                  {/* Device Security */}
                  {onOpenDeviceModal && (
                    <button
                      onClick={() => {
                        onOpenDeviceModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-left cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.devices} (WhatsApp Gate)</span>
                    </button>
                  )}

                  {/* Backup / Export */}
                  {onOpenBackupModal && (
                    <button
                      onClick={() => {
                        onOpenBackupModal();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-left cursor-pointer"
                    >
                      <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t.backupExport}</span>
                    </button>
                  )}

                  {/* Export PDF */}
                  <button
                    onClick={() => {
                      handleExportPdf();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isExporting}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-amber-300 hover:bg-slate-800 rounded-lg transition-colors text-left cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Unduh Laporan PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* New Project Button */}
            <button
              onClick={onOpenNewProjectModal}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-bold rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              title={t.newProject}
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden xs:inline">{t.newProject}</span>
            </button>

            {/* Google Auth / Profile - ALWAYS PROMINENT ON THE RIGHT */}
            {isLoadingAuth ? (
              <div className="p-1.5 bg-slate-800 rounded-lg sm:rounded-xl text-slate-400 shrink-0">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg sm:rounded-xl p-1 sm:px-2 sm:py-1 shrink-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-amber-400 object-cover shrink-0"
                    title={`Login: ${user.displayName || user.email}`}
                  />
                ) : (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {user.displayName ? user.displayName.charAt(0) : 'U'}
                  </div>
                )}
                <span className="text-[11px] font-semibold text-slate-200 max-w-[80px] truncate hidden xl:inline">
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={logout}
                  className="p-1 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded transition-colors cursor-pointer"
                  title={t.logout}
                >
                  <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold rounded-lg sm:rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                title="Login dengan Akun Google"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] sm:text-xs">Login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-header Metadata Bar (Clean responsive info strip) */}
      <div className="bg-slate-950/90 border-t border-slate-800/80 py-1 px-2.5 sm:px-4 md:px-6 lg:px-8 text-[10px] sm:text-xs text-slate-400 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="flex items-center gap-1 text-slate-300">
              <Building2 className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="font-semibold text-white truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[280px]">
                {currentProject.name}
              </span>
              {currentProject.code && (
                <span className="text-slate-500 hidden xs:inline">({currentProject.code})</span>
              )}
            </div>

            {currentProject.location && (
              <div className="hidden sm:flex items-center gap-1 text-slate-400">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate max-w-[150px]">{currentProject.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1 text-slate-300">
              <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
              <span>{currentProject.totalPeriods} {language === 'id' ? 'Mg' : 'Wks'}</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-400 hidden xs:inline">{t.contractValue}:</span>
              <strong className="text-amber-400 font-bold">{formatIDR(currentProject.totalContractValue)}</strong>
            </div>

            {user ? (
              <button
                onClick={onManualCloudSync}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                title="Status Sinkron Cloud"
              >
                {syncStatus === 'syncing' ? (
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                ) : (
                  <Cloud className="w-3 h-3 shrink-0" />
                )}
                <span className="hidden xs:inline">{syncStatus === 'syncing' ? t.cloudSyncing : t.cloudSynced}</span>
              </button>
            ) : (
              <span className="flex items-center gap-1 text-slate-500">
                <CloudOff className="w-3 h-3 shrink-0" />
                <span className="hidden xs:inline">Offline</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
