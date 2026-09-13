import { Project } from '../types/project';

const DB_NAME = 'RAB_KURVA_S_DB';
const DB_VERSION = 1;
const STORE_NAME = 'projects_store';
const PROJECTS_KEY = 'all_projects';

/**
 * Open or create IndexedDB connection
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
 * Save all projects (including hundreds of high-resolution photos) to IndexedDB
 * Capacity: Hundreds of Megabytes to Gigabytes.
 */
export async function saveProjectsToIDB(projects: Project[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(projects, PROJECTS_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB:', err);
  }
}

/**
 * Load all projects from IndexedDB
 */
export async function loadProjectsFromIDB(): Promise<Project[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
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

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Failed to load from IndexedDB:', err);
    return null;
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
