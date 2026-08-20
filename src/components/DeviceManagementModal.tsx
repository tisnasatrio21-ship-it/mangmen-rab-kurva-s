import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  XCircle,
  Trash2,
  Clock,
  Send,
  ExternalLink,
  Search,
  RefreshCw,
  Sparkles,
  Loader2,
  Lock,
  Unlock,
} from 'lucide-react';
import { AuthorizedDevice } from '../types/project';
import {
  subscribeToAllDevices,
  approveDevice,
  rejectDevice,
  deleteDeviceRecord,
  ADMIN_PHONE_NUMBER,
  ADMIN_EMAIL,
  generateWhatsAppApprovalLink,
} from '../utils/deviceAuth';
import { useLanguage } from '../i18n/LanguageContext';

interface DeviceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDeviceId: string;
  adminEmail?: string | null;
}

export const DeviceManagementModal: React.FC<DeviceManagementModalProps> = ({
  isOpen,
  onClose,
  currentDeviceId,
  adminEmail,
}) => {
  const { t, language } = useLanguage();
  const [devices, setDevices] = useState<AuthorizedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    const unsubscribe = subscribeToAllDevices(
      (list) => {
        setDevices(list);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Devices subscription error:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleApprove = async (device: AuthorizedDevice) => {
    setActionInProgressId(device.id);
    try {
      await approveDevice(device.id, adminEmail || ADMIN_EMAIL);
      showToast(`Perangkat "${device.deviceName} (${device.id})" berhasil DIIZINKAN!`);
    } catch (e: any) {
      showToast(`Gagal mengizinkan perangkat: ${e.message}`, true);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleReject = async (device: AuthorizedDevice) => {
    if (!confirm(`Cabut akses untuk perangkat "${device.deviceName} (${device.id})"? Perangkat ini akan langsung terkunci kembali.`)) {
      return;
    }
    setActionInProgressId(device.id);
    try {
      await rejectDevice(device.id);
      showToast(`Akses untuk perangkat "${device.id}" telah DICABUT.`, true);
    } catch (e: any) {
      showToast(`Gagal mencabut akses: ${e.message}`, true);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDelete = async (device: AuthorizedDevice) => {
    if (!confirm(`Hapus permanen riwayat perangkat "${device.id}"?`)) return;
    setActionInProgressId(device.id);
    try {
      await deleteDeviceRecord(device.id);
      showToast(`Riwayat perangkat "${device.id}" dihapus.`);
    } catch (e: any) {
      showToast(`Gagal menghapus riwayat: ${e.message}`, true);
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredDevices = devices.filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      d.id.toLowerCase().includes(term) ||
      d.deviceName.toLowerCase().includes(term) ||
      (d.status || '').toLowerCase().includes(term)
    );
  });

  const pendingCount = devices.filter((d) => d.status === 'pending').length;
  const approvedCount = devices.filter((d) => d.status === 'approved').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Otorisasi &amp; Keamanan Perangkat</span>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  WhatsApp Gate
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Kelola daftar HP &amp; Komputer yang diizinkan mengakses aplikasi RAB &amp; Kurva S.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-slate-900/60 border-b border-slate-800 text-xs">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Terdaftar</span>
            <p className="text-base font-extrabold text-white mt-0.5">{devices.length}</p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-900/40 text-center">
            <span className="text-[10px] text-emerald-400 font-bold uppercase">Diizinkan (Aktif)</span>
            <p className="text-base font-extrabold text-emerald-400 mt-0.5">{approvedCount}</p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-900/40 text-center">
            <span className="text-[10px] text-amber-400 font-bold uppercase">Menunggu Izin</span>
            <p className="text-base font-extrabold text-amber-400 mt-0.5">{pendingCount}</p>
          </div>
        </div>

        {/* WhatsApp & Admin Info Box */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px]">Nomor WhatsApp Admin:</span>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
              +62 813-1576-2352
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Admin: <strong>{ADMIN_EMAIL}</strong></span>
          </div>
        </div>

        {/* Toast Notification */}
        {notification && (
          <div
            className={`mx-5 mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
              notification.isError
                ? 'bg-rose-950/90 border border-rose-500/50 text-rose-300'
                : 'bg-emerald-950/90 border border-emerald-500/50 text-emerald-300'
            }`}
          >
            {notification.isError ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{notification.msg}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-5 pt-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan ID perangkat (DEV-...) atau tipe perangkat..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Devices List Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
              <p className="text-xs">Memuat daftar perangkat dari database...</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
              <Smartphone className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Belum ada perangkat terdaftar</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ketika ada HP atau Laptop baru yang membuka aplikasi, permintaannya akan otomatis muncul di sini dan mengirim chat ke WhatsApp Anda.
              </p>
            </div>
          ) : (
            filteredDevices.map((device) => {
              const isCurrent = device.id === currentDeviceId;
              const isPending = device.status === 'pending';
              const isApproved = device.status === 'approved';
              const isRejected = device.status === 'rejected';

              return (
                <div
                  key={device.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-xs'
                      : isPending
                      ? 'bg-slate-950/90 border-amber-500/40 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {device.id}
                        </span>

                        {isCurrent && (
                          <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                            Perangkat Anda Saat Ini
                          </span>
                        )}

                        {isPending && (
                          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                            <span>Menunggu Izin</span>
                          </span>
                        )}

                        {isApproved && (
                          <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Diizinkan</span>
                          </span>
                        )}

                        {isRejected && (
                          <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            <span>Ditolak / Dikunci</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-200">{device.deviceName}</p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>
                            Diminta:{' '}
                            {new Date(device.requestedAt).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </span>

                        {device.approvedAt && (
                          <span className="text-emerald-400/80">
                            Disetujui:{' '}
                            {new Date(device.approvedAt).toLocaleDateString('id-ID', {
                              dateStyle: 'short',
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {isPending && (
                        <button
                          onClick={() => handleApprove(device)}
                          disabled={actionInProgressId === device.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                          title="Izinkan perangkat ini membuka aplikasi"
                        >
                          {actionInProgressId === device.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                          <span>Izinkan Akses</span>
                        </button>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => handleReject(device)}
                          disabled={actionInProgressId === device.id}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 font-semibold text-xs rounded-lg border border-slate-700 hover:border-rose-500/50 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Kunci dan cabut izin perangkat ini"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Cabut Izin</span>
                        </button>
                      )}

                      {isRejected && (
                        <button
                          onClick={() => handleApprove(device)}
                          disabled={actionInProgressId === device.id}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-400 font-semibold text-xs rounded-lg border border-slate-700 hover:border-emerald-500/50 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Buka kembali izin perangkat ini"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Buka Izin</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(device)}
                        disabled={actionInProgressId === device.id}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Hapus riwayat perangkat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Setiap permintaan izin baru akan mengirim chat link ke WhatsApp <strong>+62 813-1576-2352</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
