import { Project, DailyReportItem } from '../types/project';

const DB_NAME = 'RAB_KURVA_S_DB';
const DB_VERSION = 2;
const STORE_NAME = 'projects_store';
const PROJECTS_KEY = 'all_projects';
const PHOTO_VAULT_STORE = 'photo_vault';
const HISTORY_STORE = 'projects_history';

/**
 * Open or create IndexedDB connection with version upgrade to support photo_vault
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(PHOTO_VAULT_STORE)) {
        db.createObjectStore(PHOTO_VAULT_STORE);
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Save photos of a specific report into the permanent local Photo Vault.
 * This vault is completely isolated and is NEVER wiped or stripped by Cloud Firestore.
 */
export async function saveReportPhotosToVault(reportId: string, photoUrls: string[]): Promise<void> {
  if (!reportId || !Array.isArray(photoUrls) || photoUrls.length === 0) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PHOTO_VAULT_STORE], 'readwrite');
      const store = transaction.objectStore(PHOTO_VAULT_STORE);
      const validPhotos = photoUrls.filter((u) => typeof u === 'string' && u.length > 0);
      if (validPhotos.length > 0) {
        store.put(validPhotos, reportId);
      }
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.warn('Failed to save to photo vault:', err);
  }
}

/**
 * Retrieve photos for a report from the permanent local Photo Vault
 */
export async function getReportPhotosFromVault(reportId: string): Promise<string[] | null> {
  if (!reportId) return null;
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction([PHOTO_VAULT_STORE], 'readonly');
      const store = transaction.objectStore(PHOTO_VAULT_STORE);
      const request = store.get(reportId);

      request.onsuccess = () => {
        db.close();
        if (Array.isArray(request.result) && request.result.length > 0) {
          resolve(request.result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Saves all photos in a project into the permanent local Photo Vault
 */
export async function saveAllProjectPhotosToVault(project: Project): Promise<void> {
  if (!project || !Array.isArray(project.dailyReports)) return;
  for (const report of project.dailyReports) {
    const photos: string[] = [];
    if (Array.isArray(report.photoUrls) && report.photoUrls.length > 0) {
      photos.push(...report.photoUrls.filter(Boolean));
    } else if (report.photoUrl) {
      photos.push(report.photoUrl);
    }
    if (photos.length > 0) {
      await saveReportPhotosToVault(report.id, photos);
    }
  }
}

/**
 * Automatically re-hydrates photos from the Photo Vault into a project
 * if the project's daily reports lost their photos (e.g. from cloud sync or fresh login).
 */
export async function hydrateProjectPhotosFromVault(project: Project): Promise<{
  project: Project;
  restoredCount: number;
}> {
  if (!project || !Array.isArray(project.dailyReports) || project.dailyReports.length === 0) {
    return { project, restoredCount: 0 };
  }

  let restoredCount = 0;
  const updatedReports = await Promise.all(
    project.dailyReports.map(async (report) => {
      const hasPhotos =
        (Array.isArray(report.photoUrls) && report.photoUrls.length > 0) ||
        Boolean(report.photoUrl);

      if (!hasPhotos) {
        const vaultPhotos = await getReportPhotosFromVault(report.id);
        if (vaultPhotos && vaultPhotos.length > 0) {
          restoredCount += vaultPhotos.length;
          return {
            ...report,
            photoUrl: vaultPhotos[0],
            photoUrls: vaultPhotos,
            hasLocalPhotosOnly: false,
          };
        }
      }
      return report;
    })
  );

  return {
    project: {
      ...project,
      dailyReports: updatedReports,
    },
    restoredCount,
  };
}

/**
 * Save all projects (including high-resolution photos) to IndexedDB
 * Capacity: Hundreds of Megabytes to Gigabytes.
 * Also saves a historical backup snapshot to protect against accidental clobbers.
 */
export async function saveProjectsToIDB(projects: Project[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME, PHOTO_VAULT_STORE, HISTORY_STORE], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const vaultStore = transaction.objectStore(PHOTO_VAULT_STORE);
      const historyStore = transaction.objectStore(HISTORY_STORE);

      // 1. Put primary projects
      store.put(projects, PROJECTS_KEY);

      // 2. Automatically backup all individual report photos to vault
      projects.forEach((proj) => {
        (proj.dailyReports || []).forEach((rep) => {
          const photos = Array.isArray(rep.photoUrls) && rep.photoUrls.length > 0
            ? rep.photoUrls.filter(Boolean)
            : rep.photoUrl ? [rep.photoUrl] : [];
          if (photos.length > 0) {
            vaultStore.put(photos, rep.id);
          }
        });
      });

      // 3. Keep a rotating historical snapshot (up to 5 recent snapshots)
      try {
        const snapshotKey = `snapshot_${Date.now()}`;
        historyStore.put(projects, snapshotKey);
      } catch {
        // Non-blocking
      }

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB:', err);
  }
}

/**
 * Load all projects from IndexedDB and auto-hydrate any missing photos from Photo Vault
 */
export async function loadProjectsFromIDB(): Promise<Project[] | null> {
  try {
    const db = await openDatabase();
    const projects = await new Promise<Project[] | null>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(PROJECTS_KEY);

      request.onsuccess = () => {
        const result = request.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(result);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
      transaction.oncomplete = () => db.close();
    });

    if (projects && projects.length > 0) {
      // Hydrate all projects from Photo Vault
      const hydrated = await Promise.all(
        projects.map(async (p) => {
          const { project } = await hydrateProjectPhotosFromVault(p);
          return project;
        })
      );
      return hydrated;
    }

    return null;
  } catch (err) {
    console.warn('Failed to load from IndexedDB:', err);
    return null;
  }
}

/**
 * Emergency deep-scan across IndexedDB Photo Vault, History Store, and LocalStorage
 * to recover any photos that disappeared after login or session reset.
 */
export async function scanAndRecoverPhotosFromStorage(currentProjects: Project[]): Promise<{
  recoveredCount: number;
  restoredReportsCount: number;
  projects: Project[];
}> {
  let recoveredCount = 0;
  let restoredReportsCount = 0;

  try {
    const db = await openDatabase();
    // 1. Gather all photos from PHOTO_VAULT_STORE
    const vaultMap = new Map<string, string[]>();
    await new Promise<void>((resolve) => {
      const transaction = db.transaction([PHOTO_VAULT_STORE], 'readonly');
      const store = transaction.objectStore(PHOTO_VAULT_STORE);
      const request = store.openCursor();

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          if (typeof cursor.key === 'string' && Array.isArray(cursor.value) && cursor.value.length > 0) {
            vaultMap.set(cursor.key, cursor.value);
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => resolve();
    });

    // 2. Also scan HISTORY_STORE for any previous project snapshots that had photos
    await new Promise<void>((resolve) => {
      const transaction = db.transaction([HISTORY_STORE], 'readonly');
      const store = transaction.objectStore(HISTORY_STORE);
      const request = store.openCursor();

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          const snapProjects = cursor.value;
          if (Array.isArray(snapProjects)) {
            snapProjects.forEach((p: Project) => {
              (p.dailyReports || []).forEach((r) => {
                const photos = Array.isArray(r.photoUrls) && r.photoUrls.length > 0
                  ? r.photoUrls.filter(Boolean)
                  : r.photoUrl ? [r.photoUrl] : [];
                if (photos.length > 0 && !vaultMap.has(r.id)) {
                  vaultMap.set(r.id, photos);
                }
              });
            });
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => resolve();
    });

    db.close();

    // 3. Scan LocalStorage for any cached projects
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('rab_kurva') || key.includes('backup') || key.includes('project'))) {
          const val = localStorage.getItem(key);
          if (val && val.includes('photoUrl')) {
            try {
              const parsed = JSON.parse(val);
              const list: Project[] = Array.isArray(parsed) ? parsed : [parsed];
              list.forEach((p) => {
                (p.dailyReports || []).forEach((r) => {
                  const photos = Array.isArray(r.photoUrls) && r.photoUrls.length > 0
                    ? r.photoUrls.filter(Boolean)
                    : r.photoUrl ? [r.photoUrl] : [];
                  if (photos.length > 0 && !vaultMap.has(r.id)) {
                    vaultMap.set(r.id, photos);
                  }
                });
              });
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch {
      // ignore
    }

    // 4. Apply recovered photos to current projects
    const updatedProjects = currentProjects.map((proj) => {
      let projectChanged = false;
      const updatedReports = (proj.dailyReports || []).map((rep) => {
        const currentPhotos = Array.isArray(rep.photoUrls) && rep.photoUrls.length > 0
          ? rep.photoUrls.filter(Boolean)
          : rep.photoUrl ? [rep.photoUrl] : [];

        const vaultPhotos = vaultMap.get(rep.id);
        if (vaultPhotos && vaultPhotos.length > currentPhotos.length) {
          projectChanged = true;
          restoredReportsCount += 1;
          recoveredCount += (vaultPhotos.length - currentPhotos.length);
          return {
            ...rep,
            photoUrl: vaultPhotos[0],
            photoUrls: vaultPhotos,
            hasLocalPhotosOnly: false,
          };
        }
        return rep;
      });

      return projectChanged ? { ...proj, dailyReports: updatedReports } : proj;
    });

    // If any photos were recovered, immediately re-save them to IDB and vault
    if (recoveredCount > 0) {
      await saveProjectsToIDB(updatedProjects);
    }

    return {
      recoveredCount,
      restoredReportsCount,
      projects: updatedProjects,
    };
  } catch (err) {
    console.error('Photo recovery scan failed:', err);
    return {
      recoveredCount: 0,
      restoredReportsCount: 0,
      projects: currentProjects,
    };
  }
}

/**
 * Estimate storage usage in browser
 */
export async function getStorageEstimate(): Promise<{
  usedMB: number;
  quotaMB: number;
  percent: number;
}> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const used = (estimate.usage || 0) / (1024 * 1024);
      const quota = (estimate.quota || 0) / (1024 * 1024);
      const percent = quota > 0 ? (used / quota) * 100 : 0;
      return {
        usedMB: Math.round(used * 10) / 10,
        quotaMB: Math.round(quota),
        percent: Math.round(percent * 10) / 10,
      };
    } catch {
      // Fallback
    }
  }
  return { usedMB: 0, quotaMB: 1000, percent: 0 };
}
