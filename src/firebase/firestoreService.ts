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
import { handleFirestoreError, OperationType } from './firestoreErrors';
import { Project } from '../types/project';

const PROJECTS_COLLECTION = 'projects';

/**
 * Fetch all projects from Firestore with strict error handling
 */
export async function fetchProjectsFromFirestore(): Promise<Project[]> {
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
    handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
  }
}

/**
 * Save or update a project in Firestore
 */
export async function saveProjectToFirestore(project: Project): Promise<void> {
  const docPath = `${PROJECTS_COLLECTION}/${project.id}`;
  try {
    const currentUserId = auth.currentUser?.uid;
    const projectData = {
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

    await setDoc(doc(db, PROJECTS_COLLECTION, project.id), projectData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Delete a project from Firestore
 */
export async function deleteProjectFromFirestore(projectId: string): Promise<void> {
  const docPath = `${PROJECTS_COLLECTION}/${projectId}`;
  try {
    await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
  } catch (error) {
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
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.GET, PROJECTS_COLLECTION);
    }
  );
}
