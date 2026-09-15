import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Project, RabItem, PlannedPeriodDistribution, DailyReportItem, AuthorizedDevice } from './types/project';
import { sampleProject } from './data/sampleProject';
import { Navbar } from './components/Navbar';
import { NavigationTabs, ActiveTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RabImport } from './components/RabImport';
import { TimelinePlanner } from './components/TimelinePlanner';
import { DailyReport } from './components/DailyReport';
import { ProjectModal } from './components/ProjectModal';
import { BackupExportModal } from './components/BackupExportModal';
import { DeviceLockScreen } from './components/DeviceLockScreen';
import { DeviceManagementModal } from './components/DeviceManagementModal';
import { AiProjectAdvisorModal } from './components/AiProjectAdvisorModal';
import { generateAutoPlannedDistributions, recalculateRabItems } from './utils/calculator';
import { optimizeProjectPhotos } from './utils/photoWatermark';
import { saveProjectsToIDB, loadProjectsFromIDB } from './utils/indexedDbStorage';
import { mergeProjectLists, stampProjectUpdated } from './utils/projectSync';
import { useFirebase } from './firebase/FirebaseContext';
import { getQuotaExceeded } from './firebase/firestoreErrors';
import { useLanguage } from './i18n/LanguageContext';
import {
  getOrCreateDeviceId,
  registerDeviceInFirestore,
  subscribeToDeviceStatus,
  approveDevice,
  isUserMasterAdmin,
  isDeviceUnlockedByPin,
  ADMIN_EMAIL,
} from './utils/deviceAuth';
import {
  HardHat,
  Cloud,
  CloudCheck,
  CheckCircle2,
  Sparkles,
  LogIn,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  UploadCloud,
  Loader2,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'rab_kurva_s_projects_v1';
const LOCAL_STORAGE_ACTIVE_ID = 'rab_kurva_s_active_id_v1';

export default function App() {
  const {
    user,
    isLoadingAuth,
    cloudProjects,
    syncProjectToCloud,
    deleteProjectFromCloud,
    isSyncing,
    syncStatus,
    signInWithGoogle,
    isQuotaExceeded,
    quotaUpgradeUrl,
  } = useFirebase();

  const { t, language } = useLanguage();

  // Device Authentication State
  const [deviceInfo] = useState(() => getOrCreateDeviceId());
  const [currentDevice, setCurrentDevice] = useState<AuthorizedDevice>(() => ({
    id: deviceInfo.deviceId,
    deviceName: deviceInfo.deviceName,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  }));
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [approvalToast, setApprovalToast] = useState<string | null>(null);
  const [approvalUrlParam, setApprovalUrlParam] = useState<string | null>(null);

  // Register device in Firestore and subscribe to real-time status updates
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initDevice = async () => {
      try {
        const registered = await registerDeviceInFirestore(deviceInfo.deviceId, deviceInfo.deviceName);
        setCurrentDevice(registered);

        unsubscribe = subscribeToDeviceStatus(
          deviceInfo.deviceId,
          (updatedDev) => {
            setCurrentDevice(updatedDev);
          },
          (err) => {
            console.warn('Device status realtime listener note:', err);
          }
        );
      } catch (err) {
        console.warn('Device initialization notice:', err);
      }
    };

    initDevice();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [deviceInfo]);

  // Check URL query parameters for 1-click WhatsApp approval link (?approve_device=DEV-XXXXXX)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const approveTarget = urlParams.get('approve_device');
    if (approveTarget) {
      setApprovalUrlParam(approveTarget);

      if (isUserMasterAdmin(user?.email)) {
        approveDevice(approveTarget, user?.email || ADMIN_EMAIL).then(() => {
          setApprovalToast(`Perangkat ${approveTarget} berhasil DIIZINKAN oleh Pak Tisna!`);
          window.history.replaceState({}, document.title, window.location.pathname);
          setApprovalUrlParam(null);
          setTimeout(() => setApprovalToast(null), 6000);
        });
      }
    }
  }, [user]);

  const hasAttemptedAdminApproval = useRef<Set<string>>(new Set());
  const hasSeededCloudRef = useRef(false);

  // If user is Master Admin (tisnasatrio21@gmail.com), auto-approve this device and any pending WhatsApp links
  useEffect(() => {
    if (isUserMasterAdmin(user?.email)) {
      if (currentDevice.status !== 'approved' && !hasAttemptedAdminApproval.current.has(currentDevice.id)) {
        hasAttemptedAdminApproval.current.add(currentDevice.id);
        approveDevice(currentDevice.id, user?.email || ADMIN_EMAIL).catch(console.error);
        setCurrentDevice((prev) => ({
          ...prev,
          status: 'approved',
          approvedBy: user?.email || ADMIN_EMAIL,
        }));
      }

      if (approvalUrlParam && !hasAttemptedAdminApproval.current.has(approvalUrlParam)) {
        hasAttemptedAdminApproval.current.add(approvalUrlParam);
        approveDevice(approvalUrlParam, user?.email || ADMIN_EMAIL).then(() => {
          setApprovalToast(`Perangkat ${approvalUrlParam} berhasil DIIZINKAN oleh Pak Tisna!`);
          window.history.replaceState({}, document.title, window.location.pathname);
          setApprovalUrlParam(null);
          setTimeout(() => setApprovalToast(null), 6000);
        }).catch(console.error);
      }
    }
  }, [user, currentDevice.id, currentDevice.status, approvalUrlParam]);

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
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [cloudBannerDismissed, setCloudBannerDismissed] = useState(false);

  // AI Project Advisor Modal State
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);
  const [aiAdvisorInitialTab, setAiAdvisorInitialTab] = useState<'scurve' | 'report' | 'audit' | 'chat'>('scurve');
  const isIdbHydratedRef = useRef(false);

  const handleOpenAiAdvisor = (tab: 'scurve' | 'report' | 'audit' | 'chat' = 'scurve') => {
    setAiAdvisorInitialTab(tab);
    setIsAiAdvisorOpen(true);
  };

  // Hydrate projects and full photos from IndexedDB (gigabyte storage capacity)
  useEffect(() => {
    let isMounted = true;
    loadProjectsFromIDB()
      .then((idbProjects) => {
        if (!isMounted) return;
        isIdbHydratedRef.current = true;
        if (idbProjects && idbProjects.length > 0) {
          setProjects((current) => {
            const merged = mergeProjectLists(current, idbProjects);
            console.log(`Hydrated ${merged.length} projects from IndexedDB safe storage.`);
            return merged;
          });
        }
      })
      .catch((err) => {
        console.warn('IDB hydration notice:', err);
        isIdbHydratedRef.current = true;
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-optimize existing project photos on boot to shrink any large photos (>90KB)
  // down to compact web-safe sizes (~50-70KB), ensuring localStorage and Firestore limits are never breached.
  useEffect(() => {
    let isMounted = true;
    const runOptimization = async () => {
      let anyChanged = false;
      const updated = await Promise.all(
        projects.map(async (p) => {
          const { project, didCompress } = await optimizeProjectPhotos(p);
          if (didCompress) anyChanged = true;
          return project;
        })
      );
      if (anyChanged && isMounted) {
        setProjects(updated);
        console.log('Project photos auto-optimized for compact storage.');
      }
    };
    runOptimization();
    return () => {
      isMounted = false;
    };
  }, []);

  // Find active project or fallback to first
  const currentProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || sampleProject;

  // Dual storage sync:
  // 1. IndexedDB: Stores unlimited photos (Gigabytes capacity for 5-month+ projects).
  // 2. LocalStorage: Fast synchronous cache (with graceful fallback if >5MB).
  useEffect(() => {
    // Only save to IndexedDB once initial hydration is complete so we never overwrite IndexedDB with unhydrated state
    if (isIdbHydratedRef.current) {
      saveProjectsToIDB(projects).catch((err) => console.warn('IndexedDB save notice:', err));
    }

    // Save to LocalStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID, activeProjectId);
    } catch (e) {
      console.warn('LocalStorage limit reached (>5MB). Saving lightweight index to LocalStorage while IndexedDB preserves all photos:', e);
      try {
        // Keep active project photos, strip older project photos from localStorage only
        const lightweightProjects = projects.map((p) => ({
          ...p,
          dailyReports: (p.dailyReports || []).map((r, idx, arr) => {
            // Keep recent 10 photos in localStorage, older photos remain safely in IndexedDB
            const isRecent = idx >= arr.length - 10;
            return {
              ...r,
              photoUrl: isRecent ? r.photoUrl : '',
              photoUrls: isRecent ? r.photoUrls : [],
            };
          }),
        }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightweightProjects));
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_ID, activeProjectId);
      } catch (err2) {
        console.warn('LocalStorage fallback note:', err2);
      }
    }
  }, [projects, activeProjectId]);

  // Sync Firestore Cloud Projects into local state without clobbering local edits or photos
  useEffect(() => {
    if (user) {
      if (cloudProjects && cloudProjects.length > 0) {
        setProjects((current) => {
          const merged = mergeProjectLists(current, cloudProjects);
          return merged;
        });
        setActiveProjectId((prevId) => {
          const exists = cloudProjects.some((p) => p.id === prevId);
          return exists ? prevId : cloudProjects[0].id;
        });
      } else if (projects.length > 0 && !hasSeededCloudRef.current && !isQuotaExceeded && !getQuotaExceeded()) {
        hasSeededCloudRef.current = true;
        // If user is logged in but cloud has no projects yet, sync current local projects once
        projects.forEach((proj) => {
          syncProjectToCloud(proj).catch((err) => {
            console.warn('Initial cloud seed notice:', err);
          });
        });
      }
    }
  }, [user, cloudProjects, isQuotaExceeded]);

  // Helper to persist and sync project
  const updateAndSyncProject = useCallback(
    (updatedProject: Project) => {
      const stamped = stampProjectUpdated(updatedProject);
      setProjects((prev) =>
        prev.map((p) => (p.id === stamped.id ? stamped : p))
      );

      // Direct asynchronous IndexedDB backup for immediate durability
      loadProjectsFromIDB()
        .then((existing) => {
          const list = existing && existing.length > 0 ? existing : [stamped];
          const updatedList = list.map((p) => (p.id === stamped.id ? stamped : p));
          if (!updatedList.some((p) => p.id === stamped.id)) {
            updatedList.unshift(stamped);
          }
          saveProjectsToIDB(updatedList).catch((err) => console.warn('Direct IDB update note:', err));
        })
        .catch(() => {});

      if (user && !isQuotaExceeded && !getQuotaExceeded()) {
        syncProjectToCloud(stamped).catch((err) => {
          console.warn('Cloud auto-sync notice:', err);
        });
      }
    },
    [user, isQuotaExceeded, syncProjectToCloud]
  );

  // Manual Trigger to save current project to Firebase Firestore
  const handleManualCloudSync = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (isQuotaExceeded) {
      alert(
        '⚠️ Kuota Harian Firestore (Free Tier) Tercapai.\n\n' +
        'Penyimpanan lokal di perangkat Anda tetap berfungsi 100% aman (offline-first). ' +
        'Kuota tulis gratis harian akan di-reset otomatis esok hari oleh Google Firestore, ' +
        'atau Anda dapat meng-upgrade database melalui Firebase Console.'
      );
      return;
    }
    if (currentProject) {
      try {
        await syncProjectToCloud(currentProject);
        alert(`Proyek "${currentProject.name}" berhasil disinkronkan ke Firebase Firestore!`);
      } catch (e) {
        console.warn('Manual sync notice:', e);
      }
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

  // Handle updating an existing Daily Report (e.g. adding more photos)
  const handleUpdateDailyReport = (updatedReport: DailyReportItem) => {
    const updated: Project = {
      ...currentProject,
      dailyReports: currentProject.dailyReports.map((r) =>
        r.id === updatedReport.id ? updatedReport : r
      ),
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

    const newProj: Project = stampProjectUpdated({
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
    });

    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setActiveTab('rab-import');

    // Immediate backup to IndexedDB
    loadProjectsFromIDB()
      .then((existing) => {
        saveProjectsToIDB([newProj, ...(existing || [])]).catch(() => {});
      })
      .catch(() => {});

    if (user && !isQuotaExceeded && !getQuotaExceeded()) {
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
      const stamped = stampProjectUpdated(sampleProject);
      setProjects([stamped]);
      setActiveProjectId(stamped.id);
      setActiveTab('dashboard');
      saveProjectsToIDB([stamped]).catch(() => {});
      if (user && !isQuotaExceeded && !getQuotaExceeded()) {
        syncProjectToCloud(stamped);
      }
    }
  };

  // Handle restoring / importing projects from local JSON backup
  const handleImportProjects = (imported: Project[]) => {
    if (!imported || imported.length === 0) return;

    const stampedList = imported.map((p) => stampProjectUpdated(p));
    setProjects((prev) => mergeProjectLists(prev, stampedList));

    setActiveProjectId(stampedList[0].id);
    setActiveTab('dashboard');

    if (user && !isQuotaExceeded && !getQuotaExceeded()) {
      stampedList.forEach((proj) => {
        syncProjectToCloud(proj).catch((err) => {
          console.error('Failed to sync restored project to cloud:', err);
        });
      });
    }
  };

  // Check if device is authorized:
  // Allowed if:
  // 1. User is Master Admin (tisnasatrio21@gmail.com)
  // 2. Or currentDevice.status is 'approved'
  // 3. Or this device is unlocked via Pak Tisna's PIN (170845)
  const isMasterAdminUser = isUserMasterAdmin(user?.email);
  const isPinUnlocked = isDeviceUnlockedByPin(currentDevice.id);
  const isDeviceAuthorized = isMasterAdminUser || currentDevice.status === 'approved' || isPinUnlocked;

  // If device is NOT authorized yet, show the full WhatsApp Device Lock Screen
  if (!isDeviceAuthorized) {
    return (
      <DeviceLockScreen
        currentDevice={currentDevice}
        onAdminLogin={signInWithGoogle}
        isLoadingAuth={isLoadingAuth}
        onRefreshStatus={async () => {
          const registered = await registerDeviceInFirestore(deviceInfo.deviceId, deviceInfo.deviceName);
          setCurrentDevice(registered);
        }}
        onUnlockWithPin={() => {
          setCurrentDevice((prev) => ({
            ...prev,
            status: 'approved',
            approvedBy: `PIN Pemilik (${ADMIN_EMAIL})`,
          }));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased overflow-x-hidden max-w-full w-full">
      {/* Top Fixed Header */}
      <Navbar
        currentProject={currentProject}
        allProjects={projects}
        onSelectProject={(id) => setActiveProjectId(id)}
        onOpenNewProjectModal={() => setIsProjectModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenDeviceModal={() => setIsDeviceModalOpen(true)}
        onOpenAiAdvisor={() => handleOpenAiAdvisor('scurve')}
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 overflow-x-hidden">
        {/* Toast for WhatsApp 1-Click Approval feedback */}
        {approvalToast && (
          <div className="p-4 rounded-xl bg-emerald-950 text-emerald-200 border border-emerald-500 shadow-xl flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <strong className="font-bold text-white text-sm">Persetujuan Perangkat Berhasil!</strong>
                <p className="text-emerald-300 mt-0.5">{approvalToast}</p>
              </div>
            </div>
            <button
              onClick={() => setApprovalToast(null)}
              className="p-1 text-emerald-400 hover:text-white rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Notice if opening with approval link but not logged in as Admin */}
        {approvalUrlParam && !isMasterAdminUser && (
          <div className="p-4 rounded-xl bg-amber-950/90 text-amber-200 border border-amber-500 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-white">
                  Permintaan Izin Perangkat: <span className="font-mono text-amber-300">{approvalUrlParam}</span>
                </p>
                <p className="text-amber-300/80 text-[11px] mt-0.5">
                  Silakan masuk sebagai Pak Tisna (<code className="text-amber-200 font-bold">{ADMIN_EMAIL}</code>) untuk mengonfirmasi persetujuan perangkat ini.
                </p>
              </div>
            </div>
            <button
              onClick={signInWithGoogle}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              Login Pak Tisna
            </button>
          </div>
        )}

        {/* Quota Exceeded Alert Banner */}
        {isQuotaExceeded && (
          <div className="p-3.5 sm:p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-amber-900">
                    Batas Kuota Harian Firestore (Free Tier Spark) Tercapai
                  </span>
                  <span className="bg-amber-200/80 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Offline-First Aktif
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[11px] sm:text-xs">
                  Aplikasi tetap beroperasi <strong>100% normal</strong>. Semua RAB, Kurva S, dan foto laporan harian Anda tersimpan aman di <em>penyimpanan lokal (browser)</em>. Kuota tulis gratis akan di-reset otomatis besok oleh Google Firestore, atau Anda dapat meng-upgrade database ke Pay-as-you-go (Blaze).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <a
                href={quotaUpgradeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer text-xs"
              >
                <span>Buka Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Firebase Cloud Sync Banner */}
        {!cloudBannerDismissed && !isQuotaExceeded && (
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
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onOpenAiAdvisor={handleOpenAiAdvisor}
          />
        )}

        {activeTab === 'rab-import' && (
          <RabImport
            project={currentProject}
            onUpdateProjectRab={handleUpdateProjectRab}
            onOpenAiAudit={() => handleOpenAiAdvisor('audit')}
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
            onUpdateDailyReport={handleUpdateDailyReport}
          />
        )}
      </main>

      {/* Floating AI Consultant Button (Bottom Right) */}
      <div className="fixed bottom-5 right-5 z-30">
        <button
          onClick={() => handleOpenAiAdvisor('chat')}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl shadow-xl border-2 border-white/60 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer group"
          title="Tanya Konsultan AI Proyek (Gemini 3.7)"
        >
          <div className="w-6 h-6 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs tracking-wide">Konsultan AI</span>
          <span className="w-2 h-2 rounded-full bg-emerald-900 group-hover:animate-ping" />
        </button>
      </div>

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

      {/* Local JSON / CSV Backup & Restore Modal */}
      <BackupExportModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        currentProject={currentProject}
        allProjects={projects}
        onImportProjects={handleImportProjects}
      />

      {/* Device Management Modal */}
      <DeviceManagementModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        currentDeviceId={currentDevice.id}
        adminEmail={user?.email || ADMIN_EMAIL}
      />

      {/* AI Project Advisor Modal */}
      <AiProjectAdvisorModal
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        project={currentProject}
        initialTab={aiAdvisorInitialTab}
        onApplyAiParsedItems={(parsedItems) => {
          const totalVal = parsedItems.reduce((acc, it) => acc + it.totalPrice, 0);
          handleUpdateProjectRab(parsedItems, totalVal);
          setActiveTab('rab-import');
        }}
      />
    </div>
  );
}
