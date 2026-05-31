import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveProvider } from "@/lib/gateway";

const KEYS = ["OOK_GATEWAY_PROVIDER", "OOK_APP_ENV", "VERCEL_ENV", "NODE_ENV"] as const;

// Evaluate resolveProvider under a controlled environment, then restore the
// original values so sibling tests are unaffected.
function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const env = process.env as Record<string, string | undefined>;
  const saved: Record<string, string | undefined> = {};
  for (const key of KEYS) {
    saved[key] = env[key];
    delete env[key];
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }
  try {
    fn();
  } finally {
    for (const key of KEYS) {
      if (saved[key] === undefined) {
        delete env[key];
      } else {
        env[key] = saved[key];
      }
    }
  }
}

test("proof: provider fail-safe — NO environment signal defaults to the GATED path (bff), not the ungated mock", () => {
  withEnv({}, () => {
    assert.equal(resolveProvider(), "bff");
  });
});

test("proof: provider fail-safe — an explicit OOK_GATEWAY_PROVIDER override always wins", () => {
  withEnv({ OOK_GATEWAY_PROVIDER: "mock" }, () => assert.equal(resolveProvider(), "mock"));
  withEnv({ OOK_GATEWAY_PROVIDER: "bff" }, () => assert.equal(resolveProvider(), "bff"));
  // even alongside a production signal, the explicit override is honored
  withEnv({ OOK_GATEWAY_PROVIDER: "mock", OOK_APP_ENV: "production" }, () =>
    assert.equal(resolveProvider(), "mock")
  );
});

test("proof: provider fail-safe — non-production runtimes ALSO default to the gated bff path (the ungated mock is opt-in only)", () => {
  // dd8f6c9 left non-prod defaulting to the ungated mock, which let a preview run a
  // term-less collect as if it succeeded (mock-mode collect reads a separate store from
  // the terms the UI wrote). Gated-by-default now holds in EVERY runtime.
  withEnv({ NODE_ENV: "development" }, () => assert.equal(resolveProvider(), "bff"));
  withEnv({ OOK_APP_ENV: "development" }, () => assert.equal(resolveProvider(), "bff"));
  withEnv({ OOK_APP_ENV: "test" }, () => assert.equal(resolveProvider(), "bff"));
  withEnv({ VERCEL_ENV: "preview" }, () => assert.equal(resolveProvider(), "bff"));
  withEnv({ VERCEL_ENV: "development" }, () => assert.equal(resolveProvider(), "bff"));
  // the ungated mock is still reachable — but ONLY via the explicit opt-in:
  withEnv({ VERCEL_ENV: "preview", OOK_GATEWAY_PROVIDER: "mock" }, () =>
    assert.equal(resolveProvider(), "mock")
  );
});

test("proof: provider fail-safe — production signals resolve to the gated bff path", () => {
  withEnv({ OOK_APP_ENV: "production" }, () => assert.equal(resolveProvider(), "bff"));
  withEnv({ VERCEL_ENV: "production" }, () => assert.equal(resolveProvider(), "bff"));
  // NODE_ENV=development must NOT override an explicit production app env
  withEnv({ NODE_ENV: "development", OOK_APP_ENV: "production" }, () =>
    assert.equal(resolveProvider(), "bff")
  );
});
