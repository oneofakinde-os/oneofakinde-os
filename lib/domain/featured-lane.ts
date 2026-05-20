export type FeaturedLanePurchase = {
  id: string;
  creatorAccountId: string;
  studioHandle: string;
  dropId: string;
  budgetCents: number;
  cpmRateCents: number;
  impressionsTarget: number;
  impressionsDelivered: number;
  perUserExposureCap: number;
  status: FeaturedLaneStatus;
  createdAt: string;
  startsAt: string;
  endsAt: string;
};

export type FeaturedLaneStatus =
  | "pending_review"
  | "active"
  | "paused"
  | "completed"
  | "rejected"
  | "refunded";

export const FEATURED_LANE_RULES = {
  creatorOnlyPurchase: true,
  ownWorkOnly: true,
  onPlatformDestinationOnly: true,
  separateFromConsumptionRanking: true,
  standardContentModerationParity: true,
  revenueToPlatform: true,
  separateAccountingLine: true,
} as const;

export function isValidFeaturedLanePurchase(
  purchaserAccountId: string,
  dropCreatorAccountId: string
): boolean {
  return purchaserAccountId === dropCreatorAccountId;
}

export function isOwnWork(purchaserStudioHandle: string, dropStudioHandle: string): boolean {
  return purchaserStudioHandle === dropStudioHandle;
}

export const FEATURED_LANE_LABEL = "Featured by Creator";

export type CpmRate = {
  tier: "standard" | "premium" | "high_demand";
  cpmCents: number;
};

export const CPM_RATES: readonly CpmRate[] = [
  { tier: "standard", cpmCents: 200 },
  { tier: "premium", cpmCents: 500 },
  { tier: "high_demand", cpmCents: 800 },
] as const;

export function computeImpressionsBudget(budgetCents: number, cpmCents: number): number {
  if (cpmCents <= 0) return 0;
  return Math.floor((budgetCents / cpmCents) * 1000);
}

export type PerUserExposureCapConfig = {
  maxImpressionsPerUser: number;
  windowHours: number;
};

export const DEFAULT_EXPOSURE_CAP: PerUserExposureCapConfig = {
  maxImpressionsPerUser: 3,
  windowHours: 24,
};

export function isExposureCapReached(
  impressionsForUser: number,
  cap: PerUserExposureCapConfig
): boolean {
  return impressionsForUser >= cap.maxImpressionsPerUser;
}

export type CreatorBudgetCap = {
  studioHandle: string;
  monthlyBudgetCapCents: number;
  spentThisMonthCents: number;
};

export function isBudgetExhausted(cap: CreatorBudgetCap): boolean {
  return cap.spentThisMonthCents >= cap.monthlyBudgetCapCents;
}

export type FeaturedLaneAnalytics = {
  purchaseId: string;
  impressions: number;
  clicks: number;
  collects: number;
  spentCents: number;
  ctr: number;
};

export function computeCtr(impressions: number, clicks: number): number {
  if (impressions === 0) return 0;
  return clicks / impressions;
}

export type TechnicalFailureRefund = {
  purchaseId: string;
  undeliveredImpressions: number;
  refundAmountCents: number;
  reason: string;
  refundedAt: string;
};

export function computeRefundForUndelivered(
  undeliveredImpressions: number,
  cpmCents: number
): number {
  return Math.ceil((undeliveredImpressions / 1000) * cpmCents);
}

export const FEATURED_LANE_VOCABULARY_LINT =
  "featured lane purchase interfaces never use: ads, advertising, sponsored, " +
  "promoted, campaigns. the correct term is 'featured lane' or 'creator feature.'";

export const ARCHITECTURAL_SEPARATION =
  "featured lane impressions do not affect consumption score, townhall ranking, " +
  "or any discovery signal. the featured lane is a separate rendering rail.";

export const ELECTION_QUIET_WINDOW_FEATURED_RESTRICTION =
  "during election quiet windows, featured lane purchases for political content " +
  "are suspended per the platform's political neutrality commitments.";
