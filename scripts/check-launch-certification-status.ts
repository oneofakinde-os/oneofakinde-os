import fs from "node:fs";
import path from "node:path";

type RcDryRunStatus = "pass" | "fail";

type RcDryRunReport = {
  summary?: {
    total?: number;
    passed?: number;
    failed?: number;
  };
  results?: Array<{
    id?: string;
    status?: RcDryRunStatus;
  }>;
};

type LaunchCertificationJourney = {
  id: string;
  required_rc_checks: string[];
  status: "PASS" | "FAIL";
  evidence: string;
};

type LaunchCertificationOpsGate = {
  id: string;
  status: "PASS" | "FAIL";
  evidence: string;
};

type LaunchCertificationStatus = {
  version: string;
  authority_sources: string[];
  required_user_journeys: LaunchCertificationJourney[];
  required_ops_readiness: LaunchCertificationOpsGate[];
  latest_certification: {
    run_id: string;
    launch_mode: "loop-launch" | "full-launch";
    base_url: string;
    git_sha: string;
    executed_by: string;
    executed_at_utc: string;
    report_path: string;
    workflow_run_url: string;
    vercel_deployment_url: string;
    post_rollout_watch_window_minutes: number;
    sha_lock: {
      local_head_sha: string;
      github_main_sha: string;
      vercel_deployment_sha: string;
    };
    disposition: "PASS" | "FAIL";
  };
};

const STATUS_PATH = "config/launch-certification-status.json";
const REPORT_FALLBACK_PATH = "artifacts/release-candidate-dry-run.latest.json";
const LAUNCH_DOC_PATH = "docs/architecture/LAUNCH_CERTIFICATION.md";
const RUNBOOK_PATH = "docs/architecture/RC_VERIFICATION_RUNBOOK.md";
const PLAYBOOK_PATH = "docs/architecture/ROLL_OUT_PLAYBOOK.md";

const REQUIRED_JOURNEYS = [
  "collector-session-bootstrap",
  "drop-checkout-receipt-certificate",
  "watch-entitlement-and-townhall-social",
  "live-session-artifacts-visibility",
  "workshop-pro-state-machine-and-paywall-elimination",
  "library-queue-recall-and-world-eligibility"
] as const;

const REQUIRED_OPS_GATES = [
  "sha-lock-parity",
  "release-governance-gate",
  "abort-and-rollback-rules",
  "post-rollout-watch-window"
] as const;

const REQUIRED_AUTOMATED_RC_CHECKS = [
  "rc-01",
  "rc-02",
  "rc-03",
  "rc-04",
  "rc-05",
  "rc-06",
  "rc-07",
  "rc-08",
  "rc-09"
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

function assertStringList(label: string, value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must be a non-empty array`);
  }

  const normalized = value.map((entry) => (typeof entry === "string" ? entry.trim() : ""));
  if (normalized.some((entry) => !entry)) {
    fail(`${label} entries must be non-empty strings`);
  }

  return normalized;
}

function validateUrl(label: string, value: string): void {
  if (!/^https:\/\//.test(value)) {
    fail(`${label} must be an https url`);
  }
}

function validateTimestamp(label: string, value: string): void {
  if (!isNonEmptyString(value)) {
    fail(`${label} must be non-empty`);
  }

  if (Number.isNaN(Date.parse(value))) {
    fail(`${label} must be an ISO-8601 compatible timestamp`);
  }
}

function validateStatusShape(status: LaunchCertificationStatus): void {
  if (!isNonEmptyString(status.version)) {
    fail(`${STATUS_PATH}.version must be non-empty`);
  }

  const authoritySources = assertStringList(`${STATUS_PATH}.authority_sources`, status.authority_sources);
  if (!authoritySources.some((entry) => entry.endsWith(".xlsx"))) {
    fail(`${STATUS_PATH}.authority_sources must include action matrix xlsx path`);
  }

  const journeys = status.required_user_journeys;
  if (!Array.isArray(journeys) || journeys.length === 0) {
    fail(`${STATUS_PATH}.required_user_journeys must be non-empty`);
  }

  const journeyById = new Map<string, LaunchCertificationJourney>();
  for (const journey of journeys) {
    if (!isNonEmptyString(journey.id)) {
      fail(`${STATUS_PATH}.required_user_journeys entries must include id`);
    }
    if (journeyById.has(journey.id)) {
      fail(`${STATUS_PATH}.required_user_journeys has duplicate id ${journey.id}`);
    }
    const checks = assertStringList(
      `${STATUS_PATH}.required_user_journeys.${journey.id}.required_rc_checks`,
      journey.required_rc_checks
    );
    if (!checks.every((checkId) => /^rc-\d{2}$/.test(checkId))) {
      fail(`${STATUS_PATH}.required_user_journeys.${journey.id}.required_rc_checks must use rc-## ids`);
    }
    if (journey.status !== "PASS") {
      fail(`${STATUS_PATH}.required_user_journeys.${journey.id}.status must be PASS`);
    }
    if (!isNonEmptyString(journey.evidence)) {
      fail(`${STATUS_PATH}.required_user_journeys.${journey.id}.evidence must be non-empty`);
    }
    journeyById.set(journey.id, journey);
  }

  for (const requiredId of REQUIRED_JOURNEYS) {
    if (!journeyById.has(requiredId)) {
      fail(`${STATUS_PATH}.required_user_journeys missing required journey id ${requiredId}`);
    }
  }

  const opsReadiness = status.required_ops_readiness;
  if (!Array.isArray(opsReadiness) || opsReadiness.length === 0) {
    fail(`${STATUS_PATH}.required_ops_readiness must be non-empty`);
  }
  const opsById = new Map<string, LaunchCertificationOpsGate>();
  for (const gate of opsReadiness) {
    if (!isNonEmptyString(gate.id)) {
      fail(`${STATUS_PATH}.required_ops_readiness entries must include id`);
    }
    if (opsById.has(gate.id)) {
      fail(`${STATUS_PATH}.required_ops_readiness has duplicate id ${gate.id}`);
    }
    if (gate.status !== "PASS") {
      fail(`${STATUS_PATH}.required_ops_readiness.${gate.id}.status must be PASS`);
    }
    if (!isNonEmptyString(gate.evidence)) {
      fail(`${STATUS_PATH}.required_ops_readiness.${gate.id}.evidence must be non-empty`);
    }
    opsById.set(gate.id, gate);
  }

  for (const requiredId of REQUIRED_OPS_GATES) {
    if (!opsById.has(requiredId)) {
      fail(`${STATUS_PATH}.required_ops_readiness missing required gate id ${requiredId}`);
    }
  }

  const latest = status.latest_certification;
  if (!isNonEmptyString(latest.run_id)) {
    fail(`${STATUS_PATH}.latest_certification.run_id must be non-empty`);
  }
  if (latest.launch_mode !== "loop-launch" && latest.launch_mode !== "full-launch") {
    fail(`${STATUS_PATH}.latest_certification.launch_mode must be loop-launch or full-launch`);
  }
  validateUrl(`${STATUS_PATH}.latest_certification.base_url`, latest.base_url);
  validateHexSha(`${STATUS_PATH}.latest_certification.git_sha`, latest.git_sha);
  if (!isNonEmptyString(latest.executed_by)) {
    fail(`${STATUS_PATH}.latest_certification.executed_by must be non-empty`);
  }
  validateTimestamp(`${STATUS_PATH}.latest_certification.executed_at_utc`, latest.executed_at_utc);
  if (!isNonEmptyString(latest.report_path)) {
    fail(`${STATUS_PATH}.latest_certification.report_path must be non-empty`);
  }
  validateUrl(`${STATUS_PATH}.latest_certification.workflow_run_url`, latest.workflow_run_url);
  validateUrl(
    `${STATUS_PATH}.latest_certification.vercel_deployment_url`,
    latest.vercel_deployment_url
  );
  if (
    typeof latest.post_rollout_watch_window_minutes !== "number" ||
    !Number.isInteger(latest.post_rollout_watch_window_minutes) ||
    latest.post_rollout_watch_window_minutes < 30
  ) {
    fail(
      `${STATUS_PATH}.latest_certification.post_rollout_watch_window_minutes must be integer >= 30`
    );
  }

  validateHexSha(`${STATUS_PATH}.latest_certification.sha_lock.local_head_sha`, latest.sha_lock.local_head_sha);
  validateHexSha(
    `${STATUS_PATH}.latest_certification.sha_lock.github_main_sha`,
    latest.sha_lock.github_main_sha
  );
  validateHexSha(
    `${STATUS_PATH}.latest_certification.sha_lock.vercel_deployment_sha`,
    latest.sha_lock.vercel_deployment_sha
  );

  if (
    latest.sha_lock.local_head_sha !== latest.sha_lock.github_main_sha ||
    latest.sha_lock.local_head_sha !== latest.sha_lock.vercel_deployment_sha
  ) {
    fail(`${STATUS_PATH}.latest_certification.sha_lock values must be identical`);
  }
  if (latest.sha_lock.local_head_sha !== latest.git_sha) {
    fail(`${STATUS_PATH}.latest_certification.sha_lock values must match latest_certification.git_sha`);
  }
  if (latest.disposition !== "PASS") {
    fail(`${STATUS_PATH}.latest_certification.disposition must be PASS`);
  }
}

function validateDryRunReport(reportPath: string): void {
  const fullPath = path.resolve(process.cwd(), reportPath);
  const fallbackPath = path.resolve(process.cwd(), REPORT_FALLBACK_PATH);
  const resolvedPath = fs.existsSync(fullPath) ? reportPath : REPORT_FALLBACK_PATH;

  if (!fs.existsSync(fullPath) && !fs.existsSync(fallbackPath)) {
    fail(`missing required rc dry-run report: ${reportPath}`);
  }

  const report = parseJson<RcDryRunReport>(resolvedPath);
  const summary = report.summary;
  const results = report.results ?? [];

  if (!summary || typeof summary.failed !== "number" || summary.failed !== 0) {
    fail(`${resolvedPath} summary.failed must be 0`);
  }
  if (typeof summary.total !== "number" || summary.total < REQUIRED_AUTOMATED_RC_CHECKS.length) {
    fail(`${resolvedPath} summary.total must include required automated rc checks`);
  }
  if (typeof summary.passed !== "number" || summary.passed !== summary.total) {
    fail(`${resolvedPath} summary.passed must equal summary.total`);
  }

  const resultById = new Map<string, RcDryRunStatus>();
  for (const result of results) {
    if (!isNonEmptyString(result.id) || (result.status !== "pass" && result.status !== "fail")) {
      fail(`${resolvedPath} contains invalid result entries`);
    }
    resultById.set(result.id, result.status);
  }

  for (const rcId of REQUIRED_AUTOMATED_RC_CHECKS) {
    if (resultById.get(rcId) !== "pass") {
      fail(`${resolvedPath} missing passing required check ${rcId}`);
    }
  }
}

function validateDocCoverage(status: LaunchCertificationStatus): void {
  const launchDoc = readTextFile(LAUNCH_DOC_PATH);
  const runbookDoc = readTextFile(RUNBOOK_PATH);
  const rolloutDoc = readTextFile(PLAYBOOK_PATH);

  if (!launchDoc.includes("Launch Certification Status (RY-15)")) {
    fail(`${LAUNCH_DOC_PATH} missing RY-15 heading`);
  }
  if (!launchDoc.includes(status.latest_certification.run_id)) {
    fail(`${LAUNCH_DOC_PATH} missing latest certification run_id`);
  }
  if (!launchDoc.includes(status.latest_certification.git_sha)) {
    fail(`${LAUNCH_DOC_PATH} missing latest certification git sha`);
  }

  for (const journeyId of REQUIRED_JOURNEYS) {
    if (!launchDoc.includes(`\`${journeyId}\``)) {
      fail(`${LAUNCH_DOC_PATH} missing journey id ${journeyId}`);
    }
  }
  for (const gateId of REQUIRED_OPS_GATES) {
    if (!launchDoc.includes(`\`${gateId}\``)) {
      fail(`${LAUNCH_DOC_PATH} missing ops gate id ${gateId}`);
    }
  }

  if (!runbookDoc.includes("check:launch-certification-status")) {
    fail(`${RUNBOOK_PATH} must include check:launch-certification-status`);
  }
  if (!runbookDoc.includes("LAUNCH_CERTIFICATION.md")) {
    fail(`${RUNBOOK_PATH} must reference LAUNCH_CERTIFICATION.md`);
  }
  if (!rolloutDoc.includes("LAUNCH_CERTIFICATION.md")) {
    fail(`${PLAYBOOK_PATH} must reference LAUNCH_CERTIFICATION.md`);
  }
}

function main() {
  const status = parseJson<LaunchCertificationStatus>(STATUS_PATH);
  validateStatusShape(status);
  validateDryRunReport(status.latest_certification.report_path);
  validateDocCoverage(status);

  console.log(
    `launch certification status check passed (${status.required_user_journeys.length} journeys, ${status.required_ops_readiness.length} ops gates).`
  );
}

main();
