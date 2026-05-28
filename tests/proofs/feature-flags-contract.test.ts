import assert from "node:assert/strict";
import test from "node:test";
import featureFlagsContract from "../../config/feature-flags.contract.json";
import { GET as getMyCollectionAnalyticsRoute } from "../../app/api/v1/analytics/my-collection/route";
import {
  getFeatureFlagSnapshot,
  isFeatureEnabled,
  resolveFeatureFlagRuntime
} from "../../lib/ops/feature-flags";

const ENV_KEYS = [
  "OOK_APP_ENV",
  "VERCEL_ENV",
  "OOK_FEATURE_FLAGS_JSON",
  "OOK_FEATURE_FLAGS",
  "OOK_FF_ANALYTICS_PANELS_V0",
  "OOK_FF_SURFACE_LIVE_NOW",
  "OOK_FF_FF_PROGRESSIVE_MEDIA_UPLOAD"
] as const;

async function withEnv(
  overrides: Partial<Record<(typeof ENV_KEYS)[number], string | null>>,
  run: () => void | Promise<void>
): Promise<void> {
  const runtimeEnv = process.env as Record<string, string | undefined>;
  const previous = new Map<string, string | undefined>();

  for (const key of ENV_KEYS) {
    previous.set(key, runtimeEnv[key]);

    if (!(key in overrides)) {
      continue;
    }

    const value = overrides[key];
    if (value === null || value === undefined) {
      delete runtimeEnv[key];
    } else {
      runtimeEnv[key] = value;
    }
  }

  try {
    await run();
  } finally {
    for (const key of ENV_KEYS) {
      const value = previous.get(key);
      if (value === undefined) {
        delete runtimeEnv[key];
      } else {
        runtimeEnv[key] = value;
      }
    }
  }
}

test("proof: feature flag contract defines complete runtime defaults", () => {
  const keys = featureFlagsContract.flags.map((entry) => entry.key);
  assert.ok(keys.length > 0);

  for (const runtime of ["development", "preview", "production"] as const) {
    const defaults = featureFlagsContract.defaults[runtime];
    assert.ok(defaults);

    for (const key of keys) {
      assert.equal(typeof defaults[key as keyof typeof defaults], "boolean");
    }

    for (const key of Object.keys(defaults)) {
      assert.ok(keys.includes(key), `unexpected default key: ${key}`);
    }
  }
});

test("proof: feature flag runtime and defaults resolve deterministically", async () => {
  await withEnv(
    {
      OOK_APP_ENV: "production",
      VERCEL_ENV: "preview",
      OOK_FEATURE_FLAGS_JSON: null,
      OOK_FEATURE_FLAGS: null,
      OOK_FF_ANALYTICS_PANELS_V0: null
    },
    () => {
      assert.equal(resolveFeatureFlagRuntime(), "production");
      const snapshot = getFeatureFlagSnapshot();
      assert.equal(snapshot.analytics_panels_v0, featureFlagsContract.defaults.production.analytics_panels_v0);
      assert.equal(snapshot.surface_live_now, featureFlagsContract.defaults.production.surface_live_now);
    }
  );
});

test("proof: feature flag overrides apply in documented precedence order", async () => {
  await withEnv(
    {
      OOK_APP_ENV: "preview",
      OOK_FEATURE_FLAGS_JSON: "{\"analytics_panels_v0\":false}",
      OOK_FEATURE_FLAGS: "analytics_panels_v0=true",
      OOK_FF_ANALYTICS_PANELS_V0: "false"
    },
    () => {
      const snapshot = getFeatureFlagSnapshot();
      assert.equal(snapshot.analytics_panels_v0, false);
      assert.equal(isFeatureEnabled("analytics_panels_v0"), false);
    }
  );
});

test("proof: analytics panel route is rollout-gated by feature flag", async () => {
  await withEnv(
    {
      OOK_FF_ANALYTICS_PANELS_V0: "false"
    },
    async () => {
      const response = await getMyCollectionAnalyticsRoute(
        new Request("http://127.0.0.1:3000/api/v1/analytics/my-collection")
      );
      assert.equal(response.status, 503);
      const payload = (await response.json()) as { error?: string };
      assert.match(payload.error ?? "", /analytics panels are disabled/i);
    }
  );
});
