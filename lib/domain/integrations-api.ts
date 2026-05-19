export type ApiKeyScope =
  | "read_studio"
  | "read_drops"
  | "read_analytics"
  | "manage_drops"
  | "manage_worlds"
  | "webhooks";

export type ApiKey = {
  id: string;
  accountId: string;
  label: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
};

export function isApiKeyValid(key: ApiKey, nowIso: string): boolean {
  if (key.revoked) return false;
  if (key.expiresAt && nowIso > key.expiresAt) return false;
  return true;
}

export function hasApiScope(key: ApiKey, scope: ApiKeyScope): boolean {
  return key.scopes.includes(scope);
}

export type WebhookSubscription = {
  id: string;
  accountId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
};

export type WebhookDelivery = {
  id: string;
  subscriptionId: string;
  event: string;
  statusCode: number | null;
  deliveredAt: string;
  retryCount: number;
  success: boolean;
};

export const MAX_WEBHOOK_RETRIES = 5;

export function shouldRetryWebhook(delivery: WebhookDelivery): boolean {
  return !delivery.success && delivery.retryCount < MAX_WEBHOOK_RETRIES;
}

export type ExternalLink = {
  studioHandle: string;
  label: string;
  url: string;
  position: number;
};

export type RateLimitTier = {
  tier: "free" | "creator" | "pro";
  requestsPerMinute: number;
};

export const API_RATE_LIMIT_TIERS: readonly RateLimitTier[] = [
  { tier: "free", requestsPerMinute: 30 },
  { tier: "creator", requestsPerMinute: 120 },
  { tier: "pro", requestsPerMinute: 600 },
] as const;
