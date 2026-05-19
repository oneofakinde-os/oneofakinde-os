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
