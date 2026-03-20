import fs from "node:fs";
import path from "node:path";

type LaunchCertificationStatus = {
  latest_certification?: {
    git_sha?: string;
  };
};

type ReleaseProvenance = {
  version: string;
  governance: {
    source_of_truth_branch: string;
    promotion_mode: string;
    forbid_direct_hotfixes: boolean;
  };
  canonical_release: {
    release_id: string;
    main_sha: string;
    github_pr: number;
    github_merge_commit_sha: string;
    github_main_workflow_run_url: string;
    vercel_deployment_url: string;
    disposition: "PASS" | "FAIL";
  };
  signed_launch_tag: {
    name: string;
    target_sha: string;
    required: boolean;
    signature_scheme: string;
    verification_mode: string;
    verification_status: "PASS" | "FAIL";
    evidence: string;
  };
  sha_lock: {
    local_head_sha: string;
    github_main_sha: string;
    vercel_deployment_sha: string;
  };
  status: "PASS" | "FAIL";
};

const PROVENANCE_PATH = "config/release-provenance.json";
const LAUNCH_CERT_PATH = "config/launch-certification-status.json";
const PROVENANCE_DOC_PATH = "docs/architecture/RELEASE_PROVENANCE.md";
const RUNBOOK_PATH = "docs/architecture/RC_VERIFICATION_RUNBOOK.md";
const PLAYBOOK_PATH = "docs/architecture/ROLL_OUT_PLAYBOOK.md";

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

function validateShape(provenance: ReleaseProvenance): void {
  if (!isNonEmptyString(provenance.version)) {
    fail(`${PROVENANCE_PATH}.version must be non-empty`);
  }

  if (provenance.governance.source_of_truth_branch !== "main") {
    fail(`${PROVENANCE_PATH}.governance.source_of_truth_branch must be "main"`);
  }
  if (provenance.governance.promotion_mode !== "sha-locked") {
    fail(`${PROVENANCE_PATH}.governance.promotion_mode must be "sha-locked"`);
  }
  if (provenance.governance.forbid_direct_hotfixes !== true) {
    fail(`${PROVENANCE_PATH}.governance.forbid_direct_hotfixes must be true`);
  }

  const canonical = provenance.canonical_release;
  if (!isNonEmptyString(canonical.release_id)) {
    fail(`${PROVENANCE_PATH}.canonical_release.release_id must be non-empty`);
  }
  if (
    typeof canonical.github_pr !== "number" ||
    !Number.isInteger(canonical.github_pr) ||
    canonical.github_pr <= 0
  ) {
    fail(`${PROVENANCE_PATH}.canonical_release.github_pr must be a positive integer`);
  }
  validateHexSha(`${PROVENANCE_PATH}.canonical_release.main_sha`, canonical.main_sha);
  validateHexSha(
    `${PROVENANCE_PATH}.canonical_release.github_merge_commit_sha`,
    canonical.github_merge_commit_sha
  );
  if (canonical.main_sha !== canonical.github_merge_commit_sha) {
    fail(`${PROVENANCE_PATH}.canonical_release main_sha must equal github_merge_commit_sha`);
  }
  validateHttpsUrl(
    `${PROVENANCE_PATH}.canonical_release.github_main_workflow_run_url`,
    canonical.github_main_workflow_run_url
  );
  validateHttpsUrl(
    `${PROVENANCE_PATH}.canonical_release.vercel_deployment_url`,
    canonical.vercel_deployment_url
  );
  if (canonical.disposition !== "PASS") {
    fail(`${PROVENANCE_PATH}.canonical_release.disposition must be PASS`);
  }

  const tag = provenance.signed_launch_tag;
  if (!isNonEmptyString(tag.name)) {
    fail(`${PROVENANCE_PATH}.signed_launch_tag.name must be non-empty`);
  }
  if (!/^launch\/\d{4}-\d{2}-\d{2}-/.test(tag.name)) {
    fail(`${PROVENANCE_PATH}.signed_launch_tag.name must use launch/YYYY-MM-DD-* format`);
  }
  validateHexSha(`${PROVENANCE_PATH}.signed_launch_tag.target_sha`, tag.target_sha);
  if (tag.required !== true) {
    fail(`${PROVENANCE_PATH}.signed_launch_tag.required must be true`);
  }
  if (!isNonEmptyString(tag.signature_scheme)) {
    fail(`${PROVENANCE_PATH}.signed_launch_tag.signature_scheme must be non-empty`);
  }
  if (!isNonEmptyString(tag.verification_mode)) {
    fail(`${PROVENANCE_PATH}.signed_launch_tag.verification_mode must be non-empty`);
  }
  if (tag.verification_status !== "PASS") {
    fail(`${PROVENANCE_PATH}.signed_launch_tag.verification_status must be PASS`);
  }
  if (!isNonEmptyString(tag.evidence)) {
    fail(`${PROVENANCE_PATH}.signed_launch_tag.evidence must be non-empty`);
  }

  const shaLock = provenance.sha_lock;
  validateHexSha(`${PROVENANCE_PATH}.sha_lock.local_head_sha`, shaLock.local_head_sha);
  validateHexSha(`${PROVENANCE_PATH}.sha_lock.github_main_sha`, shaLock.github_main_sha);
  validateHexSha(`${PROVENANCE_PATH}.sha_lock.vercel_deployment_sha`, shaLock.vercel_deployment_sha);

  if (
    shaLock.local_head_sha !== shaLock.github_main_sha ||
    shaLock.local_head_sha !== shaLock.vercel_deployment_sha
  ) {
    fail(`${PROVENANCE_PATH}.sha_lock values must be identical`);
  }

  if (
    shaLock.local_head_sha !== canonical.main_sha ||
    tag.target_sha !== canonical.main_sha
  ) {
    fail(`${PROVENANCE_PATH} canonical/main/tag sha values must all match`);
  }

  if (provenance.status !== "PASS") {
    fail(`${PROVENANCE_PATH}.status must be PASS`);
  }
}

function validateCrossContractCoverage(provenance: ReleaseProvenance): void {
  const launchCertification = parseJson<LaunchCertificationStatus>(LAUNCH_CERT_PATH);
  const launchCertSha = launchCertification.latest_certification?.git_sha;
  if (!isNonEmptyString(launchCertSha)) {
    fail(`${LAUNCH_CERT_PATH}.latest_certification.git_sha must be non-empty`);
  }
  validateHexSha(`${LAUNCH_CERT_PATH}.latest_certification.git_sha`, launchCertSha);
  if (launchCertSha !== provenance.canonical_release.main_sha) {
    fail(`${PROVENANCE_PATH} canonical main sha must match launch certification latest git_sha`);
  }

  const provenanceDoc = readTextFile(PROVENANCE_DOC_PATH);
  const runbookDoc = readTextFile(RUNBOOK_PATH);
  const rolloutDoc = readTextFile(PLAYBOOK_PATH);

  if (!provenanceDoc.includes("Release Provenance Contract (RY-16)")) {
    fail(`${PROVENANCE_DOC_PATH} missing RY-16 heading`);
  }
  if (!provenanceDoc.includes(provenance.canonical_release.release_id)) {
    fail(`${PROVENANCE_DOC_PATH} missing canonical release_id`);
  }
  if (!provenanceDoc.includes(provenance.canonical_release.main_sha)) {
    fail(`${PROVENANCE_DOC_PATH} missing canonical main sha`);
  }
  if (!provenanceDoc.includes(provenance.signed_launch_tag.name)) {
    fail(`${PROVENANCE_DOC_PATH} missing signed launch tag name`);
  }
  if (!provenanceDoc.includes(`PR #${provenance.canonical_release.github_pr}`)) {
    fail(`${PROVENANCE_DOC_PATH} missing PR reference`);
  }

  if (!runbookDoc.includes("check:release-provenance")) {
    fail(`${RUNBOOK_PATH} must include check:release-provenance`);
  }
  if (!runbookDoc.includes("RELEASE_PROVENANCE.md")) {
    fail(`${RUNBOOK_PATH} must reference RELEASE_PROVENANCE.md`);
  }
  if (!rolloutDoc.includes("RELEASE_PROVENANCE.md")) {
    fail(`${PLAYBOOK_PATH} must reference RELEASE_PROVENANCE.md`);
  }
}

function main() {
  const provenance = parseJson<ReleaseProvenance>(PROVENANCE_PATH);
  validateShape(provenance);
  validateCrossContractCoverage(provenance);
  console.log(
    `release provenance check passed (${provenance.canonical_release.release_id}, tag ${provenance.signed_launch_tag.name}).`
  );
}

main();
