import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getFeatureFlagSnapshot,
  getFeatureFlagContract,
  isFeatureEnabled,
} from "@/lib/ops/feature-flags";

describe("feature flags — Sprint 0.1 expansion", () => {
  it("contract contains at least 16 flags (6 existing + 10 Sprint 0.1)", () => {
    const contract = getFeatureFlagContract();
    assert.ok(contract.flags.length >= 16, `expected >= 16 flags, got ${contract.flags.length}`);
  });

  it("all new Sprint 0.1 flags are present", () => {
    const contract = getFeatureFlagContract();
    const keys = new Set(contract.flags.map((f) => f.key));

    const newFlags = [
      "ff_oauth_signup",
      "ff_account_deletion",
      "ff_email_notifications",
      "ff_hashtag_search",
      "ff_resale_marketplace",
      "ff_sensitivity_ratings",
      "ff_patron_commitments",
      "ff_dm_attachments",
      "ff_developer_api",
      "ff_audit_log",
    ];

    for (const flag of newFlags) {
      assert.ok(keys.has(flag), `flag "${flag}" missing from contract`);
    }
  });

  it("new flags are dark in production", () => {
    const snapshot = getFeatureFlagSnapshot({ runtime: "production" });

    const shouldBeFalseInProd = [
      "ff_oauth_signup",
      "ff_account_deletion",
      "ff_email_notifications",
      "ff_hashtag_search",
      "ff_resale_marketplace",
      "ff_sensitivity_ratings",
      "ff_patron_commitments",
      "ff_dm_attachments",
      "ff_developer_api",
      "ff_audit_log",
    ] as const;

    for (const key of shouldBeFalseInProd) {
      assert.equal(
        snapshot[key],
        false,
        `flag "${key}" should be false in production`
      );
    }
  });

  it("ff_account_deletion and ff_audit_log are enabled in development", () => {
    const snapshot = getFeatureFlagSnapshot({ runtime: "development" });
    assert.equal(snapshot.ff_account_deletion, true);
    assert.equal(snapshot.ff_audit_log, true);
  });

  it("existing flags are unchanged", () => {
    const snapshot = getFeatureFlagSnapshot({ runtime: "production" });
    assert.equal(snapshot.surface_live_now, true);
    assert.equal(snapshot.analytics_panels_v0, true);
    assert.equal(snapshot.showroom_featured_lane, true);
    assert.equal(snapshot.collect_auctions_lane, true);
    assert.equal(snapshot.watch_quality_ladder, true);
    assert.equal(snapshot.drop_lineage_surfaces, true);
  });

  it("every flag has a valid rollout value", () => {
    const contract = getFeatureFlagContract();
    const validRollouts = new Set(["dark", "beta", "ga"]);
    for (const flag of contract.flags) {
      assert.ok(
        validRollouts.has(flag.rollout),
        `flag "${flag.key}" has invalid rollout: ${flag.rollout}`
      );
    }
  });

  it("every flag has an owner assigned", () => {
    const contract = getFeatureFlagContract();
    for (const flag of contract.flags) {
      assert.ok(flag.owner.length > 0, `flag "${flag.key}" has no owner`);
    }
  });

  it("isFeatureEnabled works with new flags", () => {
    assert.equal(
      isFeatureEnabled("ff_audit_log", { runtime: "development" }),
      true
    );
    assert.equal(
      isFeatureEnabled("ff_audit_log", { runtime: "production" }),
      false
    );
  });

  it("all 3 runtimes define at least 16 flags", () => {
    for (const runtime of ["development", "preview", "production"] as const) {
      const snapshot = getFeatureFlagSnapshot({ runtime });
      const keys = Object.keys(snapshot);
      assert.ok(keys.length >= 16, `runtime "${runtime}" has ${keys.length} flags, expected >= 16`);
    }
  });

  it("contract version was bumped to train7-m3", () => {
    const contract = getFeatureFlagContract();
    assert.equal(contract.version, "train7-m3");
  });
});
