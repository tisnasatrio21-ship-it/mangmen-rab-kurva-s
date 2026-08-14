import React, { useState, useEffect, useCallback } from 'react';
import { Project, RabItem, PlannedPeriodDistribution, DailyReportItem } from './types/project';
import { sampleProject } from './data/sampleProject';
import { Navbar } from './components/Navbar';
import { NavigationTabs, ActiveTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RabImport } from './components/RabImport';
import { TimelinePlanner } from './components/TimelinePlanner';
import { DailyReport } from './components/DailyReport';
import { ProjectModal } from './components/ProjectModal';
import { generateAutoPlannedDistributions, recalculateRabItems } from './utils/calculator';
import { useFirebase } from './firebase/FirebaseContext';
import {
  HardHat,
  Cloud,
  CloudCheck,
  CheckCircle2,
  Sparkles,
  LogIn,
  AlertCircle,
  UploadCloud,
  Loader2,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'rab_kurva_s_projects_v1';
const LOCAL_STORAGE_ACTIVE_ID = 'rab_kurva_s_active_id_v1';

export default function App() {
  const {
    user,
    cloudProjects,
    syncProjectToCloud,
    deleteProjectFromCloud,
    isSyncing,
    syncStatus,
    signInWithGoogle,
  } = useFirebase();

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved projects:', e);
    }
    return [sampleProject];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_ID);
      if (savedId) return savedId;
    } catch (e) {
      // ignore
    }
    return sampleProject.id;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [cloudBannerDismissed, setCloudBannerDismissed] = useState(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID, activeProjectId);
    } catch (e) {
      console.error('Failed to save to local storage:', e);
    }
  }, [projects, activeProjectId]);

  // Sync Firestore Cloud Projects into local state when user logs in
  useEffect(() => {
    if (user) {
      if (cloudProjects && cloudProjects.length > 0) {
        setProjects(cloudProjects);
        if (!cloudProjects.some((p) => p.id === activeProjectId)) {
          setActiveProjectId(cloudProjects[0].id);
        }
      } else if (projects.length > 0) {
        // If user is logged in but cloud has no projects yet, sync current local projects to cloud
        projects.forEach((proj) => {
          syncProjectToCloud(proj).catch((err) => {
            console.error('Initial cloud seed error:', err);
          });
        });
      }
    }
  }, [user, cloudProjects]);

  // Find active project or fallback to first
  const currentProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || sampleProject;

  // Helper to persist and sync project
  const updateAndSyncProject = useCallback(
    (updatedProject: Project) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      );
      if (user) {
        syncProjectToCloud(updatedProject).catch((err) => {
          console.error('Cloud auto-sync error:', err);
        });
      }
    },
    [user, syncProjectToCloud]
  );

  // Manual Trigger to save current project to Firebase Firestore
  const handleManualCloudSync = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (currentProject) {
      await syncProjectToCloud(currentProject);
      alert(`Proyek "${currentProject.name}" berhasil disinkronkan ke Firebase Firestore!`);
    }
  };

  // Handle updating RAB Items for current project
  const handleUpdateProjectRab = (updatedItems: RabItem[], totalContractValue: number) => {
    const newDistributions = generateAutoPlannedDistributions(
      updatedItems,
      currentProject.totalPeriods
    );

    const updated: Project = {
      ...currentProject,
      rabItems: updatedItems,
      totalContractValue,
      plannedDistributions: newDistributions,
      lastUpdateDate: new Date().toISOString().split('T')[0],
    };

    updateAndSyncProject(updated);
  };

  // Handle updating Timeline distributions for current project
  const handleUpdateTimeline = (
    updatedDistributions: PlannedPeriodDistribution[],
    totalPeriods: number,
    startDate: string,
    endDate: string
  ) => {
    const updated: Project = {
      ...currentProject,
      plannedDistributions: updatedDistributions,
      totalPeriods,
      startDate,
      endDate,
      lastUpdateDate: new Date().toISOString().split('T')[0],
    };

    updateAndSyncProject(updated);
  };

  // Handle adding Daily Report
  const handleAddDailyReport = (
    newReportData: Omit<DailyReportItem, 'id' | 'createdAt'>
  ) => {
    const newReport: DailyReportItem = {
      ...newReportData,
      id: `rep-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const updated: Project = {
      ...currentProject,
      dailyReports: [newReport, ...currentProject.dailyReports],
      lastUpdateDate: newReportData.date,
    };

    updateAndSyncProject(updated);
  };

  // Handle deleting Daily Report
  const handleDeleteDailyReport = (reportId: string) => {
    const updated: Project = {
      ...currentProject,
      dailyReports: currentProject.dailyReports.filter((r) => r.id !== reportId),
    };

    updateAndSyncProject(updated);
  };

  // Handle create new project
  const handleSaveNewProject = (projectData: Partial<Project>) => {
    const defaultRab = sampleProject.rabItems.slice(0, 5);
    const { items: recalculatedRab, totalValue } = recalculateRabItems(
      defaultRab,
      projectData.totalContractValue || 1500000000
    );

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: projectData.name || 'Proyek Baru',
      code: projectData.code || 'PRJ-2026-001',
      client: projectData.client || 'Client Utama',
      location: projectData.location || 'Lokasi Proyek',
      contractor: projectData.contractor || 'PT. Kontraktor Utama',
      startDate: projectData.startDate || '2026-07-01',
      endDate: '2026-09-23',
      periodType: 'weekly',
      totalPeriods: projectData.totalPeriods || 12,
      totalContractValue: totalValue,
      rabItems: recalculatedRab,
      plannedDistributions: generateAutoPlannedDistributions(
        recalculatedRab,
        projectData.totalPeriods || 12
      ),
      dailyReports: [],
      lastUpdateDate: projectData.startDate || '2026-07-01',
    };

    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setActiveTab('rab-import');

    if (user) {
      syncProjectToCloud(newProj).catch((err) =>
        console.error('Failed to sync new project to Firestore:', err)
      );
    }
  };

  // Reset to default sample project
  const handleResetSampleData = () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin merefresh demo data ke proyek sampel bawaan?'
      )
    ) {
      setProjects([sampleProject]);
      setActiveProjectId(sampleProject.id);
      setActiveTab('dashboard');
      if (user) {
        syncProjectToCloud(sampleProject);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased">
      {/* Top Fixed Header */}
      <Navbar
        currentProject={currentProject}
        allProjects={projects}
        onSelectProject={(id) => setActiveProjectId(id)}
        onOpenNewProjectModal={() => setIsProjectModalOpen(true)}
        onResetSampleData={handleResetSampleData}
        onManualCloudSync={handleManualCloudSync}
      />

      {/* Main Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        dailyReportsCount={currentProject.dailyReports.length}
        rabItemsCount={currentProject.rabItems.length}
      />

      {/* Primary Workspace View Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Firebase Cloud Sync Banner */}
        {!cloudBannerDismissed && (
          <div
            className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs transition-all ${
              user
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/90 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  user
                    ? 'bg-emerald-500/20 text-emerald-700'
                    : 'bg-amber-500/20 text-amber-700'
                }`}
              >
                {user ? (
                  <CloudCheck className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="font-bold">
                  {user
                    ? `Firebase Firestore Aktif • Terhubung sebagai ${user.displayName || user.email}`
                    : 'Penyimpanan Lokal Aktif • Masuk dengan Google untuk Sinkronisasi Cloud Firebase'}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {user
                    ? 'Semua perubahan RAB, kurva S, jadwal minggu, dan laporan harian otomatis tersimpan ke cloud secara realtime.'
                    : 'Simpan proyek ke database cloud Firestore agar dapat diakses kapan saja dari perangkat manapun.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {!user ? (
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login Google Cloud</span>
                </button>
              ) : (
                <button
                  onClick={handleManualCloudSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors disabled:opacity-60"
                >
                  {isSyncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  <span>Sinkronkan Sekarang</span>
                </button>
              )}
              <button
                onClick={() => setCloudBannerDismissed(true)}
                className="text-slate-400 hover:text-slate-600 px-2 py-1 cursor-pointer font-medium"
                title="Tutup banner"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            project={currentProject}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenReportModal={() => setActiveTab('daily-report')}
          />
        )}

        {activeTab === 'rab-import' && (
          <RabImport
            project={currentProject}
            onUpdateProjectRab={handleUpdateProjectRab}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelinePlanner
            project={currentProject}
            onUpdateTimeline={handleUpdateTimeline}
          />
        )}

        {activeTab === 'daily-report' && (
          <DailyReport
            project={currentProject}
            onAddDailyReport={handleAddDailyReport}
            onDeleteDailyReport={handleDeleteDailyReport}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <HardHat className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-slate-200">
              RAB &amp; Kurva S Proyek Konstruksi
            </span>
            <span>• Solusi Pengawasan Progres Biaya &amp; Waktu</span>
          </div>
          <p className="text-slate-500 flex items-center gap-1.5 justify-center sm:justify-end">
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            <span>Integrated with Firebase Firestore &amp; Auth</span>
          </p>
        </div>
      </footer>

      {/* New Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSaveProject={handleSaveNewProject}
      />
    </div>
  );
}

