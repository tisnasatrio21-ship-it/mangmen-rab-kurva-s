import React, { useState } from 'react';
import {
  ShieldAlert,
  Smartphone,
  Send,
  Lock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  UserCheck,
  Building2,
  Sparkles,
  Loader2,
  RefreshCw,
  Languages,
} from 'lucide-react';
import { AuthorizedDevice } from '../types/project';
import {
  ADMIN_PHONE_NUMBER,
  ADMIN_EMAIL,
  generateWhatsAppApprovalLink,
} from '../utils/deviceAuth';
import { useLanguage } from '../i18n/LanguageContext';

interface DeviceLockScreenProps {
  currentDevice: AuthorizedDevice;
  onAdminLogin: () => Promise<void>;
  isLoadingAuth: boolean;
  onRefreshStatus: () => void;
}

export const DeviceLockScreen: React.FC<DeviceLockScreenProps> = ({
  currentDevice,
  onAdminLogin,
  isLoadingAuth,
  onRefreshStatus,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'id' ? 'en' : 'id');
  };

  const waLink = generateWhatsAppApprovalLink({
    deviceId: currentDevice.id,
    deviceName: currentDevice.deviceName,
    requestedAt: currentDevice.requestedAt,
  });

  const handleCopyId = () => {
    navigator.clipboard.writeText(currentDevice.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    onRefreshStatus();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-4 sm:p-6 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Top Brand Bar */}
      <div className="w-full max-w-lg flex items-center justify-between py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-sm shadow">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-extrabold text-xs text-white uppercase tracking-wider">
              {t.appTitle}
            </h1>
            <p className="text-[10px] text-slate-400">Security Gate &amp; Access Control</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 font-bold cursor-pointer"
            title="Ganti Bahasa / Change Language"
          >
            <Languages className="w-3 h-3 text-amber-400" />
            <span>{language === 'id' ? 'ID 🇮🇩' : 'EN 🇬🇧'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-amber-400 font-mono">
            <Lock className="w-3 h-3" />
            <span>LOCKED</span>
          </div>
        </div>
      </div>

      {/* Main Lock Card */}
      <div className="w-full max-w-lg my-auto py-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-7 space-y-6 relative overflow-hidden">
          {/* Subtle top indicator */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />

          {/* Header Icon & Title */}
          <div className="text-center space-y-2">
            <div className="relative inline-block">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Akses Perangkat Baru Terkunci
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Untuk melindungi data RAB, Kurva S, dan Laporan Proyek, setiap perangkat baru memerlukan izin dari <strong className="text-slate-200">Pak Tisna Satrio</strong>.
            </p>
          </div>

          {/* Device Metadata Card */}
          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Nama Perangkat:</span>
              </span>
              <span className="font-semibold text-white truncate max-w-[200px]" title={currentDevice.deviceName}>
                {currentDevice.deviceName}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs">
              <span className="text-slate-400">Kode ID Perangkat:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 text-xs">
                  {currentDevice.id}
                </span>
                <button
                  onClick={handleCopyId}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Salin ID Perangkat"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Status Persetujuan:</span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Menunggu Konfirmasi WA</span>
              </span>
            </div>
          </div>

          {/* Primary Action: Direct WhatsApp to Pak Tisna */}
          <div className="space-y-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
            >
              <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              <span>Kirim Permintaan Izin ke WA Pak Tisna</span>
              <ExternalLink className="w-4 h-4 opacity-75" />
            </a>

            <p className="text-[11px] text-center text-slate-400">
              WhatsApp Admin: <span className="font-mono text-emerald-400 font-bold">+62 813-1576-2352</span>
            </p>
          </div>

          {/* Live waiting indicator */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
              <span className="text-[11px]">Layar ini akan terbuka otomatis begitu disetujui.</span>
            </div>
            <button
              onClick={handleManualRefresh}
              className="p-1 text-slate-400 hover:text-amber-400 rounded transition-colors cursor-pointer"
              title="Periksa Status Sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              Khusus Pemilik Aplikasi
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Admin Bypass Sign-in Button */}
          <div>
            <button
              onClick={onAdminLogin}
              disabled={isLoadingAuth}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 active:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoadingAuth ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <UserCheck className="w-4 h-4 text-amber-400" />
              )}
              <span>Saya adalah Pak Tisna (Login Langsung Google)</span>
            </button>
            <p className="text-[10px] text-center text-slate-500 mt-1.5">
              Login dengan akun <code>{ADMIN_EMAIL}</code> akan otomatis membuka kunci perangkat ini.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-lg text-center text-[11px] text-slate-500 py-2 border-t border-slate-800/60">
        <span>Sistem Proteksi Akses Perangkat • Tisna Satrio (RAB &amp; Kurva S)</span>
      </div>
    </div>
  );
};
