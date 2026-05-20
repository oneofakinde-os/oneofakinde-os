export type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d" | "12m" | "all_time";

export type StudioAnalytics = {
  studioHandle: string;
  period: AnalyticsPeriod;
  totalCollects: number;
  totalRevenueCents: number;
  totalViews: number;
  uniqueViewers: number;
  followerCount: number;
  followerGrowth: number;
  topDrops: DropAnalyticsSummary[];
};

export type DropAnalyticsSummary = {
  dropId: string;
  title: string;
  views: number;
  collects: number;
  revenueCents: number;
  completionRate: number;
};

export type WorldAnalytics = {
  worldId: string;
  period: AnalyticsPeriod;
  memberCount: number;
  memberGrowth: number;
  activeMembers: number;
  dropCount: number;
  totalViews: number;
};

export type RevenueBreakdown = {
  studioHandle: string;
  period: AnalyticsPeriod;
  primarySalesCents: number;
  resaleRoyaltiesCents: number;
  patronageCents: number;
  tipsCents: number;
  totalCents: number;
};

export type AudienceDemographic = {
  studioHandle: string;
  byCountry: Record<string, number>;
  byMode: Record<string, number>;
  newVsReturning: { new: number; returning: number };
};

export type RealTimeLiveAnalytics = {
  sessionId: string;
  currentViewers: number;
  peakViewers: number;
  chatMessagesPerMinute: number;
  tipsReceivedCents: number;
  avgWatchDurationMs: number;
};

export type ExportFormat = "csv" | "json";

export type AnalyticsExport = {
  studioHandle: string;
  period: AnalyticsPeriod;
  format: ExportFormat;
  generatedAt: string;
  downloadUrl: string;
};

export function computeCompletionRate(
  totalStarts: number,
  totalCompletions: number
): number {
  if (totalStarts === 0) return 0;
  return totalCompletions / totalStarts;
}

export function computeGrowthRate(
  previousValue: number,
  currentValue: number
): number {
  if (previousValue === 0) return currentValue > 0 ? 1 : 0;
  return (currentValue - previousValue) / previousValue;
}

export const ANALYTICS_PRIVACY_COMMITMENT =
  "analytics are available only to the creator about their own work. " +
  "no creator can see another creator's analytics. aggregate platform " +
  "metrics are published in the transparency report.";
