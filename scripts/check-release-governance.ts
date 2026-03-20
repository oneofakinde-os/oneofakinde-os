import fs from "node:fs";
import path from "node:path";

type ReleaseChecksConfig = {
  required_checks?: string[];
};

const REQUIRED_FILES = [
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
  "config/release-required-checks.json",
  "config/feature-flags.contract.json",
  "config/rc-freeze-checklist.json",
  "config/action-matrix-status.json",
  "config/launch-certification-status.json",
  "config/release-provenance.json",
  "config/canary-rollout-status.json",
  "config/release-candidate-dry-run.snapshot.json",
  "docs/architecture/FEATURE_FLAGS.md",
  "docs/architecture/ROLL_OUT_PLAYBOOK.md",
  "docs/architecture/RC_VERIFICATION_RUNBOOK.md",
  "docs/architecture/LAUNCH_CERTIFICATION.md",
  "docs/architecture/RELEASE_PROVENANCE.md",
  "docs/architecture/CANARY_ROLLOUT.md",
  "docs/architecture/action-matrix-red-yellow-backlog.md",
  "scripts/check-feature-flags-contract.ts",
  "scripts/check-rc-freeze-checklist.ts",
  "scripts/check-action-matrix-status.ts",
  "scripts/check-launch-certification-status.ts",
  "scripts/check-release-provenance.ts",
  "scripts/check-canary-rollout-status.ts",
  "scripts/rc-verify.ts",
  ".github/workflows/release-candidate-dry-run.yml",
  ".github/workflows/ci.yml"
];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function readFileOrFail(relativePath: string): string {
  const fullPath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`missing required governance file: ${relativePath}`);
  }

  return fs.readFileSync(fullPath, "utf8");
}

for (const relativePath of REQUIRED_FILES) {
  readFileOrFail(relativePath);
}

const checksConfigText = readFileOrFail("config/release-required-checks.json");
let checksConfig: ReleaseChecksConfig;

try {
  checksConfig = JSON.parse(checksConfigText) as ReleaseChecksConfig;
} catch {
  fail("config/release-required-checks.json must contain valid json");
}

const requiredChecks = checksConfig.required_checks ?? [];
if (!Array.isArray(requiredChecks) || requiredChecks.length === 0) {
  fail("config/release-required-checks.json must define required_checks[]");
}

for (const check of requiredChecks) {
  if (typeof check !== "string" || !check.trim()) {
    fail("every required check must be a non-empty string");
  }
}

const workflow = readFileOrFail(".github/workflows/ci.yml");
const packageJsonText = readFileOrFail("package.json");
let packageJson: { scripts?: Record<string, string> };

try {
  packageJson = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };
} catch {
  fail("package.json must contain valid json");
}

const scripts = packageJson.scripts ?? {};
if (!scripts["check:feature-flags"]) {
  fail('package.json scripts must include "check:feature-flags"');
}
if (!scripts["check:freeze-checklist"]) {
  fail('package.json scripts must include "check:freeze-checklist"');
}
if (!scripts["check:action-matrix-status"]) {
  fail('package.json scripts must include "check:action-matrix-status"');
}
if (!scripts["check:launch-certification-status"]) {
  fail('package.json scripts must include "check:launch-certification-status"');
}
if (!scripts["check:release-provenance"]) {
  fail('package.json scripts must include "check:release-provenance"');
}
if (!scripts["check:canary-rollout-status"]) {
  fail('package.json scripts must include "check:canary-rollout-status"');
}
if (!scripts["rc:verify"]) {
  fail('package.json scripts must include "rc:verify"');
}
if (!scripts["release:governance"]?.includes("check:feature-flags")) {
  fail('package.json "release:governance" must execute check:feature-flags');
}
if (!scripts["release:governance"]?.includes("check:freeze-checklist")) {
  fail('package.json "release:governance" must execute check:freeze-checklist');
}
if (!scripts["release:governance"]?.includes("check:action-matrix-status")) {
  fail('package.json "release:governance" must execute check:action-matrix-status');
}
if (!scripts["release:governance"]?.includes("check:launch-certification-status")) {
  fail('package.json "release:governance" must execute check:launch-certification-status');
}
if (!scripts["release:governance"]?.includes("check:release-provenance")) {
  fail('package.json "release:governance" must execute check:release-provenance');
}
if (!scripts["release:governance"]?.includes("check:canary-rollout-status")) {
  fail('package.json "release:governance" must execute check:canary-rollout-status');
}
if (!scripts["prepare:architecture"]?.includes("check:feature-flags")) {
  fail('package.json "prepare:architecture" must execute check:feature-flags');
}
if (!scripts["prepare:architecture"]?.includes("check:freeze-checklist")) {
  fail('package.json "prepare:architecture" must execute check:freeze-checklist');
}
if (!scripts["prepare:architecture"]?.includes("check:action-matrix-status")) {
  fail('package.json "prepare:architecture" must execute check:action-matrix-status');
}
if (!scripts["prepare:architecture"]?.includes("check:launch-certification-status")) {
  fail('package.json "prepare:architecture" must execute check:launch-certification-status');
}
if (!scripts["prepare:architecture"]?.includes("check:release-provenance")) {
  fail('package.json "prepare:architecture" must execute check:release-provenance');
}
if (!scripts["prepare:architecture"]?.includes("check:canary-rollout-status")) {
  fail('package.json "prepare:architecture" must execute check:canary-rollout-status');
}

if (!workflow.includes("pull_request:")) {
  fail("ci workflow must run on pull_request");
}

for (const check of requiredChecks) {
  const marker = `\n  ${check}:`;
  if (!workflow.includes(marker)) {
    fail(`required check "${check}" is not declared as a ci job`);
  }
}

console.log(
  `release governance check passed (${requiredChecks.length} required check(s) mapped in ci workflow).`
);
