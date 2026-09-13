import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  MapPin,
  Clock,
  Check,
  AlertCircle,
  FlipHorizontal,
  Upload,
  Image as ImageIcon,
  Smartphone,
  Info,
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
  const [activeTab, setActiveTab] = useState<'camera' | 'gallery' | 'native'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

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
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

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
        throw new Error('Fitur live kamera tidak didukung di browser ini.');
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
      console.warn('Camera access error:', err);
      let msg = 'Tidak dapat mengakses live stream kamera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak oleh browser/perangkat. Anda tetap bisa menggunakan tab "Ambil dari Galeri" atau "Kamera HP (Native)".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Perangkat kamera tidak terdeteksi. Silakan gunakan tab "Ambil dari Galeri".';
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
    setProcessError(null);
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
    } catch (err: any) {
      console.error('Error stamping video snapshot:', err);
      setProcessError('Gagal mengambil foto dari kamera live. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Photo File Upload (From Gallery or Native Phone Camera)
  const handleFileProcess = async (file: File) => {
    setIsProcessing(true);
    setProcessError(null);
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
    } catch (err: any) {
      console.error('Error stamping uploaded file:', err);
      setProcessError(err.message || 'Gagal memproses file foto. Pastikan format JPG/PNG valid.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    e.target.value = '';
  };

  const handleNativeCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    e.target.value = '';
  };

  // Drag and drop support
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileProcess(file);
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
    setProcessError(null);
  };

  // Close and clean up
  const handleCloseModal = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCapturedPreview(null);
    setCameraError(null);
    setProcessError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">GPS Timestamp &amp; Watermark Photo</h3>
              <p className="text-[11px] text-amber-400 font-medium">
                Auto-Watermark: Waktu, Lokasi GPS, &amp; "app by Tisna"
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
          <div className="flex border-b border-slate-800 bg-slate-900/90 text-xs">
            {/* Tab 1: Live Viewfinder */}
            <button
              onClick={() => {
                setActiveTab('camera');
                setCameraError(null);
              }}
              className={`flex-1 py-2.5 px-3 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'camera'
                  ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Kamera</span>
            </button>

            {/* Tab 2: Gallery / Photo Roll */}
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex-1 py-2.5 px-3 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'gallery'
                  ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Galeri / Album</span>
            </button>

            {/* Tab 3: Native Mobile Camera Shutter */}
            <button
              onClick={() => setActiveTab('native')}
              className={`flex-1 py-2.5 px-3 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'native'
                  ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Kamera HP (Native)</span>
            </button>
          </div>
        )}

        {/* Hidden File Inputs */}
        {/* Gallery file picker (no capture attribute so gallery/photos app opens) */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleGalleryChange}
          className="hidden"
          id="gallery-input"
        />
        {/* Native phone camera picker (capture="environment" forces phone camera app) */}
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleNativeCameraChange}
          className="hidden"
          id="native-camera-input"
        />

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[320px]">
          {/* Processing / Loading State */}
          {isProcessing && (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-white">Memproses Foto &amp; Menempel Watermark...</p>
              <p className="text-xs text-slate-400">Menyematkan Waktu, Koordinat GPS, dan "app by Tisna"</p>
            </div>
          )}

          {/* Process Error Banner */}
          {processError && !isProcessing && (
            <div className="w-full mb-3 p-3 bg-rose-950/80 border border-rose-600/70 rounded-xl text-xs text-rose-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{processError}</span>
              </div>
              <button
                onClick={() => setProcessError(null)}
                className="text-rose-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 1. Captured Preview State (Result Verification) */}
          {!isProcessing && capturedPreview ? (
            <div className="w-full space-y-3 flex flex-col items-center">
              <div className="relative rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-lg w-full max-h-[58vh] bg-black flex items-center justify-center">
                <img
                  src={capturedPreview}
                  alt="Hasil Foto dengan Watermark GPS"
                  className="max-h-[56vh] w-full object-contain"
                />
                <div className="absolute top-2 left-2 bg-emerald-500 text-slate-950 font-extrabold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                  <Check className="w-3 h-3" />
                  Watermark &amp; GPS Berhasil Ditempel
                </div>
              </div>

              <div className="text-[11px] text-slate-300 text-center bg-slate-900/90 border border-slate-800 rounded-lg py-1 px-3">
                Pekerjaan: <strong>{itemDescription}</strong> • Proyek: <strong>{projectName}</strong>
              </div>
            </div>
          ) : !isProcessing && activeTab === 'camera' ? (
            /* 2. Live Camera Viewfinder State */
            <div className="w-full relative rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner aspect-[4/3] sm:aspect-[16/10] max-h-[52vh] flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center space-y-4 max-w-sm">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-white">Live Kamera Terhalang</h4>
                    <p className="text-xs text-rose-300/90 font-medium leading-relaxed">{cameraError}</p>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Buka Kamera HP Langsung</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('gallery')}
                      className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <span>Pilih dari Galeri Foto</span>
                    </button>
                  </div>
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
          ) : !isProcessing && activeTab === 'gallery' ? (
            /* 3. Upload from Gallery State (Clean photo library file picker) */
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="w-full text-center space-y-4 py-8 px-4 border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl bg-slate-900/50 transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-white">Pilih Foto dari Galeri / Album HP</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Pilih foto dari penyimpanan galeri HP atau komputer. Sistem akan otomatis mencetak tanggal, koordinat GPS, dan watermark "app by Tisna".
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Buka Galeri Foto</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500">Mendukung format JPG, PNG, WebP (Bisa Drag &amp; Drop)</p>
            </div>
          ) : !isProcessing && activeTab === 'native' ? (
            /* 4. Native Phone Camera Shutter */
            <div className="w-full text-center space-y-4 py-8 px-4 border-2 border-dashed border-amber-500/40 rounded-2xl bg-slate-900/50">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <Smartphone className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-white">Jepret Langsung dengan Kamera Bawaan HP</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Membuka aplikasi kamera bawaan smartphone Anda untuk mengambil foto fisik pekerjaan konstruksi dengan resolusi maksimal.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Aplikasi Kamera HP</span>
                </button>
              </div>
            </div>
          ) : null}
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
