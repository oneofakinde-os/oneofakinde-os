export type RetentionPolicy = {
  dataType: string;
  retentionDays: number | null;
  deletionMethod: "hard_delete" | "soft_delete" | "archive";
  legalBasis: string;
};

export const RETENTION_POLICIES: readonly RetentionPolicy[] = [
  { dataType: "audit_logs", retentionDays: 2555, deletionMethod: "archive", legalBasis: "compliance" },
  { dataType: "transaction_records", retentionDays: 2555, deletionMethod: "archive", legalBasis: "tax_compliance" },
  { dataType: "session_logs", retentionDays: 90, deletionMethod: "hard_delete", legalBasis: "security" },
  { dataType: "consume_history", retentionDays: null, deletionMethod: "soft_delete", legalBasis: "user_preference" },
  { dataType: "deleted_account_pii", retentionDays: 30, deletionMethod: "hard_delete", legalBasis: "gdpr" },
  { dataType: "media_assets", retentionDays: null, deletionMethod: "hard_delete", legalBasis: "creator_ownership" },
  { dataType: "device_fingerprints", retentionDays: 365, deletionMethod: "hard_delete", legalBasis: "security" },
] as const;

export function getRetentionPolicy(dataType: string): RetentionPolicy | null {
  return RETENTION_POLICIES.find((p) => p.dataType === dataType) ?? null;
}

export function isRetentionExpired(
  createdAtIso: string,
  retentionDays: number | null,
  nowIso: string
): boolean {
  if (retentionDays === null) return false;
  const created = new Date(createdAtIso);
  const expiry = new Date(created.getTime() + retentionDays * 86_400_000);
  return new Date(nowIso) > expiry;
}

export type AssetRetentionRule = {
  contentType: "video" | "audio" | "image" | "text" | "thumbnail";
  retainAfterDeletion: boolean;
  gracePeriodDays: number;
};

export const ASSET_RETENTION_RULES: readonly AssetRetentionRule[] = [
  { contentType: "video", retainAfterDeletion: false, gracePeriodDays: 30 },
  { contentType: "audio", retainAfterDeletion: false, gracePeriodDays: 30 },
  { contentType: "image", retainAfterDeletion: false, gracePeriodDays: 30 },
  { contentType: "text", retainAfterDeletion: false, gracePeriodDays: 14 },
  { contentType: "thumbnail", retainAfterDeletion: false, gracePeriodDays: 7 },
] as const;

export function shouldDeleteAsset(
  contentType: AssetRetentionRule["contentType"],
  deletedAtIso: string,
  nowIso: string
): boolean {
  const rule = ASSET_RETENTION_RULES.find((r) => r.contentType === contentType);
  if (!rule) return false;
  const deletedAt = new Date(deletedAtIso);
  const deadline = new Date(deletedAt.getTime() + rule.gracePeriodDays * 86_400_000);
  return new Date(nowIso) > deadline;
}

export type PitrConfig = {
  enabled: boolean;
  retentionDays: number;
  snapshotIntervalHours: number;
};

export const DEFAULT_PITR_CONFIG: PitrConfig = {
  enabled: true,
  retentionDays: 30,
  snapshotIntervalHours: 1,
};
