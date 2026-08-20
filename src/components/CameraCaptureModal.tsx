import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  MapPin,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  FlipHorizontal,
  Upload,
  Layers,
} from 'lucide-react';
import {
  applyWatermarkToImage,
  getCurrentGpsPosition,
  formatTimestamp,
  loadImageFromFile,
  WatermarkOptions,
} from '../utils/photoWatermark';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (dataUrl: string) => void;
  projectName: string;
  itemDescription: string;
  locationName: string;
  reporterName: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
  projectName,
  itemDescription,
  locationName,
  reporterName,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // GPS and Live Time
  const [gpsCoords, setGpsCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(formatTimestamp(new Date()));

  // Camera stream references
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live timer tick for on-screen timestamp overlay
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCurrentTimeStr(formatTimestamp(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Fetch GPS Coordinates on mount
  useEffect(() => {
    if (!isOpen) return;

    setIsLocating(true);
    getCurrentGpsPosition().then((coords) => {
      setGpsCoords(coords);
      setIsLocating(false);
    });
  }, [isOpen]);

  // Start Camera Stream
  const startCamera = async () => {
    setIsCameraStarting(true);
    setCameraError(null);

    // Stop existing tracks if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Fitur kamera tidak didukung di browser ini.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Gagal mengakses kamera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Kamera tidak ditemukan pada perangkat ini.';
      }
      setCameraError(msg);
    } finally {
      setIsCameraStarting(false);
    }
  };

  // Switch between front and back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Trigger camera lifecycle
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !capturedPreview) {
      startCamera();
    } else {
      // Stop camera if tab changed or closed
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, activeTab, facingMode, capturedPreview]);

  // Take Snapshot from live Video Stream
  const handleSnapPhoto = async () => {
    if (!videoRef.current || isProcessing) return;

    setIsProcessing(true);
    try {
      const options: WatermarkOptions = {
        projectName,
        itemDescription,
        locationName,
        reporterName,
        customWatermark: 'app by Tisna',
        gpsCoords,
        customDate: new Date(),
      };

      const stampedDataUrl = await applyWatermarkToImage(videoRef.current, options);
      setCapturedPreview(stampedDataUrl);
    } catch (err) {
      console.error('Error stamping video snapshot:', err);
      alert('Gagal mengambil foto dari kamera. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Photo File Upload (From Gallery / Mobile File Picker)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const img = await loadImageFromFile(file);
      const options: WatermarkOptions = {
        projectName,
        itemDescription,
        locationName,
        reporterName,
        customWatermark: 'app by Tisna',
        gpsCoords,
        customDate: new Date(),
      };

      const stampedDataUrl = await applyWatermarkToImage(img, options);
      setCapturedPreview(stampedDataUrl);
    } catch (err) {
      console.error('Error stamping uploaded file:', err);
      alert('Gagal memproses file foto.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm photo selection and pass back to parent
  const handleConfirmPhoto = () => {
    if (capturedPreview) {
      onPhotoCaptured(capturedPreview);
      handleCloseModal();
    }
  };

  // Retake or discard photo
  const handleRetakePhoto = () => {
    setCapturedPreview(null);
  };

  // Close and clean up
  const handleCloseModal = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCapturedPreview(null);
    setCameraError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">GPS Timestamp Camera</h3>
              <p className="text-[11px] text-amber-400 font-medium">
                Auto-Watermark: Waktu, Koordinat GPS, &amp; "app by Tisna"
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch Tabs (Only when not previewing photo) */}
        {!capturedPreview && (
          <div className="flex border-b border-slate-800 bg-slate-900/80 text-xs">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-2.5 px-4 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'camera'
                  ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Kamera Langsung</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2.5 px-4 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'upload'
                  ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ambil dari Galeri / File HP</span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[320px]">
          {/* 1. Captured Preview State (Result Verification) */}
          {capturedPreview ? (
            <div className="w-full space-y-3 flex flex-col items-center">
              <div className="relative rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-lg w-full max-h-[60vh] bg-black flex items-center justify-center">
                <img
                  src={capturedPreview}
                  alt="Hasil Foto dengan Watermark GPS"
                  className="max-h-[58vh] w-full object-contain"
                />
                <div className="absolute top-2 left-2 bg-emerald-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                  <Check className="w-3 h-3" />
                  Watermark &amp; GPS Berhasil Ditempel
                </div>
              </div>

              <p className="text-[11px] text-slate-300 text-center">
                Foto siap dilampirkan pada Laporan Harian pekerjaan: <strong>{itemDescription}</strong>
              </p>
            </div>
          ) : activeTab === 'camera' ? (
            /* 2. Live Camera Viewfinder State */
            <div className="w-full relative rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner aspect-[4/3] sm:aspect-[16/10] max-h-[55vh] flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center space-y-3 max-w-sm">
                  <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                  <p className="text-xs text-rose-300 font-medium">{cameraError}</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
                  >
                    Gunakan Mode Upload Galeri
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Realtime On-Screen Viewfinder Overlay (HUD Simulation) */}
                  <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
                    {/* Top HUD: Status GPS & Camera switch */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="bg-slate-950/80 backdrop-blur-xs border border-slate-700/80 px-2.5 py-1 rounded-full text-[10px] flex items-center gap-1.5 shadow">
                        <MapPin className={`w-3 h-3 ${gpsCoords ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                        {isLocating ? (
                          <span className="text-amber-300">Mencari Koordinat GPS...</span>
                        ) : gpsCoords ? (
                          <span className="text-emerald-300 font-mono">
                            {gpsCoords.latitude.toFixed(4)}, {gpsCoords.longitude.toFixed(4)} (±{gpsCoords.accuracy}m)
                          </span>
                        ) : (
                          <span className="text-slate-300">{locationName || 'Lokasi Proyek'}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="pointer-events-auto p-2 bg-slate-950/80 hover:bg-slate-800 border border-slate-700 rounded-full text-white shadow cursor-pointer transition-transform active:scale-90"
                        title="Ganti Kamera Depan/Belakang"
                      >
                        <FlipHorizontal className="w-4 h-4 text-amber-400" />
                      </button>
                    </div>

                    {/* Bottom HUD: Live Stamp Preview Box */}
                    <div className="flex items-end justify-between gap-2">
                      <div className="bg-slate-950/85 backdrop-blur-xs border border-amber-500/50 rounded-lg p-2 text-[10px] text-white space-y-0.5 max-w-[80%] shadow-lg">
                        <div className="text-amber-400 font-bold truncate">🏢 {projectName}</div>
                        <div className="text-slate-100 font-semibold truncate">🔨 {itemDescription}</div>
                        <div className="text-emerald-400 font-mono text-[9px]">
                          📍 {gpsCoords ? `${gpsCoords.latitude.toFixed(5)}, ${gpsCoords.longitude.toFixed(5)}` : locationName}
                        </div>
                        <div className="text-slate-300 text-[9px] flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-blue-400" />
                          <span>{currentTimeStr}</span>
                        </div>
                      </div>

                      <div className="bg-black/80 border border-amber-400/50 px-2 py-0.5 rounded-full text-[9px] text-yellow-300 font-bold shadow shrink-0">
                        ⚡ app by Tisna
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* 3. Upload from Gallery State */
            <div className="w-full text-center space-y-4 py-8 px-4 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/50">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <Upload className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-white">Pilih Foto dari Galeri Smartphone / Laptop</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Sistem akan otomatis mencetak tanggal, waktu saat ini, koordinat GPS, dan watermark "app by Tisna" pada foto.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
                id="gallery-file-input"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Pilih Foto atau Kamera HP</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          {capturedPreview ? (
            <>
              <button
                type="button"
                onClick={handleRetakePhoto}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Foto Ulang</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Gunakan Foto Ini</span>
              </button>
            </>
          ) : activeTab === 'camera' && !cameraError ? (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSnapPhoto}
                className="w-16 h-16 rounded-full border-4 border-amber-400 bg-amber-500 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 transition-transform active:scale-90 cursor-pointer disabled:opacity-50"
                title="Ambil Foto Lapangan"
              >
                {isProcessing ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-950" />
                ) : (
                  <Camera className="w-7 h-7 text-slate-950" />
                )}
              </button>
            </div>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
