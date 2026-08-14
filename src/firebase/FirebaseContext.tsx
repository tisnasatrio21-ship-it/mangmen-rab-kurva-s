import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './config';
import {
  saveProjectToFirestore,
  deleteProjectFromFirestore,
  subscribeToProjects,
} from './firestoreService';
import { Project } from '../types/project';

interface FirebaseContextType {
  user: User | null;
  isLoadingAuth: boolean;
  isSyncing: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: Date | null;
  cloudProjects: Project[];
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
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [cloudProjects, setCloudProjects] = useState<Project[]>([]);

  // Listen to Auth State
  useEffect(() => {
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
        console.warn('Realtime sync notice:', err);
        setSyncStatus('offline');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const signInWithGoogle = async () => {
    try {
      setIsLoadingAuth(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
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
    try {
      setIsSyncing(true);
      setSyncStatus('syncing');
      await saveProjectToFirestore(project);
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error('Failed to sync project to cloud:', error);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteProjectFromCloud = async (projectId: string) => {
    if (!user) return;
    try {
      setIsSyncing(true);
      await deleteProjectFromFirestore(projectId);
    } catch (error) {
      console.error('Failed to delete project from cloud:', error);
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
