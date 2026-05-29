import { tooManyRequests } from "@/lib/bff/http";
import type { NextResponse } from "next/server";

type WindowEntry = { count: number; resetAt: number };

// In-process sliding window store. Works per-instance; sufficient for proof
// and rate-abuse prevention. Replace with Redis/Upstash for distributed deployments.
const store = new Map<string, WindowEntry>();

export type RateLimitConfig = {
  /** Max requests per window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
};

export const RATE_LIMITS = {
  /** Public, unauthenticated reads — generous. */
  public: { limit: 120, windowMs: 60_000 },
  /** Authenticated reads — standard. */
  authenticated: { limit: 60, windowMs: 60_000 },
  /** Mutation endpoints — stricter. */
  mutation: { limit: 30, windowMs: 60_000 },
  /** Compute-heavy paths: taste graph, recommendations. */
  computeHeavy: { limit: 10, windowMs: 60_000 },
  /** Dispatch send/receive paths — protect fan-out. */
  dispatch: { limit: 20, windowMs: 60_000 },
  /** Governance case filing — prevent abuse. */
  governance: { limit: 5, windowMs: 60_000 },
} satisfies Record<string, RateLimitConfig>;

function resolveKey(identifier: string, scope: string): string {
  return `${scope}:${identifier}`;
}

function resolveIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  scope: string,
  identifier?: string
): { ok: true } | { ok: false; response: NextResponse<{ error: string }> } {
  const id = identifier ?? resolveIdentifier(request);
  const key = resolveKey(id, scope);
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(key, entry);
  }

  entry.count += 1;

  if (entry.count > config.limit) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return {
      ok: false,
      response: tooManyRequests("rate limit exceeded", {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(config.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
      }),
    };
  }

  return { ok: true };
}

/** Purge expired entries to prevent unbounded memory growth in long-lived processes. */
export function pruneRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}
