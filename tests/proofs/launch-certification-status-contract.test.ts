import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

type LaunchCertificationStatus = {
  required_user_journeys?: Array<{
    id?: string;
    required_rc_checks?: string[];
    status?: string;
  }>;
  required_ops_readiness?: Array<{
    id?: string;
    status?: string;
  }>;
  latest_certification?: {
    report_path?: string;
    git_sha?: string;
    disposition?: string;
    post_rollout_watch_window_minutes?: number;
    sha_lock?: {
      local_head_sha?: string;
      github_main_sha?: string;
      vercel_deployment_sha?: string;
    };
  };
};

type RcDryRunReport = {
  summary?: {
    failed?: number;
  };
  results?: Array<{
    id?: string;
    status?: string;
  }>;
};

async function readRepoFile(relativePath: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("proof: launch certification contract remains full-launch PASS with SHA lock", async () => {
  const statusText = await readRepoFile("config/launch-certification-status.json");
  const status = JSON.parse(statusText) as LaunchCertificationStatus;

  const requiredJourneys = [
    "collector-session-bootstrap",
    "drop-checkout-receipt-certificate",
    "watch-entitlement-and-townhall-social",
    "live-session-artifacts-visibility",
    "workshop-pro-state-machine-and-paywall-elimination",
    "library-queue-recall-and-world-eligibility"
  ];

  const journeyIds = new Set((status.required_user_journeys ?? []).map((journey) => journey.id ?? ""));
  for (const requiredJourney of requiredJourneys) {
    assert.ok(journeyIds.has(requiredJourney), `missing required journey ${requiredJourney}`);
  }
  for (const journey of status.required_user_journeys ?? []) {
    assert.equal(journey.status, "PASS", `journey must stay PASS (${journey.id ?? "unknown"})`);
    assert.ok((journey.required_rc_checks ?? []).length > 0, "journey must map at least one rc check");
  }

  const requiredOpsGates = [
    "sha-lock-parity",
    "release-governance-gate",
    "abort-and-rollback-rules",
    "post-rollout-watch-window"
  ];
  const opsGateIds = new Set((status.required_ops_readiness ?? []).map((gate) => gate.id ?? ""));
  for (const requiredGate of requiredOpsGates) {
    assert.ok(opsGateIds.has(requiredGate), `missing required ops gate ${requiredGate}`);
  }
  for (const gate of status.required_ops_readiness ?? []) {
    assert.equal(gate.status, "PASS", `ops gate must stay PASS (${gate.id ?? "unknown"})`);
  }

  const latest = status.latest_certification;
  assert.ok(latest, "latest_certification is required");
  assert.equal(latest?.disposition, "PASS");
  assert.ok((latest?.post_rollout_watch_window_minutes ?? 0) >= 30);
  assert.match(latest?.git_sha ?? "", /^[0-9a-f]{40}$/);
  assert.equal(latest?.sha_lock?.local_head_sha, latest?.sha_lock?.github_main_sha);
  assert.equal(latest?.sha_lock?.local_head_sha, latest?.sha_lock?.vercel_deployment_sha);
  assert.equal(latest?.sha_lock?.local_head_sha, latest?.git_sha);
});

test("proof: launch certification evidence report includes all automated rc checks passing", async () => {
  const statusText = await readRepoFile("config/launch-certification-status.json");
  const status = JSON.parse(statusText) as LaunchCertificationStatus;
  const reportPath = status.latest_certification?.report_path ?? "artifacts/release-candidate-dry-run.latest.json";

  const reportText = await readRepoFile(reportPath);
  const report = JSON.parse(reportText) as RcDryRunReport;

  assert.equal(report.summary?.failed, 0, "dry-run report must have zero failed checks");

  const resultById = new Map(
    (report.results ?? []).map((result) => [result.id ?? "", result.status ?? ""])
  );
  for (const rcId of [
    "rc-01",
    "rc-02",
    "rc-03",
    "rc-04",
    "rc-05",
    "rc-06",
    "rc-07",
    "rc-08",
    "rc-09"
  ]) {
    assert.equal(resultById.get(rcId), "pass", `expected ${rcId} to pass in dry-run report`);
  }
});

test("proof: launch certification docs are indexed and runbook-wired", async () => {
  const [readme, launchDoc, runbookDoc, rolloutDoc] = await Promise.all([
    readRepoFile("docs/architecture/README.md"),
    readRepoFile("docs/architecture/LAUNCH_CERTIFICATION.md"),
    readRepoFile("docs/architecture/RC_VERIFICATION_RUNBOOK.md"),
    readRepoFile("docs/architecture/ROLL_OUT_PLAYBOOK.md")
  ]);

  assert.match(readme, /LAUNCH_CERTIFICATION\.md/);
  assert.match(launchDoc, /Launch Certification Status \(RY-15\)/);
  assert.match(runbookDoc, /check:launch-certification-status/);
  assert.match(runbookDoc, /LAUNCH_CERTIFICATION\.md/);
  assert.match(rolloutDoc, /config\/launch-certification-status\.json/);
  assert.match(rolloutDoc, /LAUNCH_CERTIFICATION\.md/);
});
