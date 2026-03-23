/**
 * Sliding-window in-memory rate limiter.
 *
 * No external dependencies. Each bucket tracks request timestamps
 * and evicts entries outside the window. Old buckets are garbage-collected
 * periodically to prevent memory leaks.
 *
 * For serverless (Vercel), the in-memory store resets per cold start.
 * This provides per-instance protection; for global rate limiting,
 * upgrade to Redis/Upstash in the future.
 */

type RateLimitBucket = {
  timestamps: number[];
  lastAccess: number;
};

export type RateLimitConfig = {
  /** Maximum requests allowed within the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterMs?: number;
};

const store = new Map<string, RateLimitBucket>();

// Garbage-collect stale buckets every 60 seconds.
const GC_INTERVAL_MS = 60_000;
const GC_STALE_MS = 300_000; // 5 minutes idle = evict
let lastGc = Date.now();

function gc(now: number): void {
  if (now - lastGc < GC_INTERVAL_MS) return;
  lastGc = now;

  for (const [key, bucket] of store) {
    if (now - bucket.lastAccess > GC_STALE_MS) {
      store.delete(key);
    }
  }
}

/**
 * Check rate limit for a given key.
 * Returns whether the request is allowed and standard rate-limit metadata.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  gc(now);

  const windowStart = now - config.windowMs;

  let bucket = store.get(key);
  if (!bucket) {
    bucket = { timestamps: [], lastAccess: now };
    store.set(key, bucket);
  }

  // Evict timestamps outside the window.
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);
  bucket.lastAccess = now;

  const remaining = Math.max(0, config.limit - bucket.timestamps.length);

  if (bucket.timestamps.length >= config.limit) {
    // Calculate when the oldest request in the window will expire.
    const oldestInWindow = bucket.timestamps[0] ?? now;
    const retryAfterMs = Math.max(0, oldestInWindow + config.windowMs - now);

    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      resetMs: retryAfterMs,
      retryAfterMs
    };
  }

  bucket.timestamps.push(now);

  return {
    allowed: true,
    limit: config.limit,
    remaining: remaining - 1,
    resetMs: config.windowMs
  };
}

/**
 * Standard rate limit headers for responses.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000))
  };

  if (!result.allowed && result.retryAfterMs !== undefined) {
    headers["Retry-After"] = String(Math.ceil(result.retryAfterMs / 1000));
  }

  return headers;
}

// ─── Pre-configured limiters for common use cases ──────────────────

/** Auth endpoints: 10 requests per 60 seconds per IP. */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  limit: 10,
  windowMs: 60_000
};

/** Media upload: 20 requests per 60 seconds per account. */
export const UPLOAD_RATE_LIMIT: RateLimitConfig = {
  limit: 20,
  windowMs: 60_000
};

/** General API: 120 requests per 60 seconds per IP. */
export const API_RATE_LIMIT: RateLimitConfig = {
  limit: 120,
  windowMs: 60_000
};

/** Password reset: 3 requests per 5 minutes per IP. */
export const PASSWORD_RESET_RATE_LIMIT: RateLimitConfig = {
  limit: 3,
  windowMs: 300_000
};
