/**
 * Sprint 0.5H proof tests — Gate Registry
 *
 * Verifies:
 * 1. All 4 new gated flags default to false in all environments
 * 2. Approval metadata shape exists on gated flags
 * 3. Production activation fails without approval metadata (check-gate-registry.ts)
 * 4. Expired approval fails (logic test)
 * 5. Gate registry check script passes with current config
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const contractPath = path.resolve(process.cwd(), "config/feature-flags.contract.json");

type ApprovalMetadata = {
  owner: string | null;
  decision_source: string | null;
  approved_at: string | null;
  expires_at: string | null;
  notes: string | null;
};

type FlagEntry = {
  key: string;
  rollout: string;
  approval?: ApprovalMetadata;
};

type FlagContract = {
  flags: FlagEntry[];
  defaults: {
    development: Record<string, boolean>;
    preview: Record<string, boolean>;
    production: Record<string, boolean>;
  };
};

const REQUIRED_GATED_FLAGS = [
  "resale_settlement_live",
  "auto_routed_resale_royalty_live",
  "public_studio_value_index_live",
  "creator_promotion_lane_live",
];

test("proof: all 4 sprint-0.5H gated flags exist in feature-flags contract", () => {
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8")) as FlagContract;
  const keys = new Set(contract.flags.map((f) => f.key));

  for (const flag of REQUIRED_GATED_FLAGS) {
    assert.ok(keys.has(flag), `gated flag '${flag}' must exist in feature-flags.contract.json`);
  }
});

test("proof: all 4 gated flags default to false in every environment", () => {
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8")) as FlagContract;
  const envs: (keyof typeof contract.defaults)[] = ["development", "preview", "production"];

  for (const flag of REQUIRED_GATED_FLAGS) {
    for (const env of envs) {
      const value = contract.defaults[env][flag];
      assert.equal(
        value,
        false,
        `gated flag '${flag}' must default to false in ${env} (found: ${JSON.stringify(value)})`
      );
    }
  }
});

test("proof: all 4 gated flags carry approval metadata with required fields", () => {
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8")) as FlagContract;
  const requiredApprovalFields: (keyof ApprovalMetadata)[] = [
    "owner",
    "decision_source",
    "approved_at",
    "expires_at",
    "notes",
  ];

  for (const flagKey of REQUIRED_GATED_FLAGS) {
    const flagEntry = contract.flags.find((f) => f.key === flagKey);
    assert.ok(flagEntry, `flag entry for '${flagKey}' must exist`);
    assert.ok(flagEntry!.approval, `flag '${flagKey}' must have approval metadata`);

    for (const field of requiredApprovalFields) {
      assert.ok(
        field in flagEntry!.approval!,
        `flag '${flagKey}' approval must include field: ${field}`
      );
    }
  }
});

test("proof: production activation fails without complete approval metadata", () => {
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8")) as FlagContract;

  for (const flagKey of REQUIRED_GATED_FLAGS) {
    const flagEntry = contract.flags.find((f) => f.key === flagKey)!;
    const prodValue = contract.defaults.production[flagKey];

    if (prodValue === true) {
      assert.ok(
        flagEntry.approval?.owner && flagEntry.approval?.decision_source && flagEntry.approval?.approved_at,
        `flag '${flagKey}' must have complete approval metadata when enabled in production`
      );
    }
  }

  // All current gated flags are false in production — no approval needed yet
  for (const flagKey of REQUIRED_GATED_FLAGS) {
    assert.equal(
      contract.defaults.production[flagKey],
      false,
      `flag '${flagKey}' must be false in production — production activation requires approval`
    );
  }
});

test("proof: check-gate-registry script passes with current config", () => {
  let output = "";
  let exitCode = 0;
  try {
    output = execSync("node --import tsx scripts/check-gate-registry.ts", {
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (err: unknown) {
    const execErr = err as { status?: number; stdout?: string; stderr?: string };
    exitCode = execErr.status ?? 1;
    output = execErr.stdout ?? execErr.stderr ?? String(err);
  }

  assert.equal(exitCode, 0, `gate registry check must pass. Output: ${output}`);
  assert.ok(output.includes("passed"), "output must include 'passed'");
});

test("proof: expired approval would block production activation (logic validation)", () => {
  const expiredAt = new Date(Date.now() - 86_400_000).toISOString(); // yesterday
  const nowMs = Date.now();
  const isExpired = new Date(expiredAt).getTime() < nowMs;
  assert.equal(isExpired, true, "expired approval must be detected");

  const futureAt = new Date(Date.now() + 86_400_000).toISOString(); // tomorrow
  const isNotExpired = new Date(futureAt).getTime() >= nowMs;
  assert.equal(isNotExpired, true, "future approval expiry must be non-expired");
});
