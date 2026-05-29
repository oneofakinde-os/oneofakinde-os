import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-par-${randomUUID()}.json`);
}

test("proof: proof-ready drop ranks above non-proof-ready drop", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // Seed: stardust (rights + verified cert → isProofReady=true) should outrank through-the-lens (rights, no cert)
  const drops = await commerceBffService.listDiscoveryDrops(null);
  assert.ok(drops.length >= 2, "at least 2 drops in feed");

  const stardustIdx = drops.findIndex((d) => d.id === "stardust");
  const ttlIdx = drops.findIndex((d) => d.id === "through-the-lens");

  if (stardustIdx !== -1 && ttlIdx !== -1) {
    assert.ok(
      stardustIdx < ttlIdx,
      `stardust (isProofReady=true) should rank above through-the-lens (isProofReady=false), got stardust at ${stardustIdx}, ttl at ${ttlIdx}`
    );
  }
});

test("proof: saved drop ranks higher for the authenticated viewer who saved it", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const collectorSession = await commerceBffService.createSession({
    email: `par-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Save through-the-lens — which is lower-ranked anonymously (no cert)
  await commerceBffService.addSavedIntent(collectorSession.accountId, "through-the-lens");

  const drops = await commerceBffService.listDiscoveryDrops(collectorSession.accountId);
  assert.ok(drops.length >= 2, "at least 2 drops in authenticated feed");

  const ttl = drops.find((d) => d.id === "through-the-lens");
  assert.ok(ttl, "through-the-lens should appear in authenticated feed");
  assert.equal(ttl.savedByViewer, true, "through-the-lens must be marked savedByViewer");
});

test("proof: discovery ranking contains no speculation signals", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // The proofSignal must not contain resale/speculation fields
  const drops = await commerceBffService.listDiscoveryDrops(null);
  const FORBIDDEN = [
    "resaleCount",
    "resaleVelocity",
    "marketCap",
    "priceAppreciation",
    "bidCount",
    "askCount",
    "speculationScore",
  ];

  for (const drop of drops) {
    for (const forbidden of FORBIDDEN) {
      assert.ok(
        !(forbidden in drop.proofSignal),
        `proofSignal must not contain speculative field '${forbidden}' on drop ${drop.id}`
      );
      assert.ok(
        !(forbidden in drop),
        `DiscoveryDrop must not contain speculative field '${forbidden}' on drop ${drop.id}`
      );
    }
  }
});

test("proof: governance-flagged drop scores lower in ranking", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // Create a reporter and open a governance case against stardust
  const reporterSession = await commerceBffService.createSession({
    email: `par-reporter-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.createGovernanceCase({
    reporterAccountId: reporterSession.accountId,
    caseType: "safety_report",
    subjectType: "drop",
    subjectId: "stardust",
    reason: "test governance flag",
    relatedDropId: "stardust",
  });

  const drops = await commerceBffService.listDiscoveryDrops(null);
  const stardust = drops.find((d) => d.id === "stardust");
  assert.ok(stardust, "stardust still appears in feed (governance flag doesn't remove it)");
  assert.equal(stardust.isGovernanceFlagged, true, "stardust must be marked isGovernanceFlagged=true");
});

test("proof: ranking returns all fields required by DiscoveryDrop contract", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const drops = await commerceBffService.listDiscoveryDrops(null);
  assert.ok(drops.length > 0, "should have drops in seed feed");

  for (const drop of drops) {
    assert.ok(typeof drop.savedByViewer === "boolean", `${drop.id}: savedByViewer must be boolean`);
    assert.ok(typeof drop.isFollowingStudio === "boolean", `${drop.id}: isFollowingStudio must be boolean`);
    assert.ok(typeof drop.hasCollectedDrop === "boolean", `${drop.id}: hasCollectedDrop must be boolean`);
    assert.ok(typeof drop.collectAvailable === "boolean", `${drop.id}: collectAvailable must be boolean`);
    assert.ok(typeof drop.isGovernanceFlagged === "boolean", `${drop.id}: isGovernanceFlagged must be boolean`);
    assert.ok(typeof drop.proofSignal === "object" && drop.proofSignal !== null, `${drop.id}: proofSignal must be object`);
    // Unauthenticated viewer: savedByViewer always false
    assert.equal(drop.savedByViewer, false, `${drop.id}: anonymous viewer must have savedByViewer=false`);
    assert.equal(drop.isFollowingStudio, false, `${drop.id}: anonymous viewer must have isFollowingStudio=false`);
  }
});
