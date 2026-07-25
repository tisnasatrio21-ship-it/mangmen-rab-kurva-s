import { Project, RabItem, PlannedPeriodDistribution, DailyReportItem, SPoint } from '../types/project';

/**
 * Format currency to Indonesian Rupiah (Rp)
 */
export function formatIDR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage with default 2 decimal places
 */
export function formatPercent(val: number, decimals: number = 2): string {
  if (isNaN(val) || val === null || val === undefined) return '0.00%';
  return `${val.toFixed(decimals)}%`;
}

/**
 * Recalculate RAB weights percentage relative to total project contract value
 */
export function recalculateRabItems(rabItems: RabItem[], overrideTotalValue?: number): { items: RabItem[]; totalValue: number } {
  const calculatedTotal = rabItems.reduce((acc, item) => acc + (item.volume * item.unitPrice), 0);
  const totalValue = overrideTotalValue && overrideTotalValue > 0 ? overrideTotalValue : calculatedTotal;

  const items = rabItems.map(item => {
    const totalPrice = item.volume * item.unitPrice;
    const weightPercentage = totalValue > 0 ? (totalPrice / totalValue) * 100 : 0;
    return {
      ...item,
      totalPrice,
      weightPercentage: Number(weightPercentage.toFixed(4)),
    };
  });

  return { items, totalValue };
}

/**
 * Calculate week period number from start date and target date
 */
export function getPeriodNumberForDate(startDateStr: string, targetDateStr: string, totalPeriods: number = 12): number {
  if (!startDateStr || !targetDateStr) return 1;
  const start = new Date(startDateStr);
  const target = new Date(targetDateStr);
  
  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 1;
  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(Math.max(1, week), totalPeriods);
}

/**
 * Get date range text for a week period
 */
export function getPeriodDateRange(startDateStr: string, periodNumber: number): string {
  if (!startDateStr) return `Minggu ${periodNumber}`;
  const start = new Date(startDateStr);
  
  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() + (periodNumber - 1) * 7);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startFormatted = `${weekStart.getDate()} ${weekStart.toLocaleString('id-ID', { month: 'short' })}`;
  const endFormatted = `${weekEnd.getDate()} ${weekEnd.toLocaleString('id-ID', { month: 'short' })}`;

  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Auto generate planned timeline distributions with realistic S-curve bell distribution
 */
export function generateAutoPlannedDistributions(
  rabItems: RabItem[],
  totalPeriods: number = 12
): PlannedPeriodDistribution[] {
  return rabItems.map((item, idx) => {
    const categoryLower = item.category.toLowerCase();
    
    // Determine reasonable start and end week based on category & index
    let startP = 1;
    let endP = Math.max(2, Math.floor(totalPeriods * 0.3));

    if (categoryLower.includes('persiapan') || categoryLower.includes('awal')) {
      startP = 1;
      endP = Math.min(3, totalPeriods);
    } else if (categoryLower.includes('galian') || categoryLower.includes('pondasi') || categoryLower.includes('substructure')) {
      startP = Math.max(1, Math.floor(totalPeriods * 0.15));
      endP = Math.min(totalPeriods, Math.floor(totalPeriods * 0.45));
    } else if (categoryLower.includes('struktur') || categoryLower.includes('beton') || categoryLower.includes('baja')) {
      startP = Math.max(2, Math.floor(totalPeriods * 0.25));
      endP = Math.min(totalPeriods, Math.floor(totalPeriods * 0.75));
    } else if (categoryLower.includes('pasangan') || categoryLower.includes('arsitektur') || categoryLower.includes('atap') || categoryLower.includes('dinding')) {
      startP = Math.max(3, Math.floor(totalPeriods * 0.45));
      endP = Math.min(totalPeriods, Math.floor(totalPeriods * 0.90));
    } else if (categoryLower.includes('mep') || categoryLower.includes('listrik') || categoryLower.includes('sanitari') || categoryLower.includes('finishing')) {
      startP = Math.max(4, Math.floor(totalPeriods * 0.60));
      endP = totalPeriods;
    } else {
      // General item split across middle weeks
      const numCategories = 5;
      const step = Math.floor(totalPeriods / numCategories);
      startP = Math.max(1, 1 + Math.floor((idx % numCategories) * step));
      endP = Math.min(totalPeriods, startP + Math.ceil(totalPeriods * 0.35));
    }

    if (startP >= endP) endP = Math.min(totalPeriods, startP + 1);

    const span = endP - startP + 1;
    const periodWeights: Record<number, number> = {};

    // Generate bell-shaped percentages across span so sum equals item.weightPercentage
    const rawFactors: number[] = [];
    for (let p = 0; p < span; p++) {
      // Bell curve factor: sin(pi * (p + 0.5) / span)
      const factor = Math.sin((Math.PI * (p + 0.5)) / span);
      rawFactors.push(factor);
    }
    const factorSum = rawFactors.reduce((a, b) => a + b, 0);

    for (let p = 0; p < span; p++) {
      const periodNum = startP + p;
      const weightForPeriod = (rawFactors[p] / factorSum) * item.weightPercentage;
      periodWeights[periodNum] = Number(weightForPeriod.toFixed(4));
    }

    return {
      rabItemId: item.id,
      startPeriod: startP,
      endPeriod: endP,
      periodWeights,
    };
  });
}

/**
 * Calculate S-Curve points (Planned vs Actual) for each period
 */
export function calculateSCurvePoints(project: Project): SPoint[] {
  const { totalPeriods, startDate, plannedDistributions, dailyReports, rabItems } = project;
  
  // Create map of rabItem -> weightPercentage
  const itemWeightMap = new Map<string, number>();
  const itemVolumeMap = new Map<string, number>();
  rabItems.forEach(item => {
    itemWeightMap.set(item.id, item.weightPercentage || 0);
    itemVolumeMap.set(item.id, item.volume || 1);
  });

  // Calculate planned incremental weight per period
  const plannedByPeriod: number[] = new Array(totalPeriods + 1).fill(0);
  plannedDistributions.forEach(dist => {
    Object.entries(dist.periodWeights).forEach(([periodStr, weight]) => {
      const p = parseInt(periodStr, 10);
      if (p >= 1 && p <= totalPeriods) {
        plannedByPeriod[p] += weight;
      }
    });
  });

  // Calculate actual incremental weight per period from daily reports
  const actualByPeriod: number[] = new Array(totalPeriods + 1).fill(0);
  const reportsByPeriod: Record<number, DailyReportItem[]> = {};

  dailyReports.forEach(report => {
    let p = report.periodNumber;
    if (!p || p < 1) {
      p = getPeriodNumberForDate(startDate, report.date, totalPeriods);
    }
    if (p >= 1 && p <= totalPeriods) {
      actualByPeriod[p] += report.weightAdded || 0;
      if (!reportsByPeriod[p]) reportsByPeriod[p] = [];
      reportsByPeriod[p].push(report);
    }
  });

  // Find the latest period that has reports or is in the past relative to today
  const today = new Date();
  const projStart = startDate ? new Date(startDate) : new Date();
  const currentWeekNum = Math.max(1, Math.floor((today.getTime() - projStart.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1);

  // We consider a period completed if p <= currentWeekNum or if there are reports in period p
  let maxReportedPeriod = 0;
  dailyReports.forEach(r => {
    const p = r.periodNumber || getPeriodNumberForDate(startDate, r.date, totalPeriods);
    if (p > maxReportedPeriod) maxReportedPeriod = p;
  });

  const activeUntilPeriod = Math.min(totalPeriods, Math.max(maxReportedPeriod, Math.min(currentWeekNum, totalPeriods)));

  let plannedCum = 0;
  let actualCum = 0;

  const points: SPoint[] = [];

  for (let p = 1; p <= totalPeriods; p++) {
    const pInc = plannedByPeriod[p] || 0;
    plannedCum += pInc;
    // Cap cumulative planned at 100% due to float rounding
    const plannedCumCapped = Math.min(100, Math.round(plannedCum * 1000) / 1000);

    const aInc = actualByPeriod[p] || 0;
    
    // Only accumulate actual if period is <= activeUntilPeriod
    const isCompleted = p <= activeUntilPeriod;
    if (isCompleted) {
      actualCum += aInc;
    }

    const actualCumCapped = isCompleted ? Math.min(100, Math.round(actualCum * 1000) / 1000) : null;
    const dev = isCompleted ? Number(((actualCumCapped || 0) - plannedCumCapped).toFixed(2)) : 0;

    const dateRangeStr = getPeriodDateRange(startDate, p);

    points.push({
      periodNumber: p,
      label: `Minggu ${p}`,
      dateRangeStr,
      plannedIncremental: Number(pInc.toFixed(2)),
      plannedCumulative: Number(plannedCumCapped.toFixed(2)),
      actualIncremental: isCompleted ? Number(aInc.toFixed(2)) : 0,
      actualCumulative: actualCumCapped !== null ? Number(actualCumCapped.toFixed(2)) : (null as unknown as number),
      deviation: dev,
      isCompletedPeriod: isCompleted,
    });
  }

  return points;
}

/**
 * Calculate overall project KPI summary stats
 */
export function getProjectKPI(project: Project) {
  const points = calculateSCurvePoints(project);
  
  // Find current active point (latest completed period)
  const completedPoints = points.filter(p => p.actualCumulative !== null && p.actualCumulative !== undefined && p.isCompletedPeriod);
  const currentPoint = completedPoints.length > 0 ? completedPoints[completedPoints.length - 1] : points[0];

  const currentPlanned = currentPoint ? currentPoint.plannedCumulative : 0;
  const currentActual = currentPoint ? (currentPoint.actualCumulative ?? 0) : 0;
  const deviation = Number((currentActual - currentPlanned).toFixed(2));

  // Determine status color & label
  let statusText = 'Sesuai Jadwal';
  let statusColor = 'emerald';
  if (deviation > 0.5) {
    statusText = 'Lebih Cepat (Maju)';
    statusColor = 'emerald';
  } else if (deviation < -0.5) {
    statusText = 'Terlambat (Deviasi Negatif)';
    statusColor = 'amber';
    if (deviation < -5) {
      statusColor = 'rose';
      statusText = 'Kritis (Keterlambatan Tinggi)';
    }
  }

  // Get latest daily report
  const sortedReports = [...project.dailyReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestReport = sortedReports[0] || null;

  // Calculate completed RAB items summary
  const itemProgressMap = new Map<string, number>();
  project.dailyReports.forEach(r => {
    const current = itemProgressMap.get(r.rabItemId) || 0;
    itemProgressMap.set(r.rabItemId, current + r.volumeProgress);
  });

  let completedItemsCount = 0;
  let inProgressItemsCount = 0;
  project.rabItems.forEach(item => {
    const doneVol = itemProgressMap.get(item.id) || 0;
    if (doneVol >= item.volume) {
      completedItemsCount++;
    } else if (doneVol > 0) {
      inProgressItemsCount++;
    }
  });

  return {
    currentPeriodNumber: currentPoint ? currentPoint.periodNumber : 1,
    currentPeriodLabel: currentPoint ? currentPoint.label : 'Minggu 1',
    currentPlanned,
    currentActual,
    deviation,
    statusText,
    statusColor,
    latestReport,
    lastUpdateDate: project.lastUpdateDate || (latestReport ? latestReport.date : project.startDate),
    completedItemsCount,
    inProgressItemsCount,
    totalItemsCount: project.rabItems.length,
    totalContractValue: project.totalContractValue,
  };
}
