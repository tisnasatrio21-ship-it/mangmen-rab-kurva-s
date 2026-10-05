import { Project, DailyReportItem } from '../types/project';

/**
 * Returns total count of photos across all daily reports in a project
 */
export function getProjectPhotoCount(project: Project): number {
  if (!project || !Array.isArray(project.dailyReports)) return 0;
  return project.dailyReports.reduce((acc, r) => {
    if (Array.isArray(r.photoUrls) && r.photoUrls.length > 0) {
      return acc + r.photoUrls.length;
    }
    return acc + (r.photoUrl ? 1 : 0);
  }, 0);
}

/**
 * Ensures a project has a valid ISO updatedAt timestamp
 */
export function stampProjectUpdated(project: Project): Project {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Merges two daily report items, strictly guarding against photo loss when cloud data
 * has stripped or compressed photos.
 */
function mergeDailyReportItem(primary: DailyReportItem, fallback?: DailyReportItem): DailyReportItem {
  if (!fallback) return primary;

  const primaryPhotos = Array.isArray(primary.photoUrls) && primary.photoUrls.length > 0
    ? primary.photoUrls.filter(Boolean)
    : primary.photoUrl ? [primary.photoUrl] : [];

  const fallbackPhotos = Array.isArray(fallback.photoUrls) && fallback.photoUrls.length > 0
    ? fallback.photoUrls.filter(Boolean)
    : fallback.photoUrl ? [fallback.photoUrl] : [];

  let resolvedPhotoUrl = primary.photoUrl;
  let resolvedPhotoUrls = primary.photoUrls;

  if (primaryPhotos.length === 0 && fallbackPhotos.length > 0) {
    // Primary has no photos but fallback does: ALWAYS keep fallback photos!
    resolvedPhotoUrl = fallbackPhotos[0];
    resolvedPhotoUrls = fallbackPhotos;
  } else if (fallbackPhotos.length > primaryPhotos.length) {
    // Fallback has more photos (e.g. cloud truncated extra photos): keep fallback photos!
    resolvedPhotoUrl = fallbackPhotos[0];
    resolvedPhotoUrls = fallbackPhotos;
  } else if (fallbackPhotos.length > 0 && primaryPhotos.length > 0) {
    // Both have photos: check if fallback has higher resolution (longer data URL) than primary
    const fallbackSize = (fallbackPhotos[0] || '').length;
    const primarySize = (primaryPhotos[0] || '').length;
    if (fallbackSize > primarySize && fallbackSize > 20000) {
      // Fallback is higher resolution local photo, prioritize it over cloud compressed thumbnail
      resolvedPhotoUrl = fallbackPhotos[0];
      resolvedPhotoUrls = fallbackPhotos;
    }
  }

  return {
    ...primary,
    photoUrl: resolvedPhotoUrl || primary.photoUrl || fallback.photoUrl,
    photoUrls: resolvedPhotoUrls && resolvedPhotoUrls.length > 0 ? resolvedPhotoUrls : fallback.photoUrls || [],
    notes: primary.notes || fallback.notes,
    reporterName: primary.reporterName || fallback.reporterName,
    volumeProgress: primary.volumeProgress ?? fallback.volumeProgress,
    weightAdded: primary.weightAdded ?? fallback.weightAdded,
    percentageAdded: primary.percentageAdded ?? fallback.percentageAdded,
  };
}

/**
 * Merges two versions of the same project (e.g. Local vs Cloud / IndexedDB)
 * without losing local edits, daily reports, or documentation photos.
 */
export function mergeSingleProject(local: Project, incoming: Project): Project {
  const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
  const incomingTime = incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;

  // Determine base project
  let base: Project;
  let secondary: Project;

  if (localTime > incomingTime) {
    base = local;
    secondary = incoming;
  } else if (incomingTime > localTime) {
    base = incoming;
    secondary = local;
  } else {
    // If times are equal or zero, prefer the one with more reports or more photos
    const localReports = local.dailyReports?.length || 0;
    const incomingReports = incoming.dailyReports?.length || 0;
    const localPhotos = getProjectPhotoCount(local);
    const incomingPhotos = getProjectPhotoCount(incoming);

    if (localPhotos > incomingPhotos || localReports >= incomingReports) {
      base = local;
      secondary = incoming;
    } else {
      base = incoming;
      secondary = local;
    }
  }

  // Merge Daily Reports safely:
  // 1. Map existing reports by id
  const secondaryReportMap = new Map<string, DailyReportItem>();
  (secondary.dailyReports || []).forEach((r) => secondaryReportMap.set(r.id, r));

  const mergedReports: DailyReportItem[] = (base.dailyReports || []).map((bReport) => {
    const sReport = secondaryReportMap.get(bReport.id);
    return mergeDailyReportItem(bReport, sReport);
  });

  // 2. Add any reports from secondary that might be missing from base
  const baseReportIds = new Set((base.dailyReports || []).map((r) => r.id));
  (secondary.dailyReports || []).forEach((sReport) => {
    if (!baseReportIds.has(sReport.id)) {
      mergedReports.push(sReport);
    }
  });

  // Sort daily reports newest first
  mergedReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Preserve RAB items if base has fewer items or empty
  const rabItems =
    Array.isArray(base.rabItems) && base.rabItems.length > 0
      ? base.rabItems
      : secondary.rabItems || [];

  const plannedDistributions =
    Array.isArray(base.plannedDistributions) && base.plannedDistributions.length > 0
      ? base.plannedDistributions
      : secondary.plannedDistributions || [];

  return {
    ...base,
    rabItems,
    plannedDistributions,
    dailyReports: mergedReports,
    updatedAt: base.updatedAt || secondary.updatedAt || new Date().toISOString(),
  };
}

/**
 * Merges an entire list of local projects with incoming projects (from Cloud or IndexedDB).
 * Guarantees that local projects and updates are never wiped out or lost.
 */
export function mergeProjectLists(localList: Project[], incomingList: Project[]): Project[] {
  if (!incomingList || incomingList.length === 0) return localList;
  if (!localList || localList.length === 0) return incomingList;

  const resultMap = new Map<string, Project>();

  // Add all local projects first
  localList.forEach((p) => resultMap.set(p.id, p));

  // Merge each incoming project
  incomingList.forEach((incomingProj) => {
    const existing = resultMap.get(incomingProj.id);
    if (existing) {
      resultMap.set(incomingProj.id, mergeSingleProject(existing, incomingProj));
    } else {
      resultMap.set(incomingProj.id, incomingProj);
    }
  });

  return Array.from(resultMap.values());
}
