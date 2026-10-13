import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Project, DailyReportItem } from '../types/project';
import { calculateSCurvePoints, getProjectKPI, formatIDR, formatPercent } from './calculator';

export interface ExportPdfOptions {
  chartElementId?: string;
  reportNotes?: string;
  targetDailyReportId?: string; // If specified, generate daily-specific inspection sheet
  targetDate?: string; // If specified, filter daily reports by this date
  includeSCurvePage?: boolean; // Default true: sertakan halaman khusus Kurva S resmi
  sCurveOnly?: boolean; // Jika true, hanya unduh 1 lembar Kurva S Landscape resmi
}

interface FittedImageBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Calculates symmetrical aspect-ratio preserving dimensions (contain)
 * centered within a given bounding box. Prevents photo distortion / stretching.
 */
function fitImageInBox(
  imgW: number,
  imgH: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
): FittedImageBox {
  if (!imgW || !imgH || imgW <= 0 || imgH <= 0) {
    return { x: boxX, y: boxY, w: boxW, h: boxH };
  }
  const boxRatio = boxW / boxH;
  const imgRatio = imgW / imgH;

  let renderW = boxW;
  let renderH = boxH;
  let renderX = boxX;
  let renderY = boxY;

  if (imgRatio > boxRatio) {
    // Image is wider than container: fit to width, center vertically
    renderW = boxW;
    renderH = boxW / imgRatio;
    renderY = boxY + (boxH - renderH) / 2;
  } else {
    // Image is taller than container: fit to height, center horizontally
    renderH = boxH;
    renderW = boxH * imgRatio;
    renderX = boxX + (boxW - renderW) / 2;
  }

  return {
    x: renderX,
    y: renderY,
    w: renderW,
    h: renderH,
  };
}

/**
 * Loads an image from URL/dataURL into HTMLImageElement or returns null if fails
 */
async function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('Failed to load image for PDF:', src?.substring?.(0, 50));
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Menggambar 1 Halaman Penuh Landscape A4 Khusus Kurva S dengan Standar Resmi Proyek:
 * 1. Banner Header & Strip Identitas Proyek
 * 2. Grafik Kurva S Vektor Presisi Tinggi (Rencana Biru vs Realisasi Oranye) dengan Penanda Cut-off
 * 3. Matriks Jadwal & Progres Mingguan (Weekly Tracking Schedule Matrix)
 * 4. Analisis Deviasi & Rekomendasi Teknis SCM / PUPR
 * 5. Lembar Pengesahan Resmi 3 Pihak (Kontraktor, Konsultan Pengawas MK, PPK / Owner)
 */
export function drawDedicatedSCurveLandscapePage(
  doc: jsPDF,
  project: Project,
  printDate: string
): void {
  const kpi = getProjectKPI(project);
  const sCurvePoints = calculateSCurvePoints(project);
  const isPos = kpi.deviation >= 0;

  // Colors
  const navyColor = [15, 23, 42]; // #0f172a
  const amberColor = [217, 119, 6]; // #d97706
  const blueColor = [29, 78, 216]; // #1d4ed8
  const emeraldColor = [5, 150, 105]; // #059669
  const roseColor = [225, 29, 72]; // #e11d48
  const slateDark = [51, 65, 85];
  const slateLight = [248, 250, 252];

  // 1. TOP HEADER BANNER (Full Width Landscape 297mm)
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(0, 0, 297, 13.5, 'F');

  doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
  doc.rect(0, 13.5, 297, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LEMBAR KURVA "S" & JADWAL PELAKSANAAN PEKERJAAN PROYEK', 14, 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text(
    'Standar Pengendalian Waktu & Biaya Proyek (Earned Value Management) • Sistem Monitoring RAB & Kurva S',
    14,
    11.8
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(251, 191, 36);
  doc.text(`TANGGAL CETAK: ${printDate.toUpperCase()}`, 283, 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(`Status Kinerja: ${kpi.statusText}`, 283, 11.8, { align: 'right' });

  // 2. PROJECT & EVALUATION METADATA STRIP
  const metaY = 17;
  const metaH = 11;
  doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
  doc.roundedRect(14, metaY, 269, metaH, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, metaY, 269, metaH, 1.5, 1.5, 'D');

  // Col 1: Proyek & Lokasi
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const truncatedProjName = project.name.length > 38 ? project.name.substring(0, 36) + '..' : project.name;
  doc.text(`PROYEK: ${truncatedProjName.toUpperCase()}`, 18, metaY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Lokasi: ${project.location || '-'} • Kode: ${project.code}`, 18, metaY + 8.5);

  // Col 2: Kontraktor & Konsultan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text(`Pelaksana: ${project.contractor || '-'}`, 98, metaY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Pengawas: Tim Supervisi Lapangan`, 98, metaY + 8.5);

  // Col 3: Nilai Kontrak & Durasi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text(`Nilai Kontrak: ${formatIDR(project.totalContractValue)}`, 168, metaY + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Target Waktu: ${project.totalPeriods} Minggu (${project.startDate} s/d ${project.endDate})`, 168, metaY + 8.5);

  // Col 4: Evaluasi & Deviasi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text(`Evaluasi: Minggu ke-${kpi.currentPeriodNumber}`, 238, metaY + 4.2);
  doc.setFontSize(7.5);
  doc.setTextColor(isPos ? emeraldColor[0] : roseColor[0], isPos ? emeraldColor[1] : roseColor[1], isPos ? emeraldColor[2] : roseColor[2]);
  const devText = isPos ? `+${kpi.deviation.toFixed(2)}% (Mendahului)` : `${kpi.deviation.toFixed(2)}% (Terlambat)`;
  doc.text(`Deviasi: ${devText}`, 238, metaY + 8.5);

  // 3. HIGH-PRECISION S-CURVE GRAPH CARD
  const chartCardY = 30;
  const chartCardH = 75;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, chartCardY, 269, chartCardH, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, chartCardY, 269, chartCardH, 1.5, 1.5, 'D');

  // Chart Title inside Card
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('GRAFIK KURVA "S" PROGRES KUMULATIF PEKERJAAN (RENCANA VS AKTUAL)', 18, chartCardY + 5.5);

  // Chart Legend (top-right inside card)
  let legX = 145;
  const legY = chartCardY + 4.5;
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');

  // Blue: Rencana
  doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.rect(legX, legY - 2.2, 5, 2.5, 'F');
  doc.setTextColor(30, 58, 138);
  doc.text('Rencana (Planned)', legX + 6.5, legY);

  // Amber: Realisasi
  legX += 34;
  doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
  doc.rect(legX, legY - 2.2, 5, 2.5, 'F');
  doc.setTextColor(146, 64, 14);
  doc.text('Realisasi (Actual)', legX + 6.5, legY);

  // Red dashed line: Cut-Off
  legX += 34;
  doc.setDrawColor(roseColor[0], roseColor[1], roseColor[2]);
  doc.setLineWidth(0.4);
  doc.line(legX, legY - 1, legX + 5, legY - 1);
  doc.setTextColor(roseColor[0], roseColor[1], roseColor[2]);
  doc.text(`Posisi Mg-${kpi.currentPeriodNumber}`, legX + 6.5, legY);

  // Graph plotting canvas boundaries
  const plotX0 = 28;
  const plotX1 = 276;
  const plotW = plotX1 - plotX0; // 248 mm wide
  const plotY0 = chartCardY + 9;  // 100% level
  const plotY1 = chartCardY + 68; // 0% level
  const plotH = plotY1 - plotY0;  // 59 mm high

  const totalPeriods = Math.max(1, project.totalPeriods || 12);
  const getY = (pct: number) => plotY1 - (Math.max(0, Math.min(100, pct)) / 100) * plotH;
  const getX = (p: number) => plotX0 + (p / totalPeriods) * plotW;

  // Horizontal Grid Lines (0%, 20%, 40%, 60%, 80%, 100%)
  const gridSteps = [0, 20, 40, 60, 80, 100];
  doc.setLineWidth(0.15);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');

  gridSteps.forEach((pct) => {
    const gy = getY(pct);
    doc.setDrawColor(pct === 0 || pct === 100 ? 203 : 241, pct === 0 || pct === 100 ? 213 : 245, pct === 0 || pct === 100 ? 225 : 249);
    doc.line(plotX0, gy, plotX1, gy);

    doc.setTextColor(100, 116, 139);
    doc.text(`${pct}%`, plotX0 - 2, gy + 1.5, { align: 'right' });
  });

  // Vertical Period Grid Lines & X-Axis Labels
  for (let p = 1; p <= totalPeriods; p++) {
    const px = getX(p);
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.15);
    doc.line(px, plotY0, px, plotY1);

    // Period label at bottom
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6);
    doc.text(`Mg-${p}`, px, plotY1 + 3.5, { align: 'center' });
  }

  // Draw Planned Cumulative S-Curve (Royal Blue)
  doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.setLineWidth(0.7);
  let prevX = getX(0);
  let prevY = getY(0);

  for (let p = 1; p <= totalPeriods; p++) {
    const pt = sCurvePoints.find((item) => item.periodNumber === p);
    const planVal = pt ? pt.plannedCumulative : 0;
    const curX = getX(p);
    const curY = getY(planVal);

    doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
    doc.setLineWidth(0.7);
    doc.line(prevX, prevY, curX, curY);

    // Blue Node
    doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
    doc.circle(curX, curY, 0.9, 'FD');

    prevX = curX;
    prevY = curY;
  }

  // Draw Actual Cumulative S-Curve (Amber / Gold)
  const activePeriods = sCurvePoints.filter(
    (pt) => pt.isCompletedPeriod && pt.actualCumulative !== null && pt.actualCumulative !== undefined
  );

  if (activePeriods.length > 0) {
    doc.setDrawColor(amberColor[0], amberColor[1], amberColor[2]);
    doc.setLineWidth(0.9);
    prevX = getX(0);
    prevY = getY(0);

    activePeriods.forEach((pt) => {
      const curX = getX(pt.periodNumber);
      const curY = getY(pt.actualCumulative);

      doc.setDrawColor(amberColor[0], amberColor[1], amberColor[2]);
      doc.setLineWidth(0.9);
      doc.line(prevX, prevY, curX, curY);

      // Amber Node
      doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
      doc.circle(curX, curY, 1.2, 'FD');

      prevX = curX;
      prevY = curY;
    });

    // Highlight Cut-off Period on Graph
    const cutOffX = getX(kpi.currentPeriodNumber);
    doc.setDrawColor(roseColor[0], roseColor[1], roseColor[2]);
    doc.setLineWidth(0.35);
    doc.line(cutOffX, plotY0, cutOffX, plotY1);

    // Current Actual Progress Callout Badge
    const lastPt = activePeriods[activePeriods.length - 1];
    if (lastPt) {
      const badgeX = Math.min(plotX1 - 32, Math.max(plotX0 + 5, getX(lastPt.periodNumber) - 15));
      const badgeY = Math.max(plotY0 + 2, getY(lastPt.actualCumulative) - 7);

      doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
      doc.roundedRect(badgeX, badgeY, 30, 5.2, 1, 1, 'F');
      doc.setTextColor(251, 191, 36);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(`Aktual: ${lastPt.actualCumulative.toFixed(2)}%`, badgeX + 15, badgeY + 3.8, { align: 'center' });
    }
  }

  // 4. WEEKLY PROGRESS SCHEDULE MATRIX TABLE (Matriks Jadwal Progres Mingguan)
  const tableY = 107;
  const labelColW = 39;
  const remainingTableW = 269 - labelColW;
  const periodColW = Math.max(6, remainingTableW / totalPeriods);

  const rows = [
    { label: 'Rencana Mingguan (%)', field: 'plannedIncremental', format: (val: number) => `${val.toFixed(2)}%` },
    { label: 'Kumulatif Rencana (%)', field: 'plannedCumulative', format: (val: number) => `${val.toFixed(2)}%`, bold: true },
    { label: 'Realisasi Mingguan (%)', field: 'actualIncremental', format: (val: number, pt: any) => pt.isCompletedPeriod ? `${val.toFixed(2)}%` : '-' },
    { label: 'Kumulatif Realisasi (%)', field: 'actualCumulative', format: (val: number, pt: any) => pt.isCompletedPeriod && val !== null ? `${val.toFixed(2)}%` : '-', bold: true, isActual: true },
    { label: 'Deviasi Progres (+/- %)', field: 'deviation', format: (val: number, pt: any) => pt.isCompletedPeriod ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}%` : '-', bold: true, isDev: true },
  ];

  // Header Row (Minggu Ke)
  const headerH = 5.2;
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(14, tableY, labelColW, headerH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('Uraian / Minggu Ke-', 16, tableY + 3.6);

  for (let p = 1; p <= totalPeriods; p++) {
    const colX = 14 + labelColW + (p - 1) * periodColW;
    const isCurrent = p === kpi.currentPeriodNumber;
    doc.setFillColor(isCurrent ? 217 : navyColor[0], isCurrent ? 119 : navyColor[1], isCurrent ? 6 : navyColor[2]);
    doc.rect(colX, tableY, periodColW, headerH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(totalPeriods > 16 ? 5.5 : 6.2);
    doc.text(`W${p}`, colX + periodColW / 2, tableY + 3.6, { align: 'center' });
  }

  // Data Rows
  let curRowY = tableY + headerH;
  const rowH = 4.6;

  rows.forEach((rowMeta, rIdx) => {
    const isEven = rIdx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(14, curRowY, labelColW, rowH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(14, curRowY + rowH, 283, curRowY + rowH);

    doc.setFont('helvetica', rowMeta.bold ? 'bold' : 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(rowMeta.isActual ? 180 : rowMeta.isDev ? 15 : 51, rowMeta.isActual ? 83 : rowMeta.isDev ? 23 : 65, rowMeta.isActual ? 9 : rowMeta.isDev ? 42 : 85);
    doc.text(rowMeta.label, 16, curRowY + 3.3);

    for (let p = 1; p <= totalPeriods; p++) {
      const colX = 14 + labelColW + (p - 1) * periodColW;
      const pt = sCurvePoints.find((item) => item.periodNumber === p);
      const val = pt ? (pt as any)[rowMeta.field] : 0;
      const formatted = pt ? rowMeta.format(val, pt) : '-';

      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(colX, curRowY, periodColW, rowH, 'F');

      if (rowMeta.isDev && pt && pt.isCompletedPeriod) {
        const isDPos = val >= 0;
        doc.setTextColor(isDPos ? 5 : 225, isDPos ? 150 : 29, isDPos ? 105 : 72);
        doc.setFont('helvetica', 'bold');
      } else if (rowMeta.isActual && pt && pt.isCompletedPeriod) {
        doc.setTextColor(180, 83, 9);
        doc.setFont('helvetica', 'bold');
      } else if (rowMeta.bold) {
        doc.setTextColor(30, 58, 138);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
      }

      doc.setFontSize(totalPeriods > 16 ? 5 : 6);
      doc.text(formatted, colX + periodColW / 2, curRowY + 3.3, { align: 'center' });
    }

    curRowY += rowH;
  });

  // 5. BOTTOM SECTION: VARIANCE EVALUATION (LEFT) & TRIPARTITE SIGNOFF (RIGHT)
  const bottomY = 138;
  const bottomH = 43;

  // Left Card: Analisis & Catatan Evaluasi Kurva S
  const evalCardW = 110;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, bottomY, evalCardW, bottomH, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, bottomY, evalCardW, bottomH, 1.5, 1.5, 'D');

  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(14, bottomY, evalCardW, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('CATATAN EVALUASI & PENGENDALIAN KINERJA PROYEK', 18, bottomY + 3.8);

  doc.setFontSize(6.8);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`• Status Evaluasi Minggu ke-${kpi.currentPeriodNumber}:`, 18, bottomY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `  Target Rencana: ${formatPercent(kpi.currentPlanned)} | Realisasi: ${formatPercent(kpi.currentActual)} | Deviasi: ${isPos ? '+' : ''}${kpi.deviation.toFixed(2)}%`,
    18,
    bottomY + 14
  );

  doc.setFont('helvetica', 'bold');
  doc.text('• Rekomendasi Teknis Pengawasan:', 18, bottomY + 19);
  doc.setFont('helvetica', 'normal');

  let recommendationText = '';
  if (isPos) {
    recommendationText =
      'Kinerja fisik berjalan melampaui target rencana. Pengawas menyarankan kontraktor mempertahankan ritme pasokan material, koordinasi tenaga kerja, dan kesiapan gambar kerja lanjutan.';
  } else if (kpi.deviation >= -5) {
    recommendationText =
      'Terjadi keterlambatan minor (< 5%). Diperlukan penambahan jam lembur terarah, pengamanan material lintasan kritis, serta monitoring harian untuk mencegah eskalasi deviasi negatif.';
  } else {
    recommendationText =
      'PERINGATAN SCM (Deviasi Kritis > -5%): Kontraktor diwajibkan menyusun Catch-up Schedule resmi, menambah shift kerja dan alat berat sesuai instruksi Direksi Pengawas/PUPR.';
  }

  const splitRec = doc.splitTextToSize(recommendationText, evalCardW - 8);
  doc.text(splitRec, 18, bottomY + 23);

  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '* Sesuai pedoman teknis evaluasi berkala pelaksanaan pekerjaan konstruksi.',
    18,
    bottomY + bottomH - 3
  );

  // Right Card: Lembar Pengesahan 3 Pihak (Tripartite Signature Block)
  const sigCardX = 128;
  const sigCardW = 155;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(sigCardX, bottomY, sigCardW, bottomH, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(sigCardX, bottomY, sigCardW, bottomH, 1.5, 1.5, 'D');

  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(sigCardX, bottomY, sigCardW, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('LEMBAR PENGESAHAN EVALUASI LAPORAN (3 PIHAK)', sigCardX + 4, bottomY + 3.8);

  const sigColW = (sigCardW - 12) / 3;
  const sigPositions = [
    {
      title: 'Disiapkan Oleh:',
      role: 'Kontraktor Pelaksana',
      name: project.contractor || 'PT. Kontraktor Pelaksana',
      position: 'Project Manager / Site Manager',
      x: sigCardX + 4,
    },
    {
      title: 'Diperiksa & Disetujui:',
      role: 'Konsultan Pengawas / MK',
      name: 'Tim Supervisi Lapangan',
      position: 'Site Engineer / Team Leader',
      x: sigCardX + 4 + sigColW + 2,
    },
    {
      title: 'Mengetahui & Menyetujui:',
      role: 'Pengguna Jasa / Owner',
      name: project.client || 'Pejabat Pembuat Komitmen (PPK)',
      position: 'Direksi Teknis / PPK',
      x: sigCardX + 4 + (sigColW + 2) * 2,
    },
  ];

  sigPositions.forEach((col) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(col.title, col.x, bottomY + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.text(col.role, col.x, bottomY + 13.5);

    // Signature Line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(col.x, bottomY + 33, col.x + sigColW - 2, bottomY + 33);

    // Signee Name & Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    const signeeName = col.name.length > 24 ? col.name.substring(0, 22) + '..' : col.name;
    doc.text(signeeName, col.x, bottomY + 37);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(col.position, col.x, bottomY + 40.5);
  });

  // Footer on S-Curve Page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Dokumen Pengendalian Proyek Resmi • ${project.name} • Lembar Kurva S A4 Landscape • Dicetak: ${printDate}`,
    148,
    205,
    { align: 'center' }
  );
}

/**
 * Generate ONLY the official 1-page S-Curve sheet in A4 Landscape format
 */
export async function generateStandaloneSCurvePdf(
  project: Project,
  options: { chartElementId?: string } = {}
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  drawDedicatedSCurveLandscapePage(doc, project, printDate);

  const cleanName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Lembar_Kurva_S_${cleanName}_${project.code}.pdf`);
}

/**
 * Generate a clean, professional PDF Executive Progress Report with Photos & Daily Inspections
 */
export async function generateProjectPdfReport(
  project: Project,
  options: ExportPdfOptions = {}
): Promise<void> {
  // If user requested only the S-Curve sheet, route directly to standalone generator
  if (options.sCurveOnly) {
    return generateStandaloneSCurvePdf(project, options);
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const kpi = getProjectKPI(project);
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate Category Progress
  const itemActualVolMap = new Map<string, number>();
  project.dailyReports.forEach((r) => {
    const cur = itemActualVolMap.get(r.rabItemId) || 0;
    itemActualVolMap.set(r.rabItemId, cur + r.volumeProgress);
  });

  const categoryMap: Record<
    string,
    { totalWeight: number; actualWeight: number; count: number }
  > = {};

  project.rabItems.forEach((item) => {
    if (!categoryMap[item.category]) {
      categoryMap[item.category] = { totalWeight: 0, actualWeight: 0, count: 0 };
    }
    const cat = categoryMap[item.category];
    cat.totalWeight += item.weightPercentage;
    cat.count += 1;

    const doneVol = itemActualVolMap.get(item.id) || 0;
    const ratio = Math.min(1, doneVol / (item.volume || 1));
    cat.actualWeight += item.weightPercentage * ratio;
  });

  // Color Palette Constants
  const navyColor = [15, 23, 42]; // #0f172a
  const amberColor = [217, 119, 6]; // #d97706
  const slateDark = [51, 65, 85];
  const slateLight = [241, 245, 249];

  let currentY = 15;

  // --- PAGE 1: HEADER & TITLE BANNER ---
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
  doc.rect(0, 24, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('LAPORAN EKSEKUTIF PROGRES PROYEK KONSTRUKSI', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Sistem Monitoring RAB & Kurva S • Tanggal Cetak: ${printDate}`, 14, 19);

  currentY = 32;

  // --- PROJECT METADATA CARD ---
  doc.setFillColor(slateLight[0], slateLight[1], slateLight[2]);
  doc.roundedRect(14, currentY, 182, 38, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, 182, 38, 2, 2, 'D');

  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(project.name.toUpperCase(), 18, currentY + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

  // Col 1
  doc.text(`Kode Proyek: ${project.code}`, 18, currentY + 14);
  doc.text(`Pemilik (Client/Owner): ${project.client}`, 18, currentY + 20);
  doc.text(`Kontraktor / Pelaksana: ${project.contractor || '-'}`, 18, currentY + 26);
  doc.text(`Lokasi Proyek: ${project.location}`, 18, currentY + 32);

  // Col 2
  doc.text(`Total Nilai Kontrak: ${formatIDR(project.totalContractValue)}`, 110, currentY + 14);
  doc.text(`Tanggal Mulai: ${project.startDate}`, 110, currentY + 20);
  doc.text(`Target Selesai: ${project.endDate}`, 110, currentY + 26);
  doc.text(`Durasi Proyek: ${project.totalPeriods} Minggu (Minggu ke-${kpi.currentPeriodNumber})`, 110, currentY + 32);

  currentY += 44;

  // --- EXECUTIVE KPI SCORECARD ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('RINGKASAN KINERJA PROGRES (KPI)', 14, currentY);

  currentY += 4;

  const cardWidth = 43;
  const cardHeight = 26;
  const cardGap = 3.3;

  // Card 1: Rencana
  let cardX = 14;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'D');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PROGRES RENCANA', cardX + 3, currentY + 6);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(formatPercent(kpi.currentPlanned), cardX + 3, currentY + 14);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Target Mg-${kpi.currentPeriodNumber}`, cardX + 3, currentY + 21);

  // Card 2: Realisasi
  cardX += cardWidth + cardGap;
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(252, 211, 77);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'D');
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14);
  doc.text('REALISASI AKTUAL', cardX + 3, currentY + 6);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(formatPercent(kpi.currentActual), cardX + 3, currentY + 14);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(146, 64, 14);
  doc.text('Akumulasi Fisik', cardX + 3, currentY + 21);

  // Card 3: Deviasi
  cardX += cardWidth + cardGap;
  const isPos = kpi.deviation >= 0;
  const devBg = isPos ? [236, 253, 245] : [254, 242, 242];
  const devBorder = isPos ? [167, 243, 208] : [254, 202, 202];
  const devText = isPos ? [4, 120, 87] : [185, 28, 28];

  doc.setFillColor(devBg[0], devBg[1], devBg[2]);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(devBorder[0], devBorder[1], devBorder[2]);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'D');
  doc.setFontSize(7.5);
  doc.setTextColor(devText[0], devText[1], devText[2]);
  doc.text('DEVIASI PROGRESS', cardX + 3, currentY + 6);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const devStr = isPos ? `+${kpi.deviation.toFixed(2)}%` : `${kpi.deviation.toFixed(2)}%`;
  doc.text(devStr, cardX + 3, currentY + 14);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(isPos ? 'Di Atas Jadwal' : 'Terlambat', cardX + 3, currentY + 21);

  // Card 4: Nilai Fisik Realisasi
  cardX += cardWidth + cardGap;
  const actualEarnedValue = (kpi.currentActual / 100) * project.totalContractValue;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'D');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('NILAI TERREALISASI', cardX + 3, currentY + 6);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatIDR(actualEarnedValue), cardX + 3, currentY + 14);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${kpi.completedItemsCount}/${kpi.totalItemsCount} Item Selesai`, cardX + 3, currentY + 21);

  currentY += cardHeight + 8;

  // --- CATEGORY PROGRESS SUMMARY TABLE (ON PAGE 1 WITH FULL BREATHING ROOM) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('RINGKASAN PROGRES PER KATEGORI PEKERJAAN', 14, currentY);
  currentY += 4;

  // Table Header
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(14, currentY, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  doc.text('Kategori Pekerjaan', 17, currentY + 4.8);
  doc.text('Item', 90, currentY + 4.8, { align: 'center' });
  doc.text('Bobot RAB %', 115, currentY + 4.8, { align: 'right' });
  doc.text('Realisasi %', 145, currentY + 4.8, { align: 'right' });
  doc.text('Capaian Fisik', 188, currentY + 4.8, { align: 'right' });

  currentY += 7;

  // Category Rows
  const catEntries = Object.entries(categoryMap);
  catEntries.forEach(([catName, stat], idx) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(14, currentY, 182, 6.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(catName, 17, currentY + 4.3);

    doc.setFont('helvetica', 'normal');
    doc.text(`${stat.count} item`, 90, currentY + 4.3, { align: 'center' });
    doc.text(formatPercent(stat.totalWeight), 115, currentY + 4.3, { align: 'right' });
    doc.text(formatPercent(stat.actualWeight), 145, currentY + 4.3, { align: 'right' });

    const pctDone = stat.totalWeight > 0 ? (stat.actualWeight / stat.totalWeight) * 100 : 0;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(pctDone >= 100 ? 16 : 217, pctDone >= 100 ? 185 : 119, pctDone >= 100 ? 129 : 6);
    doc.text(`${pctDone.toFixed(1)}%`, 188, currentY + 4.3, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.line(14, currentY + 6.5, 196, currentY + 6.5);

    currentY += 6.5;
  });

  // Footer text on Page 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Halaman 1 • Ringkasan Eksekutif & Bobot Kategori • ${project.name} • Dicetak: ${printDate}`,
    105,
    288,
    { align: 'center' }
  );

  // --- PAGE 2: DEDICATED OFFICIAL S-CURVE & SCHEDULE TRACKING MATRIX (LANDSCAPE A4) ---
  if (options.includeSCurvePage !== false) {
    doc.addPage('a4', 'landscape');
    drawDedicatedSCurveLandscapePage(doc, project, printDate);
  }

  // --- PAGE 3: DETAIL ITEM PEKERJAAN & REALISASI (RETURN TO PORTRAIT) ---
  doc.addPage('a4', 'portrait');
  currentY = 15;

  // Header on Page 3
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(0, 0, 210, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`RINCIAN ITEM PEKERJAAN & REALISASI VOLUME - ${project.name}`, 14, 8);

  currentY = 18;

  const renderDetailTableHeader = (yPos: number) => {
    doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.rect(14, yPos, 182, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    doc.text('No', 17, yPos + 4.8);
    doc.text('Kode', 25, yPos + 4.8);
    doc.text('Uraian Pekerjaan', 40, yPos + 4.8);
    doc.text('Sat', 105, yPos + 4.8, { align: 'center' });
    doc.text('Vol RAB', 123, yPos + 4.8, { align: 'right' });
    doc.text('Vol Terlapor', 145, yPos + 4.8, { align: 'right' });
    doc.text('Bobot %', 165, yPos + 4.8, { align: 'right' });
    doc.text('Status', 188, yPos + 4.8, { align: 'right' });
  };

  renderDetailTableHeader(currentY);
  currentY += 7;

  project.rabItems.forEach((item, idx) => {
    if (currentY > 265) {
      doc.addPage('a4', 'portrait');
      currentY = 15;
      renderDetailTableHeader(currentY);
      currentY += 7;
    }

    const actualVol = itemActualVolMap.get(item.id) || 0;
    const ratio = Math.min(1, actualVol / (item.volume || 1));
    const pctDone = ratio * 100;

    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(14, currentY, 182, 6, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    doc.text(`${idx + 1}`, 17, currentY + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(item.code, 25, currentY + 4.2);

    doc.setFont('helvetica', 'normal');
    const truncatedDesc =
      item.description.length > 38 ? item.description.substring(0, 36) + '..' : item.description;
    doc.text(truncatedDesc, 40, currentY + 4.2);

    doc.text(item.unit, 105, currentY + 4.2, { align: 'center' });
    doc.text(`${item.volume}`, 123, currentY + 4.2, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(`${actualVol.toFixed(1)}`, 145, currentY + 4.2, { align: 'right' });

    doc.setTextColor(51, 65, 85);
    doc.text(formatPercent(item.weightPercentage), 165, currentY + 4.2, { align: 'right' });

    doc.setTextColor(
      pctDone >= 100 ? 16 : pctDone > 0 ? 217 : 100,
      pctDone >= 100 ? 185 : pctDone > 0 ? 119 : 116,
      pctDone >= 100 ? 129 : pctDone > 0 ? 6 : 139
    );
    doc.text(
      pctDone >= 100 ? 'Selesai' : pctDone > 0 ? `${pctDone.toFixed(0)}%` : 'Belum',
      188,
      currentY + 4.2,
      { align: 'right' }
    );

    doc.setDrawColor(241, 245, 249);
    doc.line(14, currentY + 6, 196, currentY + 6);

    currentY += 6;
  });

  // --- SECTION: LAMPIRAN DOKUMENTASI FOTO LAPANGAN & LAPORAN HARIAN ---
  // Filter reports with photos or all reports if targeted
  const reportsWithPhotos = project.dailyReports.filter(
    (r) => Boolean(r.photoUrl || (Array.isArray(r.photoUrls) && r.photoUrls.length > 0))
  );
  const reportsToDisplay = options.targetDailyReportId
    ? project.dailyReports.filter((r) => r.id === options.targetDailyReportId)
    : options.targetDate
    ? project.dailyReports.filter((r) => r.date === options.targetDate)
    : project.dailyReports;

  // If there are reports with photos or daily entries, attach Photo Documentation Pages
  if (reportsToDisplay.length > 0) {
    doc.addPage('a4', 'portrait');
    currentY = 15;

    // Header Banner
    doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.rect(0, 0, 210, 12, 'F');
    doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
    doc.rect(0, 12, 210, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`LAMPIRAN DOKUMENTASI FOTO & LAPORAN HARIAN LAPANGAN`, 14, 8);

    currentY = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.text('DOKUMENTASI FOTO FISIK PEKERJAAN TERBARU', 14, currentY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text('Foto dilengkapi dengan Timestamp waktu, Koordinat GPS Lapangan, dan Watermark Inspeksi.', 14, currentY + 4.5);

    currentY += 10;

    // Sort newest first
    const sortedReports = [...reportsToDisplay].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (let i = 0; i < sortedReports.length; i++) {
      const report = sortedReports[i];
      const photoUrls = Array.isArray(report.photoUrls) && report.photoUrls.length > 0
        ? report.photoUrls.filter(Boolean)
        : (report.photoUrl ? [report.photoUrl] : []);
      const hasPhoto = photoUrls.length > 0;

      // Preload images to determine exact natural aspect ratios and dimensions
      const loadedPhotos = await Promise.all(
        photoUrls.slice(0, 4).map(async (url) => {
          const img = await loadImg(url);
          return {
            url,
            img,
            w: img ? (img.naturalWidth || img.width || 800) : 800,
            h: img ? (img.naturalHeight || img.height || 600) : 600,
          };
        })
      );

      // Determine text heights with full width (170mm) across the 182mm card
      const textColW = 170;
      const itemTitle = `Tgl: ${report.date} (Minggu ke-${report.periodNumber}) • [${report.rabItemCode || 'RAB'}] ${report.rabItemDescription}`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      const titleLines = doc.splitTextToSize(itemTitle, textColW).slice(0, 2);
      const titleH = titleLines.length * 4.2;

      const subInfo = `Pelapor: ${report.reporterName || 'Site Staff'} | Vol: ${report.volumeProgress} unit (+${formatPercent(report.weightAdded)}) | Lokasi: ${project.location || '-'}`;
      const subInfoLines = doc.splitTextToSize(subInfo, textColW).slice(0, 1);
      const subInfoH = 4.2;

      const safeNotes = report.notes ? `Catatan: "${report.notes.trim()}"` : '';
      const notesLines = safeNotes ? doc.splitTextToSize(safeNotes, textColW - 6).slice(0, 2) : [];
      const notesH = notesLines.length > 0 ? notesLines.length * 3.8 + 4 : 0;

      const headerContentH = 6 + titleH + 1.5 + subInfoH + (notesH > 0 ? notesH + 2 : 0) + 2;

      // Symmetrical photo block layout calculations
      let photoBlockH = 0;
      const numPhotos = loadedPhotos.length;

      if (numPhotos === 1) {
        photoBlockH = 68 + 7; // 68mm photo box + 7mm caption & spacing
      } else if (numPhotos === 2) {
        photoBlockH = 56 + 7; // 56mm photo box + 7mm caption & spacing
      } else if (numPhotos >= 3) {
        photoBlockH = 48 * 2 + 7 * 2 + 4; // 2 rows of 48mm + captions + gap
      }

      const totalCardH = headerContentH + (hasPhoto ? photoBlockH + 4 : 0) + 3;

      // Smart page break before card
      if (currentY + totalCardH > 275) {
        doc.addPage('a4', 'portrait');
        currentY = 15;
        doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
        doc.rect(0, 0, 210, 12, 'F');
        doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
        doc.rect(0, 12, 210, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`LAMPIRAN DOKUMENTASI FOTO (LANJUTAN) - ${project.name}`, 14, 8);
        currentY = 20;
      }

      // Draw Container Card
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, currentY, 182, totalCardH, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, currentY, 182, totalCardH, 2, 2, 'D');

      // Left Accent Strip
      doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
      doc.rect(14, currentY, 3, totalCardH, 'F');

      // Render Title Lines
      let cursorY = currentY + 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
      doc.text(titleLines, 21, cursorY);
      cursorY += titleH + 1;

      // Render Sub Info
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(subInfoLines, 21, cursorY);
      cursorY += subInfoH + 1.5;

      // Render Notes Callout if exists
      if (notesLines.length > 0) {
        const notesBoxY = cursorY;
        const notesBoxH = notesLines.length * 3.8 + 3;
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(21, notesBoxY, 170, notesBoxH, 1, 1, 'F');
        doc.setDrawColor(252, 211, 77);
        doc.roundedRect(21, notesBoxY, 170, notesBoxH, 1, 1, 'D');

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.2);
        doc.setTextColor(146, 64, 14);
        doc.text(notesLines, 23, notesBoxY + 3.2);
        cursorY += notesBoxH + 2.5;
      }

      // Render Symmetrical Photos
      if (hasPhoto && numPhotos > 0) {
        const photoStartY = cursorY + 1;

        if (numPhotos === 1) {
          // 1 Single Centered Symmetrical Photo
          const p = loadedPhotos[0];
          const boxW = 140;
          const boxH = 68;
          const boxX = 14 + (182 - boxW) / 2; // Exactly 35mm (centered)
          const boxY = photoStartY;

          // Background matting frame
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, 'D');

          // Fit image preserving aspect ratio
          const fitted = fitImageInBox(p.w, p.h, boxX, boxY, boxW, boxH);
          try {
            doc.addImage(p.img || p.url, 'JPEG', fitted.x, fitted.y, fitted.w, fitted.h);
          } catch (e) {
            console.warn('Failed rendering single photo:', e);
          }

          // Caption underneath centered
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.8);
          doc.setTextColor(146, 64, 14);
          doc.text(
            '✓ Foto Dokumentasi Lapangan • GPS & Timestamp Watermark Terverifikasi (app by Tisna)',
            105,
            boxY + boxH + 4.2,
            { align: 'center' }
          );
        } else if (numPhotos === 2) {
          // 2 Symmetrical Columns Side-by-Side
          const boxW = 82;
          const boxH = 56;
          const gap = 6;
          const startX = 21; // 21 + 82 = 103; 103 + 6 = 109; 109 + 82 = 191 mm (centered)
          const boxY = photoStartY;

          for (let pIdx = 0; pIdx < 2; pIdx++) {
            const p = loadedPhotos[pIdx];
            const pX = startX + pIdx * (boxW + gap);

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(pX, boxY, boxW, boxH, 1.5, 1.5, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(pX, boxY, boxW, boxH, 1.5, 1.5, 'D');

            const fitted = fitImageInBox(p.w, p.h, pX, boxY, boxW, boxH);
            try {
              doc.addImage(p.img || p.url, 'JPEG', fitted.x, fitted.y, fitted.w, fitted.h);
            } catch (e) {
              console.warn('Failed rendering photo #', pIdx, e);
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(146, 64, 14);
            const cap = pIdx === 0 ? 'Foto #1 • Dokumentasi Fisik Lapangan' : 'Foto #2 • Detail Pelaksanaan / Sudut Lain';
            doc.text(cap, pX + boxW / 2, boxY + boxH + 4, { align: 'center' });
          }

          if (photoUrls.length > 2) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6);
            doc.setTextColor(100, 116, 139);
            doc.text(`(+${photoUrls.length - 2} foto lainnya tersimpan dalam sistem)`, 105, boxY + boxH + 7.5, { align: 'center' });
          }
        } else {
          // 3 or 4 Photos: Symmetrical 2x2 Grid
          const boxW = 82;
          const boxH = 48;
          const gapX = 6;
          const gapY = 8;
          const startX = 21;

          for (let pIdx = 0; pIdx < Math.min(loadedPhotos.length, 4); pIdx++) {
            const col = pIdx % 2;
            const row = Math.floor(pIdx / 2);
            const pX = startX + col * (boxW + gapX);
            const pY = photoStartY + row * (boxH + gapY);
            const p = loadedPhotos[pIdx];

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(pX, pY, boxW, boxH, 1.5, 1.5, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(pX, pY, boxW, boxH, 1.5, 1.5, 'D');

            const fitted = fitImageInBox(p.w, p.h, pX, pY, boxW, boxH);
            try {
              doc.addImage(p.img || p.url, 'JPEG', fitted.x, fitted.y, fitted.w, fitted.h);
            } catch (e) {
              console.warn('Failed rendering grid photo #', pIdx, e);
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.2);
            doc.setTextColor(146, 64, 14);
            doc.text(`Foto #${pIdx + 1} • Dokumentasi Lapangan`, pX + boxW / 2, pY + boxH + 3.8, { align: 'center' });
          }

          if (photoUrls.length > 4) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6);
            doc.setTextColor(100, 116, 139);
            doc.text(`* Menampilkan 4 foto utama. ${photoUrls.length - 4} foto tambahan lainnya tercatat dalam sistem.`, 105, photoStartY + 2 * (boxH + gapY) + 1, { align: 'center' });
          }
        }
      }

      currentY += totalCardH + 5;
    }
  }

  // --- SIGN-OFF / APPROVAL BLOCK (Symmetrical 3 Columns) ---
  if (currentY > 230) {
    doc.addPage('a4', 'portrait');
    currentY = 20;
  }

  currentY += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY, 196, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('LEMBAR VERIFIKASI & PERSETUJUAN LAPORAN PROGRES', 14, currentY);

  currentY += 8;

  const colW = 56;
  // Box 1: Owner (14 to 70)
  doc.setFontSize(8);
  doc.text('Pemilik Proyek (Owner):', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(project.client || '-', 14, currentY + 4);
  doc.line(14, currentY + 20, 14 + colW, currentY + 20);
  doc.text('Tanggal & Tanda Tangan', 14, currentY + 24);

  // Box 2: Konsultan Supervisi (77 to 133)
  doc.setFont('helvetica', 'bold');
  doc.text('Konsultan Pengawas / MK:', 77, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text('Tim Supervisi Lapangan', 77, currentY + 4);
  doc.line(77, currentY + 20, 77 + colW, currentY + 20);
  doc.text('Tanggal & Tanda Tangan', 77, currentY + 24);

  // Box 3: Kontraktor (140 to 196)
  doc.setFont('helvetica', 'bold');
  doc.text('Kontraktor Pelaksana:', 140, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(project.contractor || 'Project Manager', 140, currentY + 4);
  doc.line(140, currentY + 20, 140 + colW, currentY + 20);
  doc.text('Tanggal & Tanda Tangan', 140, currentY + 24);

  // Add Page Numbers footer to all pages (dynamically centered for portrait & landscape)
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    const pW = doc.internal.pageSize.getWidth();
    const pH = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Halaman ${page} dari ${totalPages} • Laporan Progres Proyek ${project.code}`,
      pW / 2,
      pH - 6.5,
      { align: 'center' }
    );
  }

  // Save the PDF
  const safeFilename = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Laporan_Progres_${safeFilename}_Mg${kpi.currentPeriodNumber}.pdf`);
}

/**
 * Generate a dedicated Single-Day / Daily Inspection Sheet PDF with large Photos
 */
export async function generateDailyReportPdf(
  project: Project,
  dailyReport: DailyReportItem
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navyColor = [15, 23, 42];
  const amberColor = [217, 119, 6];

  // Header Banner
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
  doc.rect(0, 24, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LEMBAR LAPORAN HARIAN & DOKUMENTASI INSPEKSI FISIK', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Proyek: ${project.name} (${project.code}) • Tanggal: ${dailyReport.date}`, 14, 19);

  let currentY = 30;

  // 1. Metadata Card (Item Pekerjaan & Detail Progres)
  // Dynamic Height calculation to eliminate ANY text overlap even on very long item descriptions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const rawTitle = `ITEM PEKERJAAN: [${dailyReport.rabItemCode || 'RAB'}] ${dailyReport.rabItemDescription}`;
  const titleLines: string[] = doc.splitTextToSize(rawTitle, 172);
  const titleLineH = 4.6;
  const titleBlockH = titleLines.length * titleLineH;

  // Info Grid: 3 rows with 5.2mm spacing
  const infoRowH = 5.2;
  const infoBlockH = 3 * infoRowH;

  const metaCardPaddingTop = 6;
  const metaCardPaddingBottom = 5;
  const metaCardHeight = metaCardPaddingTop + titleBlockH + 3 + infoBlockH + metaCardPaddingBottom;

  // Card Background & Border
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, metaCardHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, metaCardHeight, 2, 2, 'D');

  // Left Amber Accent Strip
  doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
  doc.rect(14, currentY, 3, metaCardHeight, 'F');

  // Title Lines (navy bold)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  const titleStartY = currentY + metaCardPaddingTop;
  for (let i = 0; i < titleLines.length; i++) {
    doc.text(titleLines[i], 20, titleStartY + (i * titleLineH));
  }

  // Divider line below title
  const dividerY = titleStartY + titleBlockH + 1.5;
  doc.setDrawColor(226, 232, 240);
  doc.line(20, dividerY, 192, dividerY);

  // 2-Column Info Grid strictly below title & divider
  const infoStartY = dividerY + 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  // Row 1
  doc.text(`Tanggal Laporan : ${dailyReport.date} (Minggu ke-${dailyReport.periodNumber})`, 20, infoStartY);
  doc.text(`Penambahan Volume: ${dailyReport.volumeProgress} unit`, 110, infoStartY);

  // Row 2
  doc.text(`Pelapor/Inspector: ${dailyReport.reporterName || 'Site Staff'}`, 20, infoStartY + infoRowH);
  doc.text(`Penambahan Bobot : +${formatPercent(dailyReport.weightAdded)}`, 110, infoStartY + infoRowH);

  // Row 3
  doc.text(`Lokasi Proyek   : ${project.location || '-'}`, 20, infoStartY + (2 * infoRowH));
  doc.text(`Klien / Owner    : ${project.client || '-'}`, 110, infoStartY + (2 * infoRowH));

  // Advance currentY past metadata card
  currentY += metaCardHeight + 3.5;

  // 2. Notes Block (Catatan Lapangan) - Dynamic Height Calculation
  const rawNotes = dailyReport.notes ? dailyReport.notes.trim() : 'Pekerjaan terlaksana sesuai spesifikasi teknis dan gambar kerja.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const notesLines: string[] = doc.splitTextToSize(rawNotes, 172);
  const notesLineH = 4.2;
  const notesTextH = notesLines.length * notesLineH;
  const notesCardHeight = Math.max(16, 5 + 4 + notesTextH + 3.5);

  doc.setFillColor(254, 243, 199);
  doc.roundedRect(14, currentY, 182, notesCardHeight, 2, 2, 'F');
  doc.setDrawColor(252, 211, 77);
  doc.roundedRect(14, currentY, 182, notesCardHeight, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text('CATATAN / KENDALA LAPANGAN:', 18, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const notesStartY = currentY + 9.5;
  for (let i = 0; i < notesLines.length; i++) {
    doc.text(notesLines[i], 18, notesStartY + (i * notesLineH));
  }

  // Advance currentY past notes card
  currentY += notesCardHeight + 4;

  // 3. Photo Documentation Section
  const photos = Array.isArray(dailyReport.photoUrls) && dailyReport.photoUrls.length > 0
    ? dailyReport.photoUrls.filter(Boolean)
    : (dailyReport.photoUrl ? [dailyReport.photoUrl] : []);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  const photoSectionTitle = photos.length > 1
    ? `FOTO DOKUMENTASI INSPEKSI (${photos.length} FOTO DENGAN GPS & TIMESTAMP)`
    : 'FOTO DOKUMENTASI INSPEKSI (DENGAN GPS & TIMESTAMP)';
  doc.text(photoSectionTitle, 14, currentY);

  currentY += 4;

  // Available vertical space for photos on page 1 before sign-off
  const maxAvailableForPhotos = Math.max(45, 248 - currentY);

  if (photos.length === 1) {
    try {
      const imgObj = await loadImg(photos[0]);
      const imgW = imgObj ? (imgObj.naturalWidth || imgObj.width || 800) : 800;
      const imgH = imgObj ? (imgObj.naturalHeight || imgObj.height || 600) : 600;

      const photoBoxW = 182;
      const photoBoxH = Math.min(100, Math.max(65, maxAvailableForPhotos - 10));

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, currentY, photoBoxW, photoBoxH, 2, 2, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, currentY, photoBoxW, photoBoxH, 2, 2, 'D');

      const fitted = fitImageInBox(imgW, imgH, 14, currentY, photoBoxW, photoBoxH);
      doc.addImage(imgObj || photos[0], 'JPEG', fitted.x, fitted.y, fitted.w, fitted.h);

      currentY += photoBoxH + 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(amberColor[0], amberColor[1], amberColor[2]);
      doc.text('✓ Foto Lapangan Autentik dengan GPS & Timestamp Watermark (app by Tisna)', 105, currentY, { align: 'center' });
      currentY += 2;
    } catch (err) {
      console.warn('Failed to load daily report photo:', err);
    }
  } else if (photos.length >= 2) {
    try {
      const maxDisplayPage1 = Math.min(photos.length, 4);
      const isFour = maxDisplayPage1 >= 3;
      const boxW = 89;
      const gapX = 4;
      const numRows = isFour ? 2 : 1;
      const targetBoxH = isFour
        ? Math.min(48, Math.max(38, Math.floor((maxAvailableForPhotos - 16) / 2)))
        : Math.min(68, Math.max(48, maxAvailableForPhotos - 10));

      const loadedDailyPhotos = await Promise.all(
        photos.slice(0, maxDisplayPage1).map(async (url) => {
          const img = await loadImg(url);
          return {
            url,
            img,
            w: img ? (img.naturalWidth || img.width || 800) : 800,
            h: img ? (img.naturalHeight || img.height || 600) : 600,
          };
        })
      );

      for (let pIdx = 0; pIdx < maxDisplayPage1; pIdx++) {
        const col = pIdx % 2;
        const row = Math.floor(pIdx / 2);
        const pX = 14 + col * (boxW + gapX);
        const pY = currentY + row * (targetBoxH + 6);
        const p = loadedDailyPhotos[pIdx];

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(pX, pY, boxW, targetBoxH, 1.5, 1.5, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(pX, pY, boxW, targetBoxH, 1.5, 1.5, 'D');

        const fitted = fitImageInBox(p.w, p.h, pX, pY, boxW, targetBoxH);
        try {
          doc.addImage(p.img || p.url, 'JPEG', fitted.x, fitted.y, fitted.w, fitted.h);
        } catch (e) {
          console.warn('Failed rendering sub photo:', e);
        }

        // Symmetrical Caption
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(amberColor[0], amberColor[1], amberColor[2]);
        doc.text(`Foto #${pIdx + 1} • GPS & Watermark Terverifikasi`, pX + boxW / 2, pY + targetBoxH + 3.8, { align: 'center' });
      }

      currentY += numRows * (targetBoxH + 6) + 1;

      if (photos.length > 4) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`* 4 foto ditampilkan di Lembar Utama, ${photos.length - 4} foto lainnya terlampir di Halaman Lanjutan.`, 14, currentY);
        currentY += 3.5;
      }
    } catch (err) {
      console.warn('Failed to render multi-photo grid:', err);
    }
  } else {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, currentY, 182, 26, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Tidak ada lampiran foto untuk laporan harian ini.', 105, currentY + 14, { align: 'center' });
    currentY += 30;
  }

  // 4. Sign-off Section (Symmetrical 3 Columns)
  let signoffY = Math.max(currentY + 4, 252);
  if (signoffY > 256) {
    doc.addPage();
    doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.rect(0, 0, 210, 12, 'F');
    doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
    doc.rect(0, 12, 210, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`LEMBAR PENGESAHAN & TANDA TANGAN INSPEKSI - ${project.name}`, 14, 8);
    signoffY = 22;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, signoffY, 196, signoffY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('TANDA TANGAN & PERSETUJUAN INSPEKSI:', 14, signoffY + 5);

  const sigColW = 56;
  const sigTextY = signoffY + 9;

  // Col 1: Pelapor
  doc.setFontSize(7.5);
  doc.text('Pelapor / Mandor Lapangan:', 14, sigTextY);
  doc.setFont('helvetica', 'normal');
  doc.text(dailyReport.reporterName || 'Site Staff', 14, sigTextY + 3.5);
  doc.line(14, sigTextY + 16, 14 + sigColW, sigTextY + 16);

  // Col 2: Pengawas MK
  doc.setFont('helvetica', 'bold');
  doc.text('Konsultan Pengawas / MK:', 77, sigTextY);
  doc.setFont('helvetica', 'normal');
  doc.text('Tim Supervisi Lapangan', 77, sigTextY + 3.5);
  doc.line(77, sigTextY + 16, 77 + sigColW, sigTextY + 16);

  // Col 3: Kontraktor
  doc.setFont('helvetica', 'bold');
  doc.text('Project Manager / Kontraktor:', 140, sigTextY);
  doc.setFont('helvetica', 'normal');
  doc.text(project.contractor || 'Kontraktor', 140, sigTextY + 3.5);
  doc.line(140, sigTextY + 16, 140 + sigColW, sigTextY + 16);

  // Footer on Page 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Lembar Laporan Harian • ${project.name} • Dicetak: ${new Date().toLocaleString('id-ID')}`, 105, 288, { align: 'center' });

  // 5. If more than 4 photos exist, append Page 2 for Remaining Photos
  if (photos.length > 4) {
    doc.addPage();
    doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.rect(0, 0, 210, 14, 'F');
    doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
    doc.rect(0, 14, 210, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`LAMPIRAN DOKUMENTASI FOTO INSPEKSI (LANJUTAN)`, 14, 9.5);

    let page2Y = 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.text(`FOTO DOKUMENTASI TAMBAHAN (${photos.length - 4} FOTO)`, 14, page2Y);
    page2Y += 5;

    const remainingPhotos = photos.slice(4);
    const boxW = 89;
    const boxH = 55;
    const gapX = 4;

    const loadedRemaining = await Promise.all(
      remainingPhotos.map(async (url) => {
        const img = await loadImg(url);
        return {
          url,
          img,
          w: img ? (img.naturalWidth || img.width || 800) : 800,
          h: img ? (img.naturalHeight || img.height || 600) : 600,
        };
      })
    );

    for (let rIdx = 0; rIdx < remainingPhotos.length; rIdx++) {
      const col = rIdx % 2;
      const row = Math.floor(rIdx / 2);
      const pX = 14 + col * (boxW + gapX);
      const pY = page2Y + row * (boxH + 7);
      const p = loadedRemaining[rIdx];

      if (pY + boxH > 275) {
        doc.addPage();
        page2Y = 20;
      }

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(pX, pY, boxW, boxH, 1.5, 1.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(pX, pY, boxW, boxH, 1.5, 1.5, 'D');

      const fitted = fitImageInBox(p.w, p.h, pX, pY, boxW, boxH);
      try {
        doc.addImage(p.img || p.url, 'JPEG', fitted.x, fitted.y, fitted.w, fitted.h);
      } catch (e) {
        console.warn('Failed rendering additional photo:', e);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(amberColor[0], amberColor[1], amberColor[2]);
      doc.text(`Foto #${rIdx + 5} • GPS & Watermark Terverifikasi`, pX + boxW / 2, pY + boxH + 3.8, { align: 'center' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Lampiran Tambahan • ${project.name} • ${dailyReport.date}`, 105, 288, { align: 'center' });
  }

  doc.save(`Laporan_Harian_${dailyReport.date}_${project.code}.pdf`);
}
