import React, { useState, useEffect } from 'react';
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
import { HardHat, Layers, FileSpreadsheet, CalendarRange, ClipboardList, RefreshCw } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'rab_kurva_s_projects_v1';
const LOCAL_STORAGE_ACTIVE_ID = 'rab_kurva_s_active_id_v1';

export default function App() {
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

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID, activeProjectId);
    } catch (e) {
      console.error('Failed to save to local storage:', e);
    }
  }, [projects, activeProjectId]);

  // Find active project or fallback to first
  const currentProject = projects.find((p) => p.id === activeProjectId) || projects[0] || sampleProject;

  // Handle updating RAB Items for current project
  const handleUpdateProjectRab = (updatedItems: RabItem[], totalContractValue: number) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== currentProject.id) return p;

        // Auto regenerate planned distributions for new RAB items if needed
        const newDistributions = generateAutoPlannedDistributions(updatedItems, p.totalPeriods);

        return {
          ...p,
          rabItems: updatedItems,
          totalContractValue,
          plannedDistributions: newDistributions,
          lastUpdateDate: new Date().toISOString().split('T')[0],
        };
      })
    );
  };

  // Handle updating Timeline distributions for current project
  const handleUpdateTimeline = (
    updatedDistributions: PlannedPeriodDistribution[],
    totalPeriods: number,
    startDate: string,
    endDate: string
  ) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== currentProject.id) return p;
        return {
          ...p,
          plannedDistributions: updatedDistributions,
          totalPeriods,
          startDate,
          endDate,
          lastUpdateDate: new Date().toISOString().split('T')[0],
        };
      })
    );
  };

  // Handle adding Daily Report
  const handleAddDailyReport = (newReportData: Omit<DailyReportItem, 'id' | 'createdAt'>) => {
    const newReport: DailyReportItem = {
      ...newReportData,
      id: `rep-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== currentProject.id) return p;
        return {
          ...p,
          dailyReports: [newReport, ...p.dailyReports],
          lastUpdateDate: newReportData.date,
        };
      })
    );
  };

  // Handle deleting Daily Report
  const handleDeleteDailyReport = (reportId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== currentProject.id) return p;
        return {
          ...p,
          dailyReports: p.dailyReports.filter((r) => r.id !== reportId),
        };
      })
    );
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
      plannedDistributions: generateAutoPlannedDistributions(recalculatedRab, projectData.totalPeriods || 12),
      dailyReports: [],
      lastUpdateDate: projectData.startDate || '2026-07-01',
    };

    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setActiveTab('rab-import');
  };

  // Reset to default sample project
  const handleResetSampleData = () => {
    if (window.confirm('Apakah Anda yakin ingin merefresh demo data ke proyek sampel bawaan?')) {
      setProjects([sampleProject]);
      setActiveProjectId(sampleProject.id);
      setActiveTab('dashboard');
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
      />

      {/* Main Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        dailyReportsCount={currentProject.dailyReports.length}
        rabItemsCount={currentProject.rabItems.length}
      />

      {/* Primary Workspace View Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            <span className="font-bold text-slate-200">RAB & Kurva S Proyek Konstruksi</span>
            <span>• Solusi Pengawasan Progres Biaya & Waktu</span>
          </div>
          <p className="text-slate-500">
            Sistem Kurva S Rencana vs Realisasi Aktual • Powered by React & Recharts
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
