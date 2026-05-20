export type RateLimitConfig = {
  endpoint: string;
  windowMs: number;
  maxRequests: number;
  backoffMultiplier: number;
};

export const DEFAULT_RATE_LIMITS: readonly RateLimitConfig[] = [
  { endpoint: "/api/v1/auth/*", windowMs: 60_000, maxRequests: 10, backoffMultiplier: 2 },
  { endpoint: "/api/v1/drops/*", windowMs: 60_000, maxRequests: 60, backoffMultiplier: 1.5 },
  { endpoint: "/api/v1/collect/*", windowMs: 60_000, maxRequests: 30, backoffMultiplier: 2 },
  { endpoint: "/api/v1/search/*", windowMs: 60_000, maxRequests: 30, backoffMultiplier: 1.5 },
] as const;

export function getRateLimitConfig(endpoint: string): RateLimitConfig | null {
  return DEFAULT_RATE_LIMITS.find((r) => {
    const pattern = r.endpoint.replace("*", "");
    return endpoint.startsWith(pattern);
  }) ?? null;
}

export function isRateLimited(requestCount: number, config: RateLimitConfig): boolean {
  return requestCount >= config.maxRequests;
}

export type CspDirective =
  | "default-src"
  | "script-src"
  | "style-src"
  | "img-src"
  | "media-src"
  | "connect-src"
  | "frame-src";

export type CspPolicy = Record<CspDirective, string[]>;

export const DEFAULT_CSP_POLICY: CspPolicy = {
  "default-src": ["'self'"],
  "script-src": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "https:"],
  "media-src": ["'self'", "https:"],
  "connect-src": ["'self'", "https:"],
  "frame-src": ["'none'"],
};

export function buildCspHeader(policy: CspPolicy): string {
  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}

export type AuditLogEntry = {
  id: string;
  actorId: string;
  actorRole: "user" | "agent" | "system";
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string | null;
  performedAt: string;
};

export type AuditLogImmutabilityConfig = {
  appendOnly: boolean;
  retentionDays: number;
  hashChainEnabled: boolean;
};

export const AUDIT_LOG_CONFIG: AuditLogImmutabilityConfig = {
  appendOnly: true,
  retentionDays: 2555,
  hashChainEnabled: true,
};

export type SecretRotationPolicy = {
  secretType: string;
  rotationIntervalDays: number;
  lastRotatedAt: string | null;
  nextRotationDue: string | null;
};

export function isRotationDue(policy: SecretRotationPolicy, nowIso: string): boolean {
  if (!policy.nextRotationDue) return true;
  return nowIso >= policy.nextRotationDue;
}

export type PiiCategory =
  | "email"
  | "name"
  | "address"
  | "phone"
  | "payment_method"
  | "device_fingerprint"
  | "ip_address"
  | "location";

export type PiiInventoryEntry = {
  dataStore: string;
  field: string;
  category: PiiCategory;
  encrypted: boolean;
  retentionDays: number | null;
  purpose: string;
};

export type EncryptionAtRestConfig = {
  dataStore: string;
  algorithm: "aes-256-gcm" | "aes-256-cbc";
  keyManagement: "kms" | "vault";
  enabled: boolean;
};

export type DependencyVulnerability = {
  packageName: string;
  currentVersion: string;
  severity: "critical" | "high" | "medium" | "low";
  fixedInVersion: string | null;
  cveId: string | null;
  detectedAt: string;
};

export function isBlockingSeverity(severity: DependencyVulnerability["severity"]): boolean {
  return severity === "critical" || severity === "high";
}

export type BotDetectionMethod = "captcha" | "proof_of_work" | "behavioral" | "rate_limit";

export const BOT_DETECTION_METHODS: readonly BotDetectionMethod[] = [
  "captcha",
  "proof_of_work",
  "behavioral",
  "rate_limit",
];
