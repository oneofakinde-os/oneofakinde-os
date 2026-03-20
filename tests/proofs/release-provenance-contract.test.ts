import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

type ReleaseProvenance = {
  governance?: {
    source_of_truth_branch?: string;
    promotion_mode?: string;
    forbid_direct_hotfixes?: boolean;
  };
  canonical_release?: {
    release_id?: string;
    main_sha?: string;
    github_pr?: number;
    github_merge_commit_sha?: string;
    disposition?: string;
  };
  signed_launch_tag?: {
    name?: string;
    target_sha?: string;
    required?: boolean;
    verification_status?: string;
  };
  sha_lock?: {
    local_head_sha?: string;
    github_main_sha?: string;
    vercel_deployment_sha?: string;
  };
  status?: string;
};

async function readRepoFile(relativePath: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("proof: release provenance contract remains pass with strict sha lock parity", async () => {
  const provenanceText = await readRepoFile("config/release-provenance.json");
  const provenance = JSON.parse(provenanceText) as ReleaseProvenance;

  assert.equal(provenance.governance?.source_of_truth_branch, "main");
  assert.equal(provenance.governance?.promotion_mode, "sha-locked");
  assert.equal(provenance.governance?.forbid_direct_hotfixes, true);

  assert.match(provenance.canonical_release?.main_sha ?? "", /^[0-9a-f]{40}$/);
  assert.equal(provenance.canonical_release?.main_sha, provenance.canonical_release?.github_merge_commit_sha);
  assert.equal(provenance.canonical_release?.disposition, "PASS");
  assert.ok((provenance.canonical_release?.github_pr ?? 0) > 0);

  assert.equal(provenance.signed_launch_tag?.required, true);
  assert.equal(provenance.signed_launch_tag?.verification_status, "PASS");
  assert.match(provenance.signed_launch_tag?.name ?? "", /^launch\/\d{4}-\d{2}-\d{2}-/);
  assert.equal(provenance.signed_launch_tag?.target_sha, provenance.canonical_release?.main_sha);

  assert.equal(provenance.sha_lock?.local_head_sha, provenance.sha_lock?.github_main_sha);
  assert.equal(provenance.sha_lock?.local_head_sha, provenance.sha_lock?.vercel_deployment_sha);
  assert.equal(provenance.sha_lock?.local_head_sha, provenance.canonical_release?.main_sha);
  assert.equal(provenance.status, "PASS");
});

test("proof: release provenance docs and runbook wiring remain enforced", async () => {
  const [provenanceDoc, runbookDoc, rolloutDoc, readme] = await Promise.all([
    readRepoFile("docs/architecture/RELEASE_PROVENANCE.md"),
    readRepoFile("docs/architecture/RC_VERIFICATION_RUNBOOK.md"),
    readRepoFile("docs/architecture/ROLL_OUT_PLAYBOOK.md"),
    readRepoFile("docs/architecture/README.md")
  ]);

  assert.match(provenanceDoc, /Release Provenance Contract \(RY-16\)/);
  assert.match(provenanceDoc, /Signed Launch Tag Guard/);
  assert.match(runbookDoc, /check:release-provenance/);
  assert.match(runbookDoc, /RELEASE_PROVENANCE\.md/);
  assert.match(rolloutDoc, /config\/release-provenance\.json/);
  assert.match(rolloutDoc, /RELEASE_PROVENANCE\.md/);
  assert.match(readme, /RELEASE_PROVENANCE\.md/);
});
