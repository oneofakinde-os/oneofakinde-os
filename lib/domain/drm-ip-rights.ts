export type WatchTokenScope = {
  dropId: string;
  accountId: string;
  deviceFingerprint: string;
  issuedAt: string;
  expiresAt: string;
  refreshCount: number;
};

export type WatchTokenAnomalyScore = {
  tokenId: string;
  score: number;
  factors: AnomalyFactor[];
  flagged: boolean;
};

export type AnomalyFactor =
  | "device_mismatch"
  | "geo_impossible_travel"
  | "excessive_refreshes"
  | "concurrent_streams"
  | "unusual_hours";

export const ANOMALY_THRESHOLD = 0.7;

export function isAnomalyFlagged(score: WatchTokenAnomalyScore): boolean {
  return score.score >= ANOMALY_THRESHOLD;
}

export function computeAnomalyScore(factors: AnomalyFactor[]): number {
  const weights: Record<AnomalyFactor, number> = {
    device_mismatch: 0.4,
    geo_impossible_travel: 0.5,
    excessive_refreshes: 0.2,
    concurrent_streams: 0.3,
    unusual_hours: 0.1,
  };
  const total = factors.reduce((sum, f) => sum + weights[f], 0);
  return Math.min(1, total);
}

export type LicenseTerms =
  | "all_rights_reserved"
  | "cc_by"
  | "cc_by_sa"
  | "cc_by_nc"
  | "cc_by_nc_sa"
  | "cc_by_nd"
  | "cc_by_nc_nd"
  | "cc0"
  | "custom";

export const CREATIVE_COMMONS_OPTIONS: readonly LicenseTerms[] = [
  "cc_by",
  "cc_by_sa",
  "cc_by_nc",
  "cc_by_nc_sa",
  "cc_by_nd",
  "cc_by_nc_nd",
  "cc0",
] as const;

export type DropLicense = {
  dropId: string;
  terms: LicenseTerms;
  customTermsUrl: string | null;
  declaredAt: string;
};

export function isCreativeCommons(terms: LicenseTerms): boolean {
  return (CREATIVE_COMMONS_OPTIONS as readonly string[]).includes(terms);
}

export type TakedownStatus =
  | "pending"
  | "reviewing"
  | "removed"
  | "dismissed"
  | "counter_notice_filed"
  | "counter_notice_reviewing"
  | "restored";

export type TakedownRequest = {
  id: string;
  claimantAccountId: string;
  targetDropId: string;
  targetStudioHandle: string;
  reason: string;
  evidenceUrls: string[];
  status: TakedownStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewerHandle: string | null;
};

export type CounterNotice = {
  id: string;
  takedownId: string;
  creatorAccountId: string;
  statement: string;
  evidenceUrls: string[];
  submittedAt: string;
  status: "pending" | "reviewing" | "accepted" | "rejected";
};

export const CLAIMANT_RESPONSE_WINDOW_DAYS = 14;
export const COUNTER_NOTICE_STAY_ACTIVE = true;

export function isTakedownActive(request: TakedownRequest): boolean {
  return request.status === "removed" || request.status === "reviewing";
}

export function canFileCounterNotice(request: TakedownRequest): boolean {
  return request.status === "removed";
}

export function isUnderCounterNoticeStay(request: TakedownRequest): boolean {
  return request.status === "counter_notice_filed" || request.status === "counter_notice_reviewing";
}

export type RepeatInfringerRecord = {
  accountId: string;
  studioHandle: string;
  upheldTakedowns: number;
  threshold: number;
  designated: boolean;
  designatedAt: string | null;
};

export const REPEAT_INFRINGER_THRESHOLD = 3;

export function isRepeatInfringer(record: RepeatInfringerRecord): boolean {
  return record.upheldTakedowns >= record.threshold;
}

export function advanceTakedownLifecycle(
  request: TakedownRequest,
  action: "approve" | "dismiss" | "counter_notice" | "restore",
  nowIso: string
): TakedownRequest {
  switch (action) {
    case "approve":
      return { ...request, status: "removed", reviewedAt: nowIso };
    case "dismiss":
      return { ...request, status: "dismissed", reviewedAt: nowIso };
    case "counter_notice":
      return { ...request, status: "counter_notice_filed" };
    case "restore":
      return { ...request, status: "restored", reviewedAt: nowIso };
  }
}

export const DRM_OPEN_LICENSE_COMMITMENT =
  "the platform publishes its DRM terms openly. creators and collectors can review exactly " +
  "what protections apply, what usage rights collectors receive, and what restrictions exist.";

export type CopyrightRegistration = {
  dropId: string;
  registrationNumber: string | null;
  registrationDate: string | null;
  jurisdiction: string;
  selfDeclared: boolean;
};

export type LicensingExclusivity = "exclusive" | "non_exclusive";

export type LicensingDeclaration = {
  dropId: string;
  exclusivity: LicensingExclusivity;
  declaredAt: string;
};

export function isExclusiveLicense(declaration: LicensingDeclaration): boolean {
  return declaration.exclusivity === "exclusive";
}

export type ResaleRoyaltyEnforcement = {
  dropId: string;
  royaltyRate: number;
  enforcedOnResale: boolean;
};

export function computeRoyaltyOnResale(salePriceCents: number, rate: number): number {
  return Math.round(salePriceCents * rate);
}
