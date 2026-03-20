import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

type CanaryRolloutStatus = {
  rollout_plan?: {
    strategy?: string;
    required_stages?: Array<{
      id?: string;
      traffic_percent?: number;
      hold_minutes?: number;
      status?: string;
    }>;
    abort_thresholds?: Record<string, number>;
    rollback?: {
      trigger_on_any_abort_threshold_breach?: boolean;
      max_time_to_mitigate_minutes?: number;
      communication_channel?: string;
      status?: string;
    };
  };
  latest_canary_execution?: {
    run_id?: string;
    candidate_sha?: string;
    disposition?: string;
  };
  status?: string;
};

type ReleaseProvenance = {
  canonical_release?: {
    main_sha?: string;
  };
};

type LaunchCertificationStatus = {
  latest_certification?: {
    git_sha?: string;
  };
};

async function readRepoFile(relativePath: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("proof: canary rollout contract remains PASS with staged traffic monotonicity", async () => {
  const statusText = await readRepoFile("config/canary-rollout-status.json");
  const status = JSON.parse(statusText) as CanaryRolloutStatus;

  assert.equal(status.rollout_plan?.strategy, "staged-canary");
  assert.equal(status.status, "PASS");
  assert.equal(status.latest_canary_execution?.disposition, "PASS");
  assert.match(status.latest_canary_execution?.candidate_sha ?? "", /^[0-9a-f]{40}$/);

  const stages = status.rollout_plan?.required_stages ?? [];
  assert.ok(stages.length >= 3, "must include at least 3 canary stages");
  let previousTraffic = 0;
  for (const stage of stages) {
    assert.equal(stage.status, "PASS", `stage must be PASS (${stage.id ?? "unknown"})`);
    assert.ok((stage.hold_minutes ?? 0) >= 10, `stage hold must be >=10 (${stage.id ?? "unknown"})`);
    const traffic = stage.traffic_percent ?? 0;
    assert.ok(traffic > previousTraffic, `traffic must increase monotonically (${stage.id ?? "unknown"})`);
    previousTraffic = traffic;
  }
  assert.equal(stages[stages.length - 1]?.traffic_percent, 100, "final stage must be 100%");

  assert.ok((status.rollout_plan?.abort_thresholds?.error_rate_percent_max ?? 0) > 0);
  assert.ok((status.rollout_plan?.abort_thresholds?.p95_latency_ms_max ?? 0) > 0);
  assert.ok((status.rollout_plan?.abort_thresholds?.checkout_failure_percent_max ?? 0) > 0);
  assert.ok((status.rollout_plan?.abort_thresholds?.live_join_failure_percent_max ?? 0) > 0);
  assert.equal(status.rollout_plan?.rollback?.trigger_on_any_abort_threshold_breach, true);
  assert.equal(status.rollout_plan?.rollback?.status, "PASS");
  assert.ok((status.rollout_plan?.rollback?.max_time_to_mitigate_minutes ?? 0) > 0);
  assert.match(status.rollout_plan?.rollback?.communication_channel ?? "", /^#/);
});

test("proof: canary rollout candidate sha aligns with release provenance and launch certification", async () => {
  const [canaryText, provenanceText, launchText] = await Promise.all([
    readRepoFile("config/canary-rollout-status.json"),
    readRepoFile("config/release-provenance.json"),
    readRepoFile("config/launch-certification-status.json")
  ]);

  const canary = JSON.parse(canaryText) as CanaryRolloutStatus;
  const provenance = JSON.parse(provenanceText) as ReleaseProvenance;
  const launch = JSON.parse(launchText) as LaunchCertificationStatus;

  const candidateSha = canary.latest_canary_execution?.candidate_sha;
  assert.equal(candidateSha, provenance.canonical_release?.main_sha);
  assert.equal(candidateSha, launch.latest_certification?.git_sha);
});

test("proof: canary rollout docs and governance wiring remain enforced", async () => {
  const [canaryDoc, readme, runbookDoc, rolloutDoc] = await Promise.all([
    readRepoFile("docs/architecture/CANARY_ROLLOUT.md"),
    readRepoFile("docs/architecture/README.md"),
    readRepoFile("docs/architecture/RC_VERIFICATION_RUNBOOK.md"),
    readRepoFile("docs/architecture/ROLL_OUT_PLAYBOOK.md")
  ]);

  assert.match(canaryDoc, /Canary Rollout Certification \(RY-17\)/);
  assert.match(readme, /CANARY_ROLLOUT\.md/);
  assert.match(runbookDoc, /check:canary-rollout-status/);
  assert.match(runbookDoc, /CANARY_ROLLOUT\.md/);
  assert.match(rolloutDoc, /config\/canary-rollout-status\.json/);
  assert.match(rolloutDoc, /CANARY_ROLLOUT\.md/);
});
