import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { auth, googleProvider } from './config';
import {
  saveProjectToFirestore,
  deleteProjectFromFirestore,
  subscribeToProjects,
} from './firestoreService';
import {
  getQuotaExceeded,
  setQuotaExceeded,
  isQuotaExceededError,
} from './firestoreErrors';
import firebaseConfig from '../../firebase-applet-config.json';
import { Project } from '../types/project';

export const FIRESTORE_UPGRADE_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

export type SyncStatusType = 'synced' | 'syncing' | 'offline' | 'error' | 'quota-exceeded';

interface FirebaseContextType {
  user: User | null;
  isLoadingAuth: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatusType;
  lastSyncedAt: Date | null;
  cloudProjects: Project[];
  isQuotaExceeded: boolean;
  quotaUpgradeUrl: string;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  syncProjectToCloud: (project: Project) => Promise<void>;
  deleteProjectFromCloud: (projectId: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isQuotaExceededState, setIsQuotaExceededState] = useState<boolean>(() => getQuotaExceeded());
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>(() => (getQuotaExceeded() ? 'quota-exceeded' : 'synced'));
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [cloudProjects, setCloudProjects] = useState<Project[]>([]);
  const hasSubscribedRef = useRef(false);

  // Listen to Auth State and handle redirect auth result
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
        }
      })
      .catch((err) => {
        console.warn('Redirect auth result check note:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firestore Projects when user is signed in
  useEffect(() => {
    if (!user) {
      setCloudProjects([]);
      hasSubscribedRef.current = false;
      return;
    }

    if (getQuotaExceeded()) {
      setIsQuotaExceededState(true);
      setSyncStatus('quota-exceeded');
      return;
    }

    setSyncStatus('syncing');
    const unsubscribe = subscribeToProjects(
      (projects) => {
        setCloudProjects(projects);
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      },
      (err) => {
        if (isQuotaExceededError(err)) {
          setQuotaExceeded(true);
          setIsQuotaExceededState(true);
          setSyncStatus('quota-exceeded');
        } else {
          setSyncStatus('offline');
        }
        console.warn('Realtime sync notice:', err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const signInWithGoogle = async () => {
    try {
      setIsLoadingAuth(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      // If popup was blocked or failed due to mobile browser iframe/restrictions, fallback to direct redirect
      const errCode = error?.code || '';
      if (
        errCode === 'auth/popup-blocked' ||
        errCode === 'auth/popup-closed-by-user' ||
        errCode === 'auth/cancelled-popup-request' ||
        errCode === 'auth/operation-not-supported-in-this-environment'
      ) {
        console.warn('Popup blocked or cancelled, falling back to signInWithRedirect...');
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          console.error('Redirect sign in also failed:', redirectErr);
          throw redirectErr;
        }
      }
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const syncProjectToCloud = async (project: Project) => {
    if (!user) return;
    if (getQuotaExceeded() || isQuotaExceededState) {
      setIsQuotaExceededState(true);
      setSyncStatus('quota-exceeded');
      return;
    }

    try {
      setIsSyncing(true);
      setSyncStatus('syncing');
      await saveProjectToFirestore(project);
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
    } catch (error) {
      if (isQuotaExceededError(error)) {
        setQuotaExceeded(true);
        setIsQuotaExceededState(true);
        setSyncStatus('quota-exceeded');
      } else {
        setSyncStatus('error');
      }
      console.warn('Failed to sync project to cloud notice:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteProjectFromCloud = async (projectId: string) => {
    if (!user) return;
    if (getQuotaExceeded() || isQuotaExceededState) {
      setIsQuotaExceededState(true);
      setSyncStatus('quota-exceeded');
      return;
    }

    try {
      setIsSyncing(true);
      await deleteProjectFromFirestore(projectId);
    } catch (error) {
      if (isQuotaExceededError(error)) {
        setQuotaExceeded(true);
        setIsQuotaExceededState(true);
        setSyncStatus('quota-exceeded');
      }
      console.warn('Failed to delete project from cloud notice:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        isLoadingAuth,
        isSyncing,
        syncStatus,
        lastSyncedAt,
        cloudProjects,
        isQuotaExceeded: isQuotaExceededState,
        quotaUpgradeUrl: FIRESTORE_UPGRADE_URL,
        signInWithGoogle,
        logout,
        syncProjectToCloud,
        deleteProjectFromCloud,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextType => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
