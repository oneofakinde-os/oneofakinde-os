import fs from "node:fs";
import path from "node:path";

type FreezeChecklist = {
  version: string;
  required_ci_checks: string[];
  required_rc_checks: string[];
  required_docs: string[];
  workflow: string;
  policy: {
    fail_on_any_rc_check_failure: boolean;
    fail_on_any_manual_matrix_non_pass: boolean;
    require_postgres_health_backend: boolean;
    require_release_governance_gate: boolean;
  };
};

type ReleaseChecksConfig = {
  required_checks?: string[];
};

const CHECKLIST_PATH = "config/rc-freeze-checklist.json";
const RELEASE_CHECKS_PATH = "config/release-required-checks.json";

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

function assertStringList(name: string, value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${name} must be a non-empty array`);
  }

  const normalized = value.map((entry) => (typeof entry === "string" ? entry.trim() : ""));
  if (normalized.some((entry) => !entry)) {
    fail(`${name} entries must be non-empty strings`);
  }

  return normalized;
}

function assertUnique(name: string, values: string[]): void {
  const set = new Set(values);
  if (set.size !== values.length) {
    fail(`${name} contains duplicate values`);
  }
}

function validateChecklistShape(candidate: unknown): FreezeChecklist {
  if (!candidate || typeof candidate !== "object") {
    fail(`${CHECKLIST_PATH} must be a json object`);
  }

  const checklist = candidate as Partial<FreezeChecklist>;
  if (!isNonEmptyString(checklist.version)) {
    fail(`${CHECKLIST_PATH} requires non-empty version`);
  }

  const requiredCiChecks = assertStringList(`${CHECKLIST_PATH}.required_ci_checks`, checklist.required_ci_checks);
  const requiredRcChecks = assertStringList(`${CHECKLIST_PATH}.required_rc_checks`, checklist.required_rc_checks);
  const requiredDocs = assertStringList(`${CHECKLIST_PATH}.required_docs`, checklist.required_docs);
  assertUnique(`${CHECKLIST_PATH}.required_ci_checks`, requiredCiChecks);
  assertUnique(`${CHECKLIST_PATH}.required_rc_checks`, requiredRcChecks);
  assertUnique(`${CHECKLIST_PATH}.required_docs`, requiredDocs);

  if (!isNonEmptyString(checklist.workflow)) {
    fail(`${CHECKLIST_PATH}.workflow must be non-empty`);
  }

  const policy = checklist.policy;
  if (!policy || typeof policy !== "object") {
    fail(`${CHECKLIST_PATH}.policy must be an object`);
  }

  const requiredPolicyKeys = [
    "fail_on_any_rc_check_failure",
    "fail_on_any_manual_matrix_non_pass",
    "require_postgres_health_backend",
    "require_release_governance_gate"
  ] as const;

  for (const key of requiredPolicyKeys) {
    if (typeof (policy as Record<string, unknown>)[key] !== "boolean") {
      fail(`${CHECKLIST_PATH}.policy.${key} must be boolean`);
    }
  }

  return checklist as FreezeChecklist;
}

function validateRcCheckIds(ids: string[]): void {
  const expected = ids.map((_, index) => `rc-${String(index + 1).padStart(2, "0")}`);
  for (let index = 0; index < ids.length; index += 1) {
    if (ids[index] !== expected[index]) {
      fail(`${CHECKLIST_PATH}.required_rc_checks must be sequential (${expected.join(", ")})`);
    }
  }
}

function main() {
  const checklistRaw = parseJson<unknown>(CHECKLIST_PATH);
  const checklist = validateChecklistShape(checklistRaw);
  validateRcCheckIds(checklist.required_rc_checks);

  for (const docPath of checklist.required_docs) {
    readTextFile(docPath);
  }
  readTextFile(checklist.workflow);

  const releaseChecks = parseJson<ReleaseChecksConfig>(RELEASE_CHECKS_PATH);
  const requiredChecks = releaseChecks.required_checks ?? [];
  if (!Array.isArray(requiredChecks) || requiredChecks.length === 0) {
    fail(`${RELEASE_CHECKS_PATH} must define required_checks`);
  }

  for (const check of checklist.required_ci_checks) {
    if (!requiredChecks.includes(check)) {
      fail(`${CHECKLIST_PATH} required_ci_checks contains check not in ${RELEASE_CHECKS_PATH}: ${check}`);
    }
  }

  const rcDryRunDoc = readTextFile("docs/architecture/release-candidate-dry-run.md");
  for (const checkId of checklist.required_rc_checks) {
    if (!rcDryRunDoc.includes(`\`${checkId}\``)) {
      fail(`release-candidate-dry-run.md missing checklist id ${checkId}`);
    }
  }

  const runbookDoc = readTextFile("docs/architecture/RC_VERIFICATION_RUNBOOK.md");
  if (!runbookDoc.includes("npm run rc:verify")) {
    fail("RC_VERIFICATION_RUNBOOK.md must include npm run rc:verify");
  }

  console.log(
    `rc freeze checklist check passed (${checklist.required_ci_checks.length} ci checks, ${checklist.required_rc_checks.length} rc checks).`
  );
}

main();
