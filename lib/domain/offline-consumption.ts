export type OfflineDownload = {
  id: string;
  dropId: string;
  accountId: string;
  quality: "low" | "standard" | "high" | "original";
  sizeBytes: number;
  downloadedAt: string;
  expiresAt: string;
  status: "downloading" | "ready" | "expired" | "revoked";
};

export type OfflineEntitlementCheck = {
  dropId: string;
  accountId: string;
  entitled: boolean;
  offlineAllowed: boolean;
  maxDownloadQuality: OfflineDownload["quality"];
};

export function isOfflineDownloadValid(
  download: OfflineDownload,
  nowIso: string
): boolean {
  return download.status === "ready" && nowIso <= download.expiresAt;
}

export const OFFLINE_DOWNLOAD_EXPIRY_DAYS = 30;

export function computeOfflineExpiry(downloadedAtIso: string): string {
  const d = new Date(downloadedAtIso);
  d.setDate(d.getDate() + OFFLINE_DOWNLOAD_EXPIRY_DAYS);
  return d.toISOString();
}

export type OfflineStorageLimit = {
  accountId: string;
  maxStorageBytes: number;
  usedStorageBytes: number;
};

export function hasOfflineStorageAvailable(
  limit: OfflineStorageLimit,
  newDownloadBytes: number
): boolean {
  return limit.usedStorageBytes + newDownloadBytes <= limit.maxStorageBytes;
}

export type OfflineSync = {
  accountId: string;
  lastSyncedAt: string;
  pendingUploads: number;
};
