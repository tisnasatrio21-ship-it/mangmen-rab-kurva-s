/**
 * Utility for stamping Time, GPS Coordinates, Project Info, and "app by Tisna" watermark onto photos
 */

export interface WatermarkOptions {
  projectName?: string;
  itemDescription?: string;
  locationName?: string;
  reporterName?: string;
  customWatermark?: string; // defaults to "app by Tisna"
  gpsCoords?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  customDate?: Date;
}

/**
 * Get current device GPS coordinates with high accuracy
 */
export async function getCurrentGpsPosition(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      (err) => {
        console.warn('Geolocation failed or denied:', err.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}

/**
 * Formats date and time in Indonesian format
 */
export function formatTimestamp(date: Date = new Date()): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const dayName = days[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${dayName}, ${day} ${monthName} ${year} • ${hours}:${minutes}:${seconds} WIB`;
}

/**
 * Stamps Watermark, Timestamp, GPS coordinates, and "app by Tisna" into an Image / Canvas
 * Returns compressed base64 JPEG data URL
 */
export async function applyWatermarkToImage(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  options: WatermarkOptions
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas 2d context');

  // Determine source dimensions
  let srcWidth = 0;
  let srcHeight = 0;

  if (imageSource instanceof HTMLVideoElement) {
    srcWidth = imageSource.videoWidth || 1280;
    srcHeight = imageSource.videoHeight || 720;
  } else if (imageSource instanceof HTMLImageElement) {
    srcWidth = imageSource.naturalWidth || imageSource.width || 1280;
    srcHeight = imageSource.naturalHeight || imageSource.height || 720;
  } else {
    srcWidth = imageSource.width;
    srcHeight = imageSource.height;
  }

  // Max dimension limit for performance & storage optimization (800px max width/height for compact ~50-70KB size)
  const maxDimension = 800;
  let targetWidth = srcWidth;
  let targetHeight = srcHeight;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
      targetHeight = maxDimension;
    }
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Draw base image
  ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

  // Dynamic sizing based on canvas scale (800 base)
  const scale = Math.max(0.75, targetWidth / 800);
  const baseFontSize = Math.max(11, Math.round(13 * scale));
  const smallFontSize = Math.max(9, Math.round(10.5 * scale));
  const padding = Math.max(10, Math.round(12 * scale));

  // Prepare text content
  const timestampStr = formatTimestamp(options.customDate || new Date());
  
  let gpsStr = '📍 GPS: Koordinat tidak terdeteksi';
  if (options.gpsCoords) {
    const lat = options.gpsCoords.latitude.toFixed(6);
    const lng = options.gpsCoords.longitude.toFixed(6);
    const acc = options.gpsCoords.accuracy ? ` (±${options.gpsCoords.accuracy}m)` : '';
    gpsStr = `📍 GPS: ${lat}, ${lng}${acc}`;
  } else if (options.locationName) {
    gpsStr = `📍 Lokasi: ${options.locationName}`;
  }

  const projectTitle = options.projectName ? `🏢 Proyek: ${options.projectName}` : '';
  const itemTitle = options.itemDescription ? `🔨 Pek: ${options.itemDescription}` : '';
  const reporterTitle = options.reporterName ? `👤 Pelapor: ${options.reporterName}` : '';
  const watermarkSignature = options.customWatermark || 'app by Tisna';

  // 1. Draw Bottom-Left Information Overlay Banner
  // Calculate overlay box height
  const lineHeight = baseFontSize * 1.45;
  const totalLines = [projectTitle, itemTitle, gpsStr, timestampStr, reporterTitle].filter(Boolean).length;
  const boxHeight = totalLines * lineHeight + padding * 1.6;
  const boxWidth = Math.min(targetWidth - padding * 2, Math.max(380 * scale, targetWidth * 0.75));

  const boxX = padding;
  const boxY = targetHeight - boxHeight - padding;

  // Semi-transparent dark background card with subtle rounded corners
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; // slate-900 with 85% opacity
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)'; // amber-500 border
  ctx.lineWidth = Math.max(1.5, 2 * scale);

  // Draw rounded rect
  const r = 8 * scale;
  ctx.beginPath();
  ctx.moveTo(boxX + r, boxY);
  ctx.lineTo(boxX + boxWidth - r, boxY);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + r);
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight - r);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - r, boxY + boxHeight);
  ctx.lineTo(boxX + r, boxY + boxHeight);
  ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - r);
  ctx.lineTo(boxX, boxY + r);
  ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Accent indicator bar on the left edge
  ctx.fillStyle = '#f59e0b'; // amber-500
  ctx.fillRect(boxX + 2, boxY + r, Math.max(3, 4 * scale), boxHeight - r * 2);

  // Draw Text Lines
  let currentY = boxY + padding + baseFontSize * 0.7;
  const textX = boxX + padding + Math.max(4, 6 * scale);

  // Line 1: Project Name (Bold Amber)
  if (projectTitle) {
    ctx.font = `bold ${baseFontSize}px "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#fbbf24'; // amber-400
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(truncateText(ctx, projectTitle, boxWidth - padding * 2), textX, currentY);
    currentY += lineHeight;
  }

  // Line 2: RAB Item Name (White bold)
  if (itemTitle) {
    ctx.font = `bold ${baseFontSize * 0.95}px "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillText(truncateText(ctx, itemTitle, boxWidth - padding * 2), textX, currentY);
    currentY += lineHeight;
  }

  // Line 3: GPS Coordinates (Emerald / Cyan)
  ctx.font = `${smallFontSize}px "Segoe UI", Roboto, monospace, sans-serif`;
  ctx.fillStyle = '#34d399'; // emerald-400
  ctx.fillText(truncateText(ctx, gpsStr, boxWidth - padding * 2), textX, currentY);
  currentY += lineHeight;

  // Line 4: Timestamp (White / Slate-200)
  ctx.font = `${smallFontSize}px "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = '#e2e8f0'; // slate-200
  ctx.fillText(`🕒 ${timestampStr}`, textX, currentY);
  currentY += lineHeight;

  // Line 5: Reporter / Inspector (Optional)
  if (reporterTitle) {
    ctx.font = `${smallFontSize * 0.9}px "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.fillText(truncateText(ctx, reporterTitle, boxWidth - padding * 2), textX, currentY);
  }

  ctx.restore();

  // 2. Draw Bottom-Right Watermark Badge ("app by Tisna")
  ctx.save();
  const wmFontSize = Math.max(10, Math.round(12 * scale));
  ctx.font = `bold ${wmFontSize}px "Segoe UI", Roboto, sans-serif`;
  
  const wmText = `⚡ ${watermarkSignature}`;
  const wmMetrics = ctx.measureText(wmText);
  const wmPaddingX = Math.max(8, 10 * scale);
  const wmPaddingY = Math.max(4, 6 * scale);
  const wmBoxWidth = wmMetrics.width + wmPaddingX * 2;
  const wmBoxHeight = wmFontSize + wmPaddingY * 2;
  
  const wmX = targetWidth - wmBoxWidth - padding;
  const wmY = targetHeight - wmBoxHeight - padding;

  // Watermark capsule background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)'; // amber border
  ctx.lineWidth = 1;
  
  // Capsule path
  ctx.beginPath();
  const wmR = wmBoxHeight / 2;
  ctx.arc(wmX + wmR, wmY + wmR, wmR, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.lineTo(wmX + wmBoxWidth - wmR, wmY);
  ctx.arc(wmX + wmBoxWidth - wmR, wmY + wmR, wmR, (3 * Math.PI) / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Watermark Text
  ctx.fillStyle = '#fef08a'; // yellow-200
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 3;
  ctx.fillText(wmText, wmX + wmPaddingX, wmY + wmBoxHeight - wmPaddingY * 0.9);
  ctx.restore();

  // 3. Compress and Return Data URL (JPEG Quality 0.65 for sharp detail and compact ~50-70KB file size)
  let result = canvas.toDataURL('image/jpeg', 0.65);
  if (result.length > 115000) {
    // If still large, compress slightly more to stay under ~70KB
    result = canvas.toDataURL('image/jpeg', 0.55);
  }
  return result;
}

/**
 * Compresses an arbitrary image data URL so it never exceeds targetMaxChars (default ~90KB)
 */
export async function compressDataUrl(
  dataUrl: string,
  maxWidth = 800,
  targetMaxChars = 90000
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  if (dataUrl.length <= targetMaxChars) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxWidth || h > maxWidth) {
        if (w >= h) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        } else {
          w = Math.round((w * maxWidth) / h);
          h = maxWidth;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      let res = canvas.toDataURL('image/jpeg', 0.62);
      if (res.length > targetMaxChars) {
        res = canvas.toDataURL('image/jpeg', 0.5);
      }
      resolve(res);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Optimizes all photos in a project to ensure it fits safely inside
 * Firestore's 1MB document limit and browser's LocalStorage.
 */
export async function optimizeProjectPhotos(project: any): Promise<{ project: any; didCompress: boolean }> {
  if (!project || !Array.isArray(project.dailyReports) || project.dailyReports.length === 0) {
    return { project, didCompress: false };
  }

  let didCompress = false;
  const updatedReports = await Promise.all(
    project.dailyReports.map(async (report: any) => {
      let updatedReport = { ...report };
      let reportChanged = false;

      // Check photoUrl
      if (report.photoUrl && report.photoUrl.startsWith('data:image') && report.photoUrl.length > 90000) {
        const compressed = await compressDataUrl(report.photoUrl);
        if (compressed !== report.photoUrl) {
          updatedReport.photoUrl = compressed;
          reportChanged = true;
          didCompress = true;
        }
      }

      // Check photoUrls array
      if (Array.isArray(report.photoUrls) && report.photoUrls.length > 0) {
        const compressedUrls = await Promise.all(
          report.photoUrls.map(async (url: string) => {
            if (url && url.startsWith('data:image') && url.length > 90000) {
              const comp = await compressDataUrl(url);
              if (comp !== url) didCompress = true;
              return comp;
            }
            return url;
          })
        );
        updatedReport.photoUrls = compressedUrls;
        if (!updatedReport.photoUrl && compressedUrls[0]) {
          updatedReport.photoUrl = compressedUrls[0];
        }
      }

      return updatedReport;
    })
  );

  if (didCompress) {
    return {
      project: {
        ...project,
        dailyReports: updatedReports,
      },
      didCompress: true,
    };
  }

  return { project, didCompress: false };
}

/**
 * Truncates text if it exceeds maximum pixel width on canvas
 */
function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  
  let truncated = text;
  while (truncated.length > 3 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * Converts a File or Blob into an HTMLImageElement
 */
export function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof Blob)) {
      reject(new Error('File foto tidak valid.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        if ('decode' in img && typeof img.decode === 'function') {
          try {
            await img.decode();
          } catch {
            // Ignore decode failures if image is already loaded
          }
        }
        resolve(img);
      };
      img.onerror = () => reject(new Error('Format gambar tidak dapat dibaca. Pastikan format JPG, PNG, atau WebP.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file dari penyimpanan perangkat.'));
    reader.readAsDataURL(file);
  });
}
