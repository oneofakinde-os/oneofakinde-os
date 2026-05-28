import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-pde-${randomUUID()}.json`);
}

test("proof: exportAccountData includes savedIntents field", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `pde-intents-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const exported = await commerceBffService.exportAccountData(session.accountId);

  assert.ok(exported, "export should be returned");
  assert.ok("savedIntents" in exported, "export should include savedIntents field");
  assert.ok(Array.isArray(exported.savedIntents), "savedIntents should be an array");
});

test("proof: exportAccountData includes provenanceEvents field", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `pde-provenance-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const exported = await commerceBffService.exportAccountData(session.accountId);

  assert.ok(exported, "export should be returned");
  assert.ok("provenanceEvents" in exported, "export should include provenanceEvents field");
  assert.ok(Array.isArray(exported.provenanceEvents), "provenanceEvents should be an array");
});

test("proof: exportAccountData includes creatorEarnings field", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `pde-earnings-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });

  const exported = await commerceBffService.exportAccountData(session.accountId);

  assert.ok(exported, "export should be returned");
  assert.ok("creatorEarnings" in exported, "export should include creatorEarnings field");
  assert.ok(Array.isArray(exported.creatorEarnings), "creatorEarnings should be an array");
});

test("proof: exportAccountData includes governanceCases field", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `pde-gvcases-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const exported = await commerceBffService.exportAccountData(session.accountId);

  assert.ok(exported, "export should be returned");
  assert.ok("governanceCases" in exported, "export should include governanceCases field");
  assert.ok(Array.isArray(exported.governanceCases), "governanceCases should be an array");
});

test("proof: exportAccountData governanceCases includes only reporter's cases", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const sessionA = await commerceBffService.createSession({
    email: `pde-gv-acct-a-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const sessionB = await commerceBffService.createSession({
    email: `pde-gv-acct-b-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const gcA = await commerceBffService.createGovernanceCase({
    reporterAccountId: sessionA.accountId,
    caseType: "safety_report",
    subjectType: "account",
    subjectId: "subject-export-a",
    reason: "Account A's governance case for export test",
  });

  await commerceBffService.createGovernanceCase({
    reporterAccountId: sessionB.accountId,
    caseType: "safety_report",
    subjectType: "drop",
    subjectId: "subject-export-b",
    reason: "Account B's governance case — should not appear in A's export",
  });

  assert.ok(gcA, "account A's governance case should be created");

  const exportedA = await commerceBffService.exportAccountData(sessionA.accountId);

  assert.ok(exportedA, "export for account A should be returned");
  assert.ok(Array.isArray(exportedA.governanceCases), "governanceCases should be an array");

  const foundA = exportedA.governanceCases.find((c) => c.id === gcA.id);
  assert.ok(foundA, "account A's case should appear in account A's export");

  for (const c of exportedA.governanceCases) {
    assert.equal(
      c.reporterAccountId,
      sessionA.accountId,
      "export should only contain cases where account A is the reporter"
    );
  }
});
