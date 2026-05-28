import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-mdi-${randomUUID()}.json`);
}

test("proof: getMarketDriftSnapshot returns a snapshot with measuredAt", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const snapshot = await commerceBffService.getMarketDriftSnapshot();

  assert.ok(snapshot, "snapshot should be returned");
  assert.ok(typeof snapshot.measuredAt === "string", "measuredAt should be a string");
  assert.ok(snapshot.measuredAt.length > 0, "measuredAt should not be empty");
});

test("proof: getMarketDriftSnapshot counts governance cases correctly", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const snapshotBefore = await commerceBffService.getMarketDriftSnapshot();
  const countBefore = snapshotBefore.openGovernanceCaseCount;

  const session = await commerceBffService.createSession({
    email: `mdi-cases-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "safety_report",
    subjectType: "account",
    subjectId: "subject-drift-1",
    reason: "First drift test case",
  });

  await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "safety_report",
    subjectType: "drop",
    subjectId: "subject-drift-2",
    reason: "Second drift test case",
  });

  const snapshotAfter = await commerceBffService.getMarketDriftSnapshot();

  assert.ok(
    snapshotAfter.openGovernanceCaseCount >= countBefore + 2,
    "openGovernanceCaseCount should increase by at least 2 after creating 2 open cases"
  );
});

test("proof: getMarketDriftSnapshot counts transfer rules with resale active", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const snapshotBefore = await commerceBffService.getMarketDriftSnapshot();
  const countBefore = snapshotBefore.activeResaleRuleCount;

  const dropId = `mdi-resale-drop-${randomUUID().slice(0, 8)}`;

  await commerceBffService.upsertTransferRulesForDrop(dropId, {
    transferable: true,
    giftingAllowed: true,
    resaleAllowed: true,
    requiresCreatorApproval: false,
    royaltyPct: 0.1,
  });

  const snapshotAfter = await commerceBffService.getMarketDriftSnapshot();

  assert.ok(
    snapshotAfter.activeResaleRuleCount > countBefore,
    "activeResaleRuleCount should increase after upserting transfer rules with resaleAllowed:true"
  );
});

test("proof: getMarketDriftSnapshot totalCollects reflects completed receipts", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const snapshot = await commerceBffService.getMarketDriftSnapshot();

  assert.ok(
    typeof snapshot.totalCollects === "number",
    "totalCollects should be a number"
  );
  assert.ok(
    snapshot.totalCollects >= 1,
    "totalCollects should be >= 1 since seeded DB has at least 1 completed receipt"
  );
});
