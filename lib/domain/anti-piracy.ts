export type EncryptionScheme = "aes_128_cbc" | "aes_128_ctr" | "sample_aes";

export type EncryptedSegmentConfig = {
  scheme: EncryptionScheme;
  keyRotationIntervalSec: number;
  protocol: "hls" | "dash";
};

export const DEFAULT_ENCRYPTION_CONFIG: EncryptedSegmentConfig = {
  scheme: "aes_128_cbc",
  keyRotationIntervalSec: 300,
  protocol: "hls",
};

export type DeviceFingerprint = {
  id: string;
  accountId: string;
  fingerprint: string;
  userAgent: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export const MAX_CONCURRENT_STREAMS = 3;

export function exceedsConcurrentStreamLimit(activeStreams: number): boolean {
  return activeStreams >= MAX_CONCURRENT_STREAMS;
}

export type ImpossibleTravelCheck = {
  accountId: string;
  previousLoginGeo: string;
  currentLoginGeo: string;
  timeBetweenMs: number;
  maxPlausibleSpeedKmh: number;
  distanceKm: number;
  flagged: boolean;
};

export const IMPOSSIBLE_TRAVEL_SPEED_KMH = 900;

export function isImpossibleTravel(distanceKm: number, timeBetweenMs: number): boolean {
  const hours = timeBetweenMs / 3_600_000;
  if (hours <= 0) return true;
  return distanceKm / hours > IMPOSSIBLE_TRAVEL_SPEED_KMH;
}

export type ContentFingerprint = {
  dropId: string;
  mediaType: "audio" | "video" | "image";
  fingerprintHash: string;
  generatedAt: string;
};

export type DuplicateCandidate = {
  sourceDropId: string;
  candidateDropId: string;
  similarity: number;
  mediaType: "audio" | "video" | "image";
  status: "pending_review" | "confirmed_duplicate" | "dismissed" | "original_notified";
};

export const DUPLICATE_SIMILARITY_THRESHOLD = 0.92;

export function isSuspectedDuplicate(similarity: number): boolean {
  return similarity >= DUPLICATE_SIMILARITY_THRESHOLD;
}

export type DraftAccessLog = {
  dropId: string;
  viewerAccountId: string;
  viewedAt: string;
  accessType: "creator" | "collaborator" | "ops";
};

export type PreReleaseEncryption = {
  dropId: string;
  encryptedAtRest: boolean;
  accessScope: "creator_only" | "collaborators" | "ops_preview";
};

export function isPreReleaseAccessAllowed(
  encryption: PreReleaseEncryption,
  role: "creator" | "collaborator" | "ops"
): boolean {
  switch (encryption.accessScope) {
    case "creator_only":
      return role === "creator";
    case "collaborators":
      return role === "creator" || role === "collaborator";
    case "ops_preview":
      return true;
  }
}

export type AnomalousConsumptionPattern = {
  accountId: string;
  pattern: "bulk_download" | "rapid_sequential" | "automated_scraping" | "credential_sharing";
  confidence: number;
  detectedAt: string;
  action: "flag" | "throttle" | "block";
};

export const ANOMALY_CONFIDENCE_THRESHOLD = 0.8;

export function resolveAnomalyAction(confidence: number): "flag" | "throttle" | "block" {
  if (confidence >= 0.95) return "block";
  if (confidence >= 0.85) return "throttle";
  return "flag";
}

export const ANTI_PIRACY_POLICY_DISCLOSURE =
  "the platform's content protection measures are publicly documented. " +
  "creators and collectors can review what protections are in place " +
  "and how suspected piracy is detected and handled.";
