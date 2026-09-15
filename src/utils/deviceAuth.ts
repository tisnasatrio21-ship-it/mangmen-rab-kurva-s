import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { AuthorizedDevice, DeviceStatus } from '../types/project';
import { handleFirestoreError, OperationType, getQuotaExceeded, setQuotaExceeded, isQuotaExceededError } from '../firebase/firestoreErrors';

export const ADMIN_PHONE_NUMBER = '6281315762352'; // Pak Tisna WhatsApp
export const ADMIN_EMAIL = 'tisnasatrio21@gmail.com'; // Master Admin Email
export const MASTER_ADMIN_PIN = '170845'; // Pak Tisna Secret PIN for instant bypass on any device
const DEVICES_COLLECTION = 'authorized_devices';

const LOCAL_DEVICE_ID_KEY = 'tisna_rab_device_id';
const LOCAL_DEVICE_NAME_KEY = 'tisna_rab_device_name';
const LOCAL_DEVICE_CREATED_KEY = 'tisna_rab_device_created';
const LOCAL_DEVICE_APPROVED_PREFIX = 'tisna_device_approved_';
const LOCAL_ADMIN_PIN_KEY = 'tisna_master_pin_unlocked';

/**
 * Validate and verify Pak Tisna's master PIN (170845)
 */
export function verifyMasterAdminPin(enteredPin: string, deviceId: string): boolean {
  if (!enteredPin) return false;
  if (enteredPin.trim() === MASTER_ADMIN_PIN) {
    // Persist approval on this device instantly
    localStorage.setItem(`${LOCAL_DEVICE_APPROVED_PREFIX}${deviceId}`, 'true');
    localStorage.setItem(LOCAL_ADMIN_PIN_KEY, 'true');
    // Also mark in Firestore asynchronously if possible
    approveDevice(deviceId, `PIN Pemilik (${ADMIN_EMAIL})`).catch((err) => {
      console.warn('Notice syncing PIN approval to cloud:', err);
    });
    return true;
  }
  return false;
}

/**
 * Check if this device has already been unlocked via PIN
 */
export function isDeviceUnlockedByPin(deviceId: string): boolean {
  const isApproved = localStorage.getItem(`${LOCAL_DEVICE_APPROVED_PREFIX}${deviceId}`) === 'true';
  const isPinUnlocked = localStorage.getItem(LOCAL_ADMIN_PIN_KEY) === 'true';
  return isApproved && isPinUnlocked;
}

/**
 * Detect client OS, browser, and device model in human-readable Indonesian
 */
export function detectDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = 'Browser Web';
  let os = 'Perangkat';

  // Detect browser
  if (ua.includes('Edg/')) {
    browser = 'Microsoft Edge';
  } else if (ua.includes('Chrome/') && !ua.includes('Chromium')) {
    browser = 'Google Chrome';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Apple Safari';
  } else if (ua.includes('Firefox/')) {
    browser = 'Mozilla Firefox';
  } else if (ua.includes('Opera') || ua.includes('OPR/')) {
    browser = 'Opera';
  }

  // Detect OS / Platform
  if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/iPad|iPhone|iPod/.test(ua)) {
    os = 'iOS (iPhone/iPad)';
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows PC';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS (MacBook/iMac)';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  return `${browser} (${os})`;
}

/**
 * Get or create unique persistent Device ID (e.g. DEV-839210)
 */
export function getOrCreateDeviceId(): { deviceId: string; deviceName: string; isNew: boolean } {
  let deviceId = localStorage.getItem(LOCAL_DEVICE_ID_KEY);
  let isNew = false;

  if (!deviceId) {
    // Generate a clean human-readable device code
    const randNum = Math.floor(100000 + Math.random() * 900000);
    deviceId = `DEV-${randNum}`;
    localStorage.setItem(LOCAL_DEVICE_ID_KEY, deviceId);
    isNew = true;
  }

  let deviceName = localStorage.getItem(LOCAL_DEVICE_NAME_KEY);
  if (!deviceName) {
    deviceName = detectDeviceName();
    localStorage.setItem(LOCAL_DEVICE_NAME_KEY, deviceName);
  }

  if (!localStorage.getItem(LOCAL_DEVICE_CREATED_KEY)) {
    localStorage.setItem(LOCAL_DEVICE_CREATED_KEY, new Date().toISOString());
  }

  return { deviceId, deviceName, isNew };
}

/**
 * Generate WhatsApp confirmation link with pre-filled permission request
 */
export function generateWhatsAppApprovalLink(device: {
  deviceId: string;
  deviceName: string;
  requestedAt?: string;
}): string {
  const currentUrl = window.location.origin + window.location.pathname;
  const directApprovalUrl = `${currentUrl}?approve_device=${device.deviceId}`;

  const timeStr = device.requestedAt
    ? new Date(device.requestedAt).toLocaleString('id-ID', {
        dateStyle: 'full',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });

  const message =
    `*🚨 PERMOHONAN IZIN AKSES APLIKASI RAB & KURVA S*\n\n` +
    `Halo Pak Tisna, ada perangkat baru yang meminta izin akses untuk membuka aplikasi:\n\n` +
    `📱 *Perangkat*: ${device.deviceName}\n` +
    `🔑 *ID Perangkat*: ${device.deviceId}\n` +
    `🕒 *Waktu*: ${timeStr}\n\n` +
    `👇 *KLIK TAUTAN INI UNTUK MENGIJINKAN (1-KLIK):*\n` +
    `${directApprovalUrl}\n\n` +
    `_Jika bukan anggota tim proyek Anda, abaikan pesan ini._`;

  return `https://wa.me/${ADMIN_PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Register device in Firestore with pending status
 */
export async function registerDeviceInFirestore(
  deviceId: string,
  deviceName: string
): Promise<AuthorizedDevice> {
  const isLocallyApproved = localStorage.getItem(`${LOCAL_DEVICE_APPROVED_PREFIX}${deviceId}`) === 'true';

  if (getQuotaExceeded()) {
    return {
      id: deviceId,
      deviceName,
      status: isLocallyApproved ? 'approved' : 'pending',
      requestedAt: new Date().toISOString(),
    };
  }

  const docRef = doc(db, DEVICES_COLLECTION, deviceId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const status = (data.status as DeviceStatus) || (isLocallyApproved ? 'approved' : 'pending');
      if (status === 'approved') {
        localStorage.setItem(`${LOCAL_DEVICE_APPROVED_PREFIX}${deviceId}`, 'true');
      }
      return {
        id: snap.id,
        deviceName: data.deviceName || deviceName,
        userAgent: data.userAgent || navigator.userAgent,
        status,
        requestedAt: data.requestedAt || new Date().toISOString(),
        approvedAt: data.approvedAt,
        approvedBy: data.approvedBy,
      };
    }

    const newDevice: AuthorizedDevice = {
      id: deviceId,
      deviceName,
      userAgent: navigator.userAgent.substring(0, 450),
      status: isLocallyApproved ? 'approved' : 'pending',
      requestedAt: new Date().toISOString(),
    };

    await setDoc(docRef, newDevice);
    return newDevice;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setQuotaExceeded(true);
    }
    console.warn('Notice registering device in Firestore:', error);
    // Return a fallback local pending/approved object
    return {
      id: deviceId,
      deviceName,
      status: isLocallyApproved ? 'approved' : 'pending',
      requestedAt: new Date().toISOString(),
    };
  }
}

/**
 * Real-time subscription to a single device's authorization status
 */
export function subscribeToDeviceStatus(
  deviceId: string,
  onStatusChange: (device: AuthorizedDevice) => void,
  onError?: (err: any) => void
): Unsubscribe {
  if (getQuotaExceeded()) {
    return () => {};
  }

  const docRef = doc(db, DEVICES_COLLECTION, deviceId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const status = (data.status as DeviceStatus) || 'pending';
        if (status === 'approved') {
          localStorage.setItem(`${LOCAL_DEVICE_APPROVED_PREFIX}${deviceId}`, 'true');
        }
        onStatusChange({
          id: snap.id,
          deviceName: data.deviceName || 'Perangkat Web',
          userAgent: data.userAgent || '',
          status,
          requestedAt: data.requestedAt || new Date().toISOString(),
          approvedAt: data.approvedAt,
          approvedBy: data.approvedBy,
        });
      }
    },
    (err) => {
      if (isQuotaExceededError(err)) {
        setQuotaExceeded(true);
      }
      console.warn('Device status listener notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time subscription to ALL devices (Admin View)
 */
export function subscribeToAllDevices(
  onUpdate: (devices: AuthorizedDevice[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  if (getQuotaExceeded()) {
    onUpdate([]);
    return () => {};
  }

  const colRef = collection(db, DEVICES_COLLECTION);
  return onSnapshot(
    colRef,
    (snap) => {
      const list: AuthorizedDevice[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          deviceName: data.deviceName || 'Perangkat Web',
          userAgent: data.userAgent || '',
          status: (data.status as DeviceStatus) || 'pending',
          requestedAt: data.requestedAt || new Date().toISOString(),
          approvedAt: data.approvedAt,
          approvedBy: data.approvedBy,
        });
      });
      // Sort newest request first
      list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      onUpdate(list);
    },
    (err) => {
      if (isQuotaExceededError(err)) {
        setQuotaExceeded(true);
      }
      console.warn('All devices listener notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Approve a device (Admin action)
 */
export async function approveDevice(deviceId: string, adminEmail: string = ADMIN_EMAIL): Promise<void> {
  // Always mark approved locally first for instant offline responsiveness
  localStorage.setItem(`${LOCAL_DEVICE_APPROVED_PREFIX}${deviceId}`, 'true');

  if (getQuotaExceeded()) {
    console.warn('Device approved locally (Firestore quota limit active).');
    return;
  }

  const docRef = doc(db, DEVICES_COLLECTION, deviceId);
  try {
    await updateDoc(docRef, {
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: adminEmail,
    });
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setQuotaExceeded(true);
      return;
    }
    // If updateDoc failed because document didn't exist yet, create it
    try {
      await setDoc(
        docRef,
        {
          id: deviceId,
          deviceName: 'Perangkat Web Baru',
          status: 'approved',
          requestedAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          approvedBy: adminEmail,
        },
        { merge: true }
      );
    } catch (e) {
      if (isQuotaExceededError(e)) {
        setQuotaExceeded(true);
        return;
      }
      handleFirestoreError(e, OperationType.WRITE, `${DEVICES_COLLECTION}/${deviceId}`);
    }
  }
}

/**
 * Revoke or reject a device (Admin action)
 */
export async function rejectDevice(deviceId: string): Promise<void> {
  localStorage.removeItem(`${LOCAL_DEVICE_APPROVED_PREFIX}${deviceId}`);
  if (getQuotaExceeded()) return;

  const docRef = doc(db, DEVICES_COLLECTION, deviceId);
  try {
    await updateDoc(docRef, {
      status: 'rejected',
      approvedAt: null,
      approvedBy: null,
    });
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `${DEVICES_COLLECTION}/${deviceId}`);
  }
}

/**
 * Delete a device record permanently (Admin action)
 */
export async function deleteDeviceRecord(deviceId: string): Promise<void> {
  localStorage.removeItem(`${LOCAL_DEVICE_APPROVED_PREFIX}${deviceId}`);
  if (getQuotaExceeded()) return;

  const docRef = doc(db, DEVICES_COLLECTION, deviceId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setQuotaExceeded(true);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `${DEVICES_COLLECTION}/${deviceId}`);
  }
}

/**
 * Checks if current user is the master admin Tisna
 */
export function isUserMasterAdmin(userEmail?: string | null): boolean {
  if (!userEmail) return false;
  return userEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
