import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Project } from '../types/project';
import { calculateSCurvePoints, getProjectKPI, formatIDR, formatPercent } from './calculator';

export interface ExportPdfOptions {
  chartElementId?: string;
  reportNotes?: string;
}

/**
 * Generate a clean, professional PDF Executive Progress Report for Project Owners & Stakeholders
 */
export async function generateProjectPdfReport(
  project: Project,
  options: ExportPdfOptions = {}
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const kpi = getProjectKPI(project);
  const sPoints = calculateSCurvePoints(project);
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
  // Top Banner Accent
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
  doc.rect(0, 24, 210, 2, 'F');

  // Title Text on Banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('LAPORAN EKSEKUTIF PROGRES PROYEK KONSTRUKSI', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
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

  // 4 KPI Cards
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

  // --- S-CURVE CHART CAPTURE (IF CONTAINER ID PROVIDED) ---
  if (options.chartElementId) {
    const chartEl = document.getElementById(options.chartElementId);
    if (chartEl) {
      try {
        const canvas = await html2canvas(chartEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/png');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
        doc.text('GRAFIK KURVA S (RENCANA VS AKTUAL)', 14, currentY);
        currentY += 3;

        const imgWidth = 182;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const constrainedHeight = Math.min(imgHeight, 60);

        doc.addImage(imgData, 'PNG', 14, currentY, imgWidth, constrainedHeight);
        currentY += constrainedHeight + 8;
      } catch (err) {
        console.warn('Could not capture S-Curve chart canvas:', err);
      }
    }
  }

  // Check Page overflow before Category Table
  if (currentY > 220) {
    doc.addPage();
    currentY = 18;
  }

  // --- CATEGORY PROGRESS SUMMARY TABLE ---
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

  currentY += 8;

  // --- PAGE BREAK FOR DETAIL ITEM TABLE ---
  doc.addPage();
  currentY = 15;

  // Header on Page 2
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(0, 0, 210, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`RINCIAN ITEM PEKERJAAN & REALISASI - ${project.name}`, 14, 8);

  currentY = 18;

  // Detail RAB Table Header
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
    // Check page height limit
    if (currentY > 265) {
      doc.addPage();
      currentY = 15;
      renderDetailTableHeader(currentY);
      currentY += 7;
    }

    const actualVol = itemActualVolMap.get(item.id) || 0;
    const ratio = Math.min(1, actualVol / (item.volume || 1));
    const actualWeight = item.weightPercentage * ratio;
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

  currentY += 10;

  // --- SIGN-OFF / APPROVAL BLOCK ---
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY, 196, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('LEMBAR VERIFIKASI & PERSETUJUAN LAPORAN PROGRES', 14, currentY);

  currentY += 10;

  const colW = 55;
  // Box 1: Owner
  doc.setFontSize(8);
  doc.text('Pemilik Proyek (Owner):', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(project.client, 14, currentY + 4);
  doc.line(14, currentY + 22, 14 + colW, currentY + 22);
  doc.text('Tanggal & Tanda Tangan', 14, currentY + 26);

  // Box 2: Konsultan Supervisi
  doc.setFont('helvetica', 'bold');
  doc.text('Konsultan Pengawas / MK:', 80, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text('Tim Supervisi Lapangan', 80, currentY + 4);
  doc.line(80, currentY + 22, 80 + colW, currentY + 22);
  doc.text('Tanggal & Tanda Tangan', 80, currentY + 26);

  // Box 3: Kontraktor
  doc.setFont('helvetica', 'bold');
  doc.text('Kontraktor Pelaksana:', 142, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(project.contractor || 'Project Manager', 142, currentY + 4);
  doc.line(142, currentY + 22, 142 + colW, currentY + 22);
  doc.text('Tanggal & Tanda Tangan', 142, currentY + 26);

  // Add Page Numbers footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Halaman ${page} dari ${totalPages} • Laporan Progres Proyek ${project.code}`,
      105,
      288,
      { align: 'center' }
    );
  }

  // Save the PDF
  const safeFilename = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Laporan_Progres_${safeFilename}_Mg${kpi.currentPeriodNumber}.pdf`);
}
