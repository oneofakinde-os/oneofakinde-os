export type PrivacySettings = {
  accountId: string;
  accountLocked: boolean;
  onlineStatusVisible: boolean;
  dmRestriction: "anyone" | "followers_only" | "mutual_only" | "no_one";
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  accountId: "",
  accountLocked: false,
  onlineStatusVisible: true,
  dmRestriction: "anyone",
};

export type FollowerApproval = {
  id: string;
  requesterId: string;
  targetId: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  resolvedAt: string | null;
};

export type PerDropAudienceExclusion = {
  dropId: string;
  excludedAccountIds: string[];
};

export function isExcludedFromDrop(
  exclusion: PerDropAudienceExclusion | null,
  accountId: string
): boolean {
  if (!exclusion) return false;
  return exclusion.excludedAccountIds.includes(accountId);
}

export type BulkBlockImport = {
  accountId: string;
  targetAccountIds: string[];
  importedAt: string;
  count: number;
};

export type AntiImpersonationReport = {
  id: string;
  reporterAccountId: string;
  reportedHandle: string;
  impersonatedHandle: string;
  evidence: string;
  status: "pending" | "confirmed" | "dismissed";
  createdAt: string;
};

export type ContentTakedownAppeal = {
  id: string;
  accountId: string;
  contentId: string;
  contentType: "drop" | "comment" | "post";
  reason: string;
  status: "pending" | "upheld" | "overturned";
  submittedAt: string;
};

export type ContentSensitivityPreference = {
  accountId: string;
  mode: string;
  maxSensitivityLevel: number;
};

export type ReportAssigneeTracking = {
  reportId: string;
  assigneeId: string;
  assignedAt: string;
  resolvedAt: string | null;
};

export type ReportSlaEnforcement = {
  reportId: string;
  category: string;
  firstReviewDeadline: string;
  breached: boolean;
};

export type SafetyCenter = {
  resources: SafetyResource[];
};

export type SafetyResource = {
  id: string;
  title: string;
  category: "crisis" | "harassment" | "privacy" | "legal" | "general";
  url: string;
  description: string;
};

export const SUICIDE_PREVENTION_POLICY =
  "content that promotes or instructs self-harm is a layer 1 hard exclusion. " +
  "content that discusses mental health struggles is allowed with sensitivity rating. " +
  "crisis resources are surfaced when self-harm content is detected.";

export const CSAM_POLICY =
  "the platform has zero tolerance for child sexual abuse material. " +
  "detected material is immediately removed, reported to NCMEC, and " +
  "the account is permanently suspended. this is a non-negotiable legal obligation.";

export type CollectionPrivacyControl = {
  accountId: string;
  dropId: string;
  visibility: "public" | "private" | "followers_only";
};

export type TrustedHelper = {
  id: string;
  accountId: string;
  helperAccountId: string;
  permissions: TrustedHelperPermission[];
  assignedAt: string;
  revokedAt: string | null;
};

export type TrustedHelperPermission =
  | "moderate_comments"
  | "manage_dms"
  | "review_reports"
  | "block_accounts";

export function isTrustedHelper(helpers: TrustedHelper[], helperAccountId: string): boolean {
  return helpers.some((h) => h.helperAccountId === helperAccountId && h.revokedAt === null);
}
