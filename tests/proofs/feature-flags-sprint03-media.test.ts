import assert from "node:assert/strict";
import test from "node:test";
import featureFlagsContract from "../../config/feature-flags.contract.json";
import {
  getFeatureFlagSnapshot,
  isFeatureEnabled,
  resolveFeatureFlagRuntime,
} from "../../lib/ops/feature-flags";

const ENV_KEYS = [
  "OOK_APP_ENV",
  "VERCEL_ENV",
  "OOK_FEATURE_FLAGS_JSON",
  "OOK_FEATURE_FLAGS",
  "OOK_FF_FF_PROGRESSIVE_MEDIA_UPLOAD",
] as const;

async function withEnv(
  overrides: Partial<Record<(typeof ENV_KEYS)[number], string | null>>,
  run: () => void | Promise<void>
): Promise<void> {
  const runtimeEnv = process.env as Record<string, string | undefined>;
  const previous = new Map<string, string | undefined>();

  for (const key of ENV_KEYS) {
    previous.set(key, runtimeEnv[key]);
    if (!(key in overrides)) continue;
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

test("proof: ff_progressive_media_upload flag exists in contract", () => {
  const flag = featureFlagsContract.flags.find(
    (f) => f.key === "ff_progressive_media_upload"
  );
  assert.ok(flag, "flag not found in contract");
  assert.equal(flag.owner, "platform-media");
  assert.equal(flag.rollout, "dark");
});

test("proof: ff_progressive_media_upload defaults — enabled in dev, off in preview and production", () => {
  assert.equal(
    featureFlagsContract.defaults.development.ff_progressive_media_upload,
    true
  );
  assert.equal(
    featureFlagsContract.defaults.preview.ff_progressive_media_upload,
    false
  );
  assert.equal(
    featureFlagsContract.defaults.production.ff_progressive_media_upload,
    false
  );
});

test("proof: ff_progressive_media_upload resolves from runtime defaults", async () => {
  await withEnv(
    {
      OOK_APP_ENV: "development",
      OOK_FEATURE_FLAGS_JSON: null,
      OOK_FEATURE_FLAGS: null,
      OOK_FF_FF_PROGRESSIVE_MEDIA_UPLOAD: null,
    },
    () => {
      assert.equal(resolveFeatureFlagRuntime(), "development");
      assert.equal(isFeatureEnabled("ff_progressive_media_upload"), true);
    }
  );

  await withEnv(
    {
      OOK_APP_ENV: "production",
      OOK_FEATURE_FLAGS_JSON: null,
      OOK_FEATURE_FLAGS: null,
      OOK_FF_FF_PROGRESSIVE_MEDIA_UPLOAD: null,
    },
    () => {
      assert.equal(isFeatureEnabled("ff_progressive_media_upload"), false);
    }
  );
});

test("proof: ff_progressive_media_upload can be overridden via env", async () => {
  await withEnv(
    {
      OOK_APP_ENV: "production",
      OOK_FF_FF_PROGRESSIVE_MEDIA_UPLOAD: "true",
    },
    () => {
      assert.equal(isFeatureEnabled("ff_progressive_media_upload"), true);
    }
  );
});

test("proof: contract has 17 flags total after Sprint 0.3 addition", () => {
  assert.equal(featureFlagsContract.flags.length, 17);
});
