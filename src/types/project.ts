export type PeriodType = 'weekly' | 'monthly';

export interface RabItem {
  id: string;
  code: string;
  category: string;
  description: string;
  volume: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  weightPercentage: number; // % of total project value
}

export interface PlannedPeriodDistribution {
  rabItemId: string;
  startPeriod: number; // 1-indexed (e.g. Week 1)
  endPeriod: number;   // 1-indexed (e.g. Week 4)
  // Map of period number -> weight percentage for that period
  periodWeights: Record<number, number>;
}

export interface DailyReportItem {
  id: string;
  date: string; // YYYY-MM-DD
  periodNumber: number; // Calculated week index
  rabItemId: string;
  rabItemCode?: string;
  rabItemDescription?: string;
  volumeProgress: number; // volume added on this report
  percentageAdded: number; // % item progress added
  weightAdded: number; // % total project weight added
  notes?: string;
  photoUrl?: string;
  reporterName?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  client: string;
  location: string;
  contractor: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  periodType: PeriodType;
  totalPeriods: number; // e.g. 12 weeks
  totalContractValue: number; // In IDR
  rabItems: RabItem[];
  plannedDistributions: PlannedPeriodDistribution[];
  dailyReports: DailyReportItem[];
  lastUpdateDate?: string;
}

export interface SPoint {
  periodNumber: number;
  label: string; // e.g. "Minggu 1 (01-07 Jul)"
  dateRangeStr: string;
  plannedIncremental: number; // weight % in this week
  plannedCumulative: number;  // cumulative weight % up to this week
  actualIncremental: number;   // actual weight % in this week
  actualCumulative: number;    // actual cumulative weight % up to this week
  deviation: number;          // actualCumulative - plannedCumulative
  isCompletedPeriod: boolean; // whether period has past or current reports
}
