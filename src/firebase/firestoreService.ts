import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './config';
import { handleFirestoreError, OperationType, getQuotaExceeded, setQuotaExceeded, isQuotaExceededError } from './firestoreErrors';
import { Project } from '../types/project';

const PROJECTS_COLLECTION = 'projects';

/**
 * Fetch all projects from Firestore with strict error handling
 */
export async function fetchProjectsFromFirestore(): Promise<Project[]> {
  if (getQuotaExceeded()) {
    console.warn('Firestore fetch skipped: Daily quota limit active. Using local data.');
    return [];
  }

  try {
    const snapshot = await getDocs(collection(db, PROJECTS_COLLECTION));
    const projects: Project[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      projects.push({
        id: docSnap.id,
        name: data.name || 'Proyek Tanpa Nama',
        code: data.code || '',
        client: data.client || '',
        location: data.location || '',
        contractor: data.contractor || '',
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        periodType: data.periodType || 'weekly',
        totalPeriods: data.totalPeriods || 12,
        totalContractValue: data.totalContractValue || 0,
        rabItems: Array.isArray(data.rabItems) ? data.rabItems : [],
        plannedDistributions: Array.isArray(data.plannedDistributions) ? data.plannedDistributions : [],
        dailyReports: Array.isArray(data.dailyReports) ? data.dailyReports : [],
        lastUpdateDate: data.lastUpdateDate || '',
      });
    });
    return projects;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setQuotaExceeded(true);
      console.warn('Firestore fetch encountered quota limit. Returning local cache.');
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
  }
}

/**
 * Save or update a project in Firestore
 */
export async function saveProjectToFirestore(project: Project): Promise<void> {
  if (getQuotaExceeded()) {
    console.warn('Firestore write skipped: Daily write quota reached. LocalStorage remains active.');
    return;
  }

  const docPath = `${PROJECTS_COLLECTION}/${project.id}`;
  try {
    const currentUserId = auth.currentUser?.uid;
    let projectData: any = {
      id: project.id,
      name: project.name,
      code: project.code,
      client: project.client,
      location: project.location || '',
      contractor: project.contractor || '',
      startDate: project.startDate,
      endDate: project.endDate,
      periodType: project.periodType || 'weekly',
      totalPeriods: Number(project.totalPeriods) || 12,
      totalContractValue: Number(project.totalContractValue) || 0,
      ownerId: currentUserId || 'anonymous',
      rabItems: project.rabItems || [],
      plannedDistributions: project.plannedDistributions || [],
      dailyReports: project.dailyReports || [],
      lastUpdateDate: project.lastUpdateDate || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    // Calculate approximate payload size to avoid hitting Firestore's strict 1,048,576 bytes (1MB) limit
    const getPayloadSize = (data: any) => {
      try {
        return new Blob([JSON.stringify(data)]).size;
      } catch {
        return JSON.stringify(data).length;
      }
    };

    let payloadSize = getPayloadSize(projectData);

    // If payload exceeds 850KB, sanitize heavy photos for the cloud copy
    if (payloadSize > 850000 && Array.isArray(projectData.dailyReports)) {
      console.warn(`Project payload is large (${payloadSize} bytes). Optimizing photo data for cloud sync...`);
      const lightReports = projectData.dailyReports.map((r: any) => {
        let pUrl = r.photoUrl || '';
        let pUrls = Array.isArray(r.photoUrls) ? [...r.photoUrls] : [];
        // Keep primary photo if compact, otherwise omit in cloud sync to protect metadata
        if (pUrl.length > 70000) {
          pUrl = '';
        }
        pUrls = pUrls.filter((u) => typeof u === 'string' && u.length <= 70000);
        return {
          ...r,
          photoUrl: pUrl,
          photoUrls: pUrls,
        };
      });
      projectData = { ...projectData, dailyReports: lightReports };
    }

    await setDoc(doc(db, PROJECTS_COLLECTION, project.id), projectData);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (
      errorMsg.includes('exceeds the maximum allowed size') ||
      errorMsg.includes('1,048,576 bytes') ||
      errorMsg.includes('cannot be written because its size')
    ) {
      console.warn('Firestore write failed due to document size limit (1MB). Retrying with lightweight daily reports...');
      try {
        const strippedReports = (project.dailyReports || []).map((r: any) => ({
          ...r,
          photoUrl: '',
          photoUrls: [],
          hasLocalPhotosOnly: true,
        }));
        await setDoc(doc(db, PROJECTS_COLLECTION, project.id), {
          id: project.id,
          name: project.name,
          code: project.code,
          client: project.client,
          location: project.location || '',
          contractor: project.contractor || '',
          startDate: project.startDate,
          endDate: project.endDate,
          periodType: project.periodType || 'weekly',
          totalPeriods: Number(project.totalPeriods) || 12,
          totalContractValue: Number(project.totalContractValue) || 0,
          ownerId: auth.currentUser?.uid || 'anonymous',
          rabItems: project.rabItems || [],
          plannedDistributions: project.plannedDistributions || [],
          dailyReports: strippedReports,
          lastUpdateDate: project.lastUpdateDate || new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString(),
        });
        console.log('Project successfully backed up to cloud with local-photo markers.');
        return;
      } catch (retryErr) {
        console.error('Retry after size stripping notice:', retryErr);
      }
    }

    if (isQuotaExceededError(error)) {
      setQuotaExceeded(true);
      console.warn('Firestore write quota exceeded. Project saved safely to LocalStorage.');
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Delete a project from Firestore
 */
export async function deleteProjectFromFirestore(projectId: string): Promise<void> {
  if (getQuotaExceeded()) {
    console.warn('Firestore delete skipped: Daily write quota reached.');
    return;
  }

  const docPath = `${PROJECTS_COLLECTION}/${projectId}`;
  try {
    await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setQuotaExceeded(true);
      console.warn('Firestore delete quota exceeded.');
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Subscribe to real-time updates for all projects
 */
export function subscribeToProjects(
  onUpdate: (projects: Project[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  if (getQuotaExceeded()) {
    return () => {};
  }

  return onSnapshot(
    collection(db, PROJECTS_COLLECTION),
    (snapshot) => {
      const projects: Project[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        projects.push({
          id: docSnap.id,
          name: data.name || 'Proyek Tanpa Nama',
          code: data.code || '',
          client: data.client || '',
          location: data.location || '',
          contractor: data.contractor || '',
          startDate: data.startDate || '',
          endDate: data.endDate || '',
          periodType: data.periodType || 'weekly',
          totalPeriods: data.totalPeriods || 12,
          totalContractValue: data.totalContractValue || 0,
          rabItems: Array.isArray(data.rabItems) ? data.rabItems : [],
          plannedDistributions: Array.isArray(data.plannedDistributions) ? data.plannedDistributions : [],
          dailyReports: Array.isArray(data.dailyReports) ? data.dailyReports : [],
          lastUpdateDate: data.lastUpdateDate || '',
        });
      });
      onUpdate(projects);
    },
    (error) => {
      if (isQuotaExceededError(error)) {
        setQuotaExceeded(true);
        if (onError) {
          onError(error);
        }
        return;
      }
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.GET, PROJECTS_COLLECTION);
    }
  );
}
