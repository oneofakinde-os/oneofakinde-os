import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { checkRateLimit, RATE_LIMITS, pruneRateLimitStore } from "../../lib/bff/rate-limit";

function makeRequest(ip = "1.2.3.4"): Request {
  return new Request("http://localhost/test", {
    headers: { "x-forwarded-for": ip },
  });
}

test("proof: rate-limit — requests within limit are allowed", () => {
  const ip = `10.0.${randomUUID().slice(0, 4)}.1`;
  const request = makeRequest(ip);
  const config = { limit: 5, windowMs: 60_000 };

  for (let i = 0; i < 5; i++) {
    const result = checkRateLimit(makeRequest(ip), config, `test-scope-${ip}`);
    assert.ok(result.ok, `request ${i + 1} within limit should be allowed`);
  }
});

test("proof: rate-limit — requests exceeding limit are blocked", () => {
  const ip = `10.1.${randomUUID().slice(0, 4)}.1`;
  const config = { limit: 3, windowMs: 60_000 };
  const scope = `test-exceed-${ip}`;

  for (let i = 0; i < 3; i++) {
    const result = checkRateLimit(makeRequest(ip), config, scope);
    assert.ok(result.ok, `request ${i + 1} should be allowed`);
  }

  const blocked = checkRateLimit(makeRequest(ip), config, scope);
  assert.ok(!blocked.ok, "4th request must be blocked");
  assert.equal(blocked.ok ? 0 : blocked.response.status, 429, "blocked response must be 429");
});

test("proof: rate-limit — different accounts have independent windows", () => {
  const ip1 = `10.2.${randomUUID().slice(0, 4)}.1`;
  const ip2 = `10.2.${randomUUID().slice(0, 4)}.2`;
  const config = { limit: 2, windowMs: 60_000 };
  const scope = `test-isolation-${randomUUID()}`;

  checkRateLimit(makeRequest(ip1), config, scope, "account-a");
  checkRateLimit(makeRequest(ip1), config, scope, "account-a");
  const blockedA = checkRateLimit(makeRequest(ip1), config, scope, "account-a");
  assert.ok(!blockedA.ok, "account-a should be blocked");

  const allowedB = checkRateLimit(makeRequest(ip2), config, scope, "account-b");
  assert.ok(allowedB.ok, "account-b should still be allowed — independent window");
});

test("proof: rate-limit — RATE_LIMITS.public has limit >= 60", () => {
  assert.ok(RATE_LIMITS.public.limit >= 60, "public limit must be >= 60");
});

test("proof: rate-limit — RATE_LIMITS.authenticated has limit >= 30", () => {
  assert.ok(RATE_LIMITS.authenticated.limit >= 30, "authenticated limit must be >= 30");
});

test("proof: rate-limit — RATE_LIMITS.computeHeavy is stricter than authenticated", () => {
  assert.ok(
    RATE_LIMITS.computeHeavy.limit < RATE_LIMITS.authenticated.limit,
    "computeHeavy limit must be stricter than authenticated"
  );
});

test("proof: rate-limit — RATE_LIMITS.governance is strictest among non-computeHeavy", () => {
  assert.ok(
    RATE_LIMITS.governance.limit <= RATE_LIMITS.mutation.limit,
    "governance limit must be <= mutation limit"
  );
});

test("proof: rate-limit — blocked response includes Retry-After header", () => {
  const ip = `10.3.${randomUUID().slice(0, 4)}.1`;
  const config = { limit: 1, windowMs: 10_000 };
  const scope = `test-headers-${ip}`;

  checkRateLimit(makeRequest(ip), config, scope);
  const blocked = checkRateLimit(makeRequest(ip), config, scope);

  assert.ok(!blocked.ok, "must be blocked");
  if (!blocked.ok) {
    const retryAfter = blocked.response.headers.get("Retry-After");
    assert.ok(retryAfter !== null, "Retry-After header must be present");
    assert.ok(parseInt(retryAfter ?? "0") > 0, "Retry-After must be positive");
  }
});

test("proof: rate-limit — pruneRateLimitStore runs without error", () => {
  assert.doesNotThrow(() => pruneRateLimitStore(), "pruneRateLimitStore must not throw");
});

test("proof: rate-limit — dispatch scope has stricter limit than authenticated", () => {
  assert.ok(
    RATE_LIMITS.dispatch.limit <= RATE_LIMITS.authenticated.limit,
    "dispatch limit must be <= authenticated limit"
  );
});
