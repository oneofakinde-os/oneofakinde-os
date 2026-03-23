import { NextResponse } from "next/server";
import {
  checkRateLimit,
  rateLimitHeaders,
  type RateLimitConfig
} from "./rate-limit";

// Re-export configs for convenience.
export {
  AUTH_RATE_LIMIT,
  UPLOAD_RATE_LIMIT,
  API_RATE_LIMIT,
  PASSWORD_RESET_RATE_LIMIT
} from "./rate-limit";

type RateLimitGuardResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

/**
 * Extracts the client IP from a request.
 * Vercel sets `x-forwarded-for`; falls back to "unknown".
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Apply rate limiting to an API route.
 *
 * Usage:
 * ```ts
 * const guard = applyRateLimit(request, AUTH_RATE_LIMIT);
 * if (!guard.ok) return guard.response;
 * ```
 *
 * The key is derived from the client IP + route path by default.
 * Pass a custom `keyPrefix` to scope by account ID instead.
 */
export function applyRateLimit(
  request: Request,
  config: RateLimitConfig,
  options?: { keyPrefix?: string }
): RateLimitGuardResult {
  const ip = getClientIp(request);
  const path = new URL(request.url).pathname;
  const key = options?.keyPrefix
    ? `${options.keyPrefix}:${path}`
    : `${ip}:${path}`;

  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    const headers = rateLimitHeaders(result);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "too many requests. please try again later." },
        {
          status: 429,
          headers
        }
      )
    };
  }

  return { ok: true };
}

/**
 * Apply rate limiting keyed by IP (for unauthenticated endpoints).
 */
export function applyIpRateLimit(
  request: Request,
  config: RateLimitConfig
): RateLimitGuardResult {
  return applyRateLimit(request, config);
}

/**
 * Apply rate limiting keyed by account ID (for authenticated endpoints).
 */
export function applyAccountRateLimit(
  request: Request,
  accountId: string,
  config: RateLimitConfig
): RateLimitGuardResult {
  return applyRateLimit(request, config, { keyPrefix: `acct:${accountId}` });
}
