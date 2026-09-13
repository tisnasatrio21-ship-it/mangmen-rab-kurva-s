import { auth, db } from './config';
import { disableNetwork, enableNetwork } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const anyErr = error as any;
  if (anyErr?.code === 'resource-exhausted') return true;
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('resource-exhausted') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('quota metric') ||
    msg.includes('free daily write units') ||
    msg.includes('free daily read units') ||
    msg.includes('maximum backoff delay')
  );
}

// Global flag to trip the circuit breaker in this session
let quotaExceededFlag = false;

// 18 hours duration before automatic re-attempt (Firestore reset cycle is daily)
const QUOTA_CACHE_DURATION_MS = 18 * 60 * 60 * 1000;

export function setQuotaExceeded(exceeded: boolean = true) {
  quotaExceededFlag = exceeded;
  try {
    if (exceeded) {
      const now = Date.now().toString();
      localStorage.setItem('firestore_quota_exceeded_timestamp', now);
      sessionStorage.setItem('firestore_quota_exceeded', 'true');
      // Gracefully disable network on Firestore DB instance to cease background backoff retry floods
      disableNetwork(db).catch(() => {});
    } else {
      localStorage.removeItem('firestore_quota_exceeded_timestamp');
      sessionStorage.removeItem('firestore_quota_exceeded');
      enableNetwork(db).catch(() => {});
    }
  } catch (e) {
    // ignore storage restrictions
  }
}

export function getQuotaExceeded(): boolean {
  if (quotaExceededFlag) return true;
  try {
    if (sessionStorage.getItem('firestore_quota_exceeded') === 'true') {
      return true;
    }
    const storedTs = localStorage.getItem('firestore_quota_exceeded_timestamp');
    if (storedTs) {
      const timeDiff = Date.now() - parseInt(storedTs, 10);
      if (timeDiff < QUOTA_CACHE_DURATION_MS) {
        quotaExceededFlag = true;
        // Keep network disconnected to protect free tier limit and prevent retry spam
        disableNetwork(db).catch(() => {});
        return true;
      } else {
        localStorage.removeItem('firestore_quota_exceeded_timestamp');
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  if (isQuotaExceededError(error)) {
    setQuotaExceeded(true);
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  
  if (!isQuotaExceededError(error)) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  } else {
    console.warn('Firestore Quota Notice: Free daily quota reached. LocalStorage remains active.', errInfo.error);
  }
  throw new Error(JSON.stringify(errInfo));
}
