import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-gad-${randomUUID()}.json`);
}

test("proof: governance-flagged drop is marked isGovernanceFlagged in discovery feed", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const reporterSession = await commerceBffService.createSession({
    email: `gad-reporter-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Stardust exists in seed with rights metadata — open a case against it
  await commerceBffService.createGovernanceCase({
    reporterAccountId: reporterSession.accountId,
    caseType: "safety_report",
    subjectType: "drop",
    subjectId: "stardust",
    reason: "governance-aware discovery test",
    relatedDropId: "stardust",
  });

  const drops = await commerceBffService.listDiscoveryDrops(null);
  const stardust = drops.find((d) => d.id === "stardust");
  assert.ok(stardust, "stardust must still appear in discovery (governance flag does not remove it)");
  assert.equal(stardust.isGovernanceFlagged, true, "stardust must have isGovernanceFlagged=true");
});

test("proof: rights_dispute governance case blocks isProofReady signal", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const reporterSession = await commerceBffService.createSession({
    email: `gad-reporter2-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Stardust is proof-ready (verified cert + rights) but a rights_dispute case revokes isProofReady
  const preCaseDrops = await commerceBffService.listDiscoveryDrops(null);
  const stardustBefore = preCaseDrops.find((d) => d.id === "stardust");
  assert.ok(stardustBefore, "stardust must be in feed before governance case");
  assert.equal(stardustBefore.proofSignal.isProofReady, true, "stardust must be proof-ready before rights dispute");

  await commerceBffService.createGovernanceCase({
    reporterAccountId: reporterSession.accountId,
    caseType: "rights_dispute",
    subjectType: "drop",
    subjectId: "stardust",
    reason: "testing rights dispute blocks proof-ready",
    relatedDropId: "stardust",
  });

  const postCaseDrops = await commerceBffService.listDiscoveryDrops(null);
  const stardustAfter = postCaseDrops.find((d) => d.id === "stardust");
  assert.ok(stardustAfter, "stardust must still appear in discovery after rights dispute");
  assert.equal(
    stardustAfter.proofSignal.isProofReady,
    false,
    "stardust must have isProofReady=false while active rights_dispute exists"
  );
  assert.equal(
    stardustAfter.isGovernanceFlagged,
    true,
    "stardust must be isGovernanceFlagged=true with active rights_dispute"
  );
});

test("proof: governance-aware proofReady filter excludes dispute-blocked drops", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const reporterSession = await commerceBffService.createSession({
    email: `gad-reporter3-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Before rights dispute: stardust should appear in proofReady filter
  const beforeFilter = await commerceBffService.listDiscoveryDrops(null, { proofReady: true });
  const stardustBefore = beforeFilter.find((d) => d.id === "stardust");
  assert.ok(stardustBefore, "stardust must appear in proof-ready filter before rights dispute");

  // Open rights_dispute against stardust
  await commerceBffService.createGovernanceCase({
    reporterAccountId: reporterSession.accountId,
    caseType: "rights_dispute",
    subjectType: "drop",
    subjectId: "stardust",
    reason: "testing dispute blocks proof-ready filter",
    relatedDropId: "stardust",
  });

  // After rights dispute: stardust should be excluded from proofReady filter
  const afterFilter = await commerceBffService.listDiscoveryDrops(null, { proofReady: true });
  const stardustAfter = afterFilter.find((d) => d.id === "stardust");
  assert.equal(
    stardustAfter,
    undefined,
    "stardust with active rights_dispute must be excluded from proof-ready filter"
  );
});

test("proof: governance case count is reflected in drift metrics", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const reporterSession = await commerceBffService.createSession({
    email: `gad-reporter4-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const metricsBefore = await commerceBffService.getDiscoveryDriftMetrics();
  const initialCount = metricsBefore.governanceFlaggedContentExposureCount;

  await commerceBffService.createGovernanceCase({
    reporterAccountId: reporterSession.accountId,
    caseType: "safety_report",
    subjectType: "drop",
    subjectId: "through-the-lens",
    reason: "governance drift metrics test",
    relatedDropId: "through-the-lens",
  });

  const metricsAfter = await commerceBffService.getDiscoveryDriftMetrics();
  assert.equal(
    metricsAfter.governanceFlaggedContentExposureCount,
    initialCount + 1,
    "governanceFlaggedContentExposureCount must increment after governance case opened against published drop"
  );
});
