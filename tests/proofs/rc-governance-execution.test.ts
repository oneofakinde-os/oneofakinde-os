import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

type ReleaseChecksConfig = {
  required_checks?: string[];
};

type FreezeChecklist = {
  required_ci_checks?: string[];
  required_rc_checks?: string[];
  required_docs?: string[];
  workflow?: string;
};

async function readRepoFile(relativePath: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("proof: rc freeze checklist contract aligns with required release checks", async () => {
  const [releaseChecksText, freezeChecklistText] = await Promise.all([
    readRepoFile("config/release-required-checks.json"),
    readRepoFile("config/rc-freeze-checklist.json")
  ]);

  const releaseChecks = JSON.parse(releaseChecksText) as ReleaseChecksConfig;
  const freezeChecklist = JSON.parse(freezeChecklistText) as FreezeChecklist;

  const requiredReleaseChecks = releaseChecks.required_checks ?? [];
  const requiredCiChecks = freezeChecklist.required_ci_checks ?? [];
  assert.ok(requiredReleaseChecks.length > 0);
  assert.ok(requiredCiChecks.length > 0);

  for (const check of requiredCiChecks) {
    assert.ok(requiredReleaseChecks.includes(check), `freeze checklist check missing in release checks: ${check}`);
  }

  const requiredRcChecks = freezeChecklist.required_rc_checks ?? [];
  assert.deepEqual(requiredRcChecks, [
    "rc-01",
    "rc-02",
    "rc-03",
    "rc-04",
    "rc-05",
    "rc-06",
    "rc-07",
    "rc-08",
    "rc-09",
    "rc-10",
    "rc-11"
  ]);

  const workflow = freezeChecklist.workflow ?? "";
  assert.equal(workflow, ".github/workflows/release-candidate-dry-run.yml");
});

test("proof: rc runbook + governance scripts enforce one-click execution", async () => {
  const [
    packageJsonText,
    runbookDoc,
    releaseGovernanceScript,
    freezeChecklistScript,
    rcVerifyScript,
    rcDryRunDoc
  ] = await Promise.all([
    readRepoFile("package.json"),
    readRepoFile("docs/architecture/RC_VERIFICATION_RUNBOOK.md"),
    readRepoFile("scripts/check-release-governance.ts"),
    readRepoFile("scripts/check-rc-freeze-checklist.ts"),
    readRepoFile("scripts/rc-verify.ts"),
    readRepoFile("docs/architecture/release-candidate-dry-run.md")
  ]);

  const packageJson = JSON.parse(packageJsonText) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};

  assert.equal(typeof scripts["rc:verify"], "string");
  assert.equal(typeof scripts["check:api-shape"], "string");
  assert.match(scripts["check:api-shape"] ?? "", /taste-graph-isolation\.test\.ts/);
  assert.match(scripts["release:governance"] ?? "", /check:freeze-checklist/);
  assert.match(scripts["prepare:architecture"] ?? "", /check:freeze-checklist/);
  assert.match(runbookDoc, /npm run rc:verify/);
  assert.match(runbookDoc, /One-Click Command/i);
  assert.match(runbookDoc, /check:surface-sync/);
  assert.match(runbookDoc, /check:api-shape/);
  assert.match(releaseGovernanceScript, /config\/rc-freeze-checklist\.json/);
  assert.match(releaseGovernanceScript, /scripts\/check-rc-freeze-checklist\.ts/);
  assert.match(freezeChecklistScript, /release-candidate-dry-run\.md/);
  assert.match(rcVerifyScript, /check:surface-sync/);
  assert.match(rcVerifyScript, /lint:terminology/);
  assert.match(rcVerifyScript, /check:api-shape/);
  assert.match(rcDryRunDoc, /March 8 Traceability Matrix/);
  assert.match(rcDryRunDoc, /Evidence Capture Fields/);
});

test("proof: rollout playbook and runbook docs are present in architecture index", async () => {
  const [readme, rolloutPlaybook, runbook] = await Promise.all([
    readRepoFile("docs/architecture/README.md"),
    readRepoFile("docs/architecture/ROLL_OUT_PLAYBOOK.md"),
    readRepoFile("docs/architecture/RC_VERIFICATION_RUNBOOK.md")
  ]);

  assert.match(readme, /ROLL_OUT_PLAYBOOK\.md/);
  assert.match(readme, /RC_VERIFICATION_RUNBOOK\.md/);
  assert.match(rolloutPlaybook, /Abort Conditions/i);
  assert.match(rolloutPlaybook, /Rollback Rules/i);
  assert.match(runbook, /Pass\/Fail Rules/i);
});
