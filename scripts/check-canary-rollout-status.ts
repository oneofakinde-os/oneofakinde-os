import fs from "node:fs";
import path from "node:path";

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

type CanaryStage = {
  id: string;
  traffic_percent: number;
  hold_minutes: number;
  status: "PASS" | "FAIL";
  evidence: string;
};

type CanaryRolloutStatus = {
  version: string;
  source_contracts: string[];
  rollout_plan: {
    strategy: string;
    required_stages: CanaryStage[];
    abort_thresholds: {
      error_rate_percent_max: number;
      p95_latency_ms_max: number;
      checkout_failure_percent_max: number;
      live_join_failure_percent_max: number;
    };
    rollback: {
      trigger_on_any_abort_threshold_breach: boolean;
      max_time_to_mitigate_minutes: number;
      communication_channel: string;
      status: "PASS" | "FAIL";
      evidence: string;
    };
  };
  latest_canary_execution: {
    run_id: string;
    candidate_sha: string;
    workflow_run_url: string;
    vercel_deployment_url: string;
    started_at_utc: string;
    completed_at_utc: string;
    disposition: "PASS" | "FAIL";
  };
  status: "PASS" | "FAIL";
};

const STATUS_PATH = "config/canary-rollout-status.json";
const PROVENANCE_PATH = "config/release-provenance.json";
const LAUNCH_CERT_PATH = "config/launch-certification-status.json";
const RUNBOOK_PATH = "docs/architecture/RC_VERIFICATION_RUNBOOK.md";
const ROLLOUT_PATH = "docs/architecture/ROLL_OUT_PLAYBOOK.md";
const CANARY_DOC_PATH = "docs/architecture/CANARY_ROLLOUT.md";
const BACKLOG_PATH = "docs/architecture/action-matrix-red-yellow-backlog.md";

const REQUIRED_SOURCE_CONTRACTS = [
  "config/rc-freeze-checklist.json",
  "config/launch-certification-status.json",
  "config/release-provenance.json",
  "docs/architecture/ROLL_OUT_PLAYBOOK.md"
] as const;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function readTextFile(relativePath: string): string {
  const fullPath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`missing required file: ${relativePath}`);
  }

  return fs.readFileSync(fullPath, "utf8");
}

function parseJson<T>(relativePath: string): T {
  const text = readTextFile(relativePath);
  try {
    return JSON.parse(text) as T;
  } catch {
    fail(`${relativePath} must contain valid json`);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateHexSha(label: string, value: string): void {
  if (!/^[0-9a-f]{40}$/.test(value)) {
    fail(`${label} must be a full 40-char git sha`);
  }
}

function validateHttpsUrl(label: string, value: string): void {
  if (!/^https:\/\//.test(value)) {
    fail(`${label} must be an https url`);
  }
}

function validateTimestamp(label: string, value: string): number {
  if (!isNonEmptyString(value)) {
    fail(`${label} must be non-empty`);
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    fail(`${label} must be ISO-8601 compatible`);
  }
  return ms;
}

function validateShape(status: CanaryRolloutStatus): void {
  if (!isNonEmptyString(status.version)) {
    fail(`${STATUS_PATH}.version must be non-empty`);
  }
  if (!Array.isArray(status.source_contracts) || status.source_contracts.length === 0) {
    fail(`${STATUS_PATH}.source_contracts must be a non-empty array`);
  }
  for (const required of REQUIRED_SOURCE_CONTRACTS) {
    if (!status.source_contracts.includes(required)) {
      fail(`${STATUS_PATH}.source_contracts missing required contract ${required}`);
    }
  }

  if (status.rollout_plan.strategy !== "staged-canary") {
    fail(`${STATUS_PATH}.rollout_plan.strategy must be "staged-canary"`);
  }

  const stages = status.rollout_plan.required_stages;
  if (!Array.isArray(stages) || stages.length < 3) {
    fail(`${STATUS_PATH}.rollout_plan.required_stages must include at least 3 stages`);
  }

  const stageIds = new Set<string>();
  let previousTraffic = 0;
  for (const stage of stages) {
    if (!isNonEmptyString(stage.id)) {
      fail(`${STATUS_PATH} stage id must be non-empty`);
    }
    if (stageIds.has(stage.id)) {
      fail(`${STATUS_PATH} stage ids must be unique (${stage.id})`);
    }
    stageIds.add(stage.id);

    if (
      typeof stage.traffic_percent !== "number" ||
      !Number.isInteger(stage.traffic_percent) ||
      stage.traffic_percent <= 0 ||
      stage.traffic_percent > 100
    ) {
      fail(`${STATUS_PATH} stage ${stage.id} traffic_percent must be integer in (0,100]`);
    }
    if (stage.traffic_percent <= previousTraffic) {
      fail(`${STATUS_PATH} stage traffic_percent must be strictly increasing (${stage.id})`);
    }
    previousTraffic = stage.traffic_percent;

    if (
      typeof stage.hold_minutes !== "number" ||
      !Number.isInteger(stage.hold_minutes) ||
      stage.hold_minutes < 10
    ) {
      fail(`${STATUS_PATH} stage ${stage.id} hold_minutes must be integer >= 10`);
    }
    if (stage.status !== "PASS") {
      fail(`${STATUS_PATH} stage ${stage.id} status must be PASS`);
    }
    if (!isNonEmptyString(stage.evidence)) {
      fail(`${STATUS_PATH} stage ${stage.id} evidence must be non-empty`);
    }
  }
  if (stages[stages.length - 1]?.traffic_percent !== 100) {
    fail(`${STATUS_PATH} final stage traffic_percent must be 100`);
  }

  const thresholds = status.rollout_plan.abort_thresholds;
  const thresholdEntries = [
    ["error_rate_percent_max", thresholds.error_rate_percent_max],
    ["p95_latency_ms_max", thresholds.p95_latency_ms_max],
    ["checkout_failure_percent_max", thresholds.checkout_failure_percent_max],
    ["live_join_failure_percent_max", thresholds.live_join_failure_percent_max]
  ] as const;

  for (const [name, value] of thresholdEntries) {
    if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
      fail(`${STATUS_PATH}.rollout_plan.abort_thresholds.${name} must be a positive number`);
    }
  }

  const rollback = status.rollout_plan.rollback;
  if (rollback.trigger_on_any_abort_threshold_breach !== true) {
    fail(`${STATUS_PATH}.rollout_plan.rollback.trigger_on_any_abort_threshold_breach must be true`);
  }
  if (
    typeof rollback.max_time_to_mitigate_minutes !== "number" ||
    !Number.isInteger(rollback.max_time_to_mitigate_minutes) ||
    rollback.max_time_to_mitigate_minutes <= 0 ||
    rollback.max_time_to_mitigate_minutes > 15
  ) {
    fail(`${STATUS_PATH}.rollout_plan.rollback.max_time_to_mitigate_minutes must be integer in [1,15]`);
  }
  if (!isNonEmptyString(rollback.communication_channel) || !rollback.communication_channel.startsWith("#")) {
    fail(`${STATUS_PATH}.rollout_plan.rollback.communication_channel must be a non-empty channel name`);
  }
  if (rollback.status !== "PASS") {
    fail(`${STATUS_PATH}.rollout_plan.rollback.status must be PASS`);
  }
  if (!isNonEmptyString(rollback.evidence)) {
    fail(`${STATUS_PATH}.rollout_plan.rollback.evidence must be non-empty`);
  }

  const latest = status.latest_canary_execution;
  if (!isNonEmptyString(latest.run_id)) {
    fail(`${STATUS_PATH}.latest_canary_execution.run_id must be non-empty`);
  }
  validateHexSha(`${STATUS_PATH}.latest_canary_execution.candidate_sha`, latest.candidate_sha);
  validateHttpsUrl(`${STATUS_PATH}.latest_canary_execution.workflow_run_url`, latest.workflow_run_url);
  validateHttpsUrl(`${STATUS_PATH}.latest_canary_execution.vercel_deployment_url`, latest.vercel_deployment_url);
  const startedAtMs = validateTimestamp(
    `${STATUS_PATH}.latest_canary_execution.started_at_utc`,
    latest.started_at_utc
  );
  const completedAtMs = validateTimestamp(
    `${STATUS_PATH}.latest_canary_execution.completed_at_utc`,
    latest.completed_at_utc
  );
  if (completedAtMs < startedAtMs) {
    fail(`${STATUS_PATH}.latest_canary_execution.completed_at_utc must be >= started_at_utc`);
  }
  if (latest.disposition !== "PASS") {
    fail(`${STATUS_PATH}.latest_canary_execution.disposition must be PASS`);
  }

  if (status.status !== "PASS") {
    fail(`${STATUS_PATH}.status must be PASS`);
  }
}

function validateCrossContract(status: CanaryRolloutStatus): void {
  const provenance = parseJson<ReleaseProvenance>(PROVENANCE_PATH);
  const launchCertification = parseJson<LaunchCertificationStatus>(LAUNCH_CERT_PATH);
  const candidateSha = status.latest_canary_execution.candidate_sha;
  const provenanceSha = provenance.canonical_release?.main_sha;
  const launchCertSha = launchCertification.latest_certification?.git_sha;

  if (!isNonEmptyString(provenanceSha)) {
    fail(`${PROVENANCE_PATH}.canonical_release.main_sha must be non-empty`);
  }
  if (!isNonEmptyString(launchCertSha)) {
    fail(`${LAUNCH_CERT_PATH}.latest_certification.git_sha must be non-empty`);
  }
  validateHexSha(`${PROVENANCE_PATH}.canonical_release.main_sha`, provenanceSha);
  validateHexSha(`${LAUNCH_CERT_PATH}.latest_certification.git_sha`, launchCertSha);

  if (candidateSha !== provenanceSha || candidateSha !== launchCertSha) {
    fail(
      `${STATUS_PATH}.latest_canary_execution.candidate_sha must match release-provenance and launch-certification shas`
    );
  }

  const canaryDoc = readTextFile(CANARY_DOC_PATH);
  const runbookDoc = readTextFile(RUNBOOK_PATH);
  const rolloutDoc = readTextFile(ROLLOUT_PATH);
  const backlogDoc = readTextFile(BACKLOG_PATH);

  if (!canaryDoc.includes("Canary Rollout Certification (RY-17)")) {
    fail(`${CANARY_DOC_PATH} missing RY-17 heading`);
  }
  if (!canaryDoc.includes(status.latest_canary_execution.run_id)) {
    fail(`${CANARY_DOC_PATH} missing latest canary run id`);
  }
  if (!canaryDoc.includes(candidateSha)) {
    fail(`${CANARY_DOC_PATH} missing candidate sha`);
  }

  if (!runbookDoc.includes("check:canary-rollout-status")) {
    fail(`${RUNBOOK_PATH} must reference check:canary-rollout-status`);
  }
  if (!runbookDoc.includes("CANARY_ROLLOUT.md")) {
    fail(`${RUNBOOK_PATH} must reference CANARY_ROLLOUT.md`);
  }
  if (!rolloutDoc.includes("config/canary-rollout-status.json")) {
    fail(`${ROLLOUT_PATH} must reference config/canary-rollout-status.json`);
  }
  if (!rolloutDoc.includes("CANARY_ROLLOUT.md")) {
    fail(`${ROLLOUT_PATH} must reference CANARY_ROLLOUT.md`);
  }
  if (!/###\s+RY-17.*\(completed\)/.test(backlogDoc)) {
    fail(`${BACKLOG_PATH} must mark RY-17 as completed`);
  }
}

function main() {
  const status = parseJson<CanaryRolloutStatus>(STATUS_PATH);
  validateShape(status);
  validateCrossContract(status);

  console.log(
    `canary rollout status check passed (${status.rollout_plan.required_stages.length} stages, run ${status.latest_canary_execution.run_id}).`
  );
}

main();
