import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-gcc-${randomUUID()}.json`);
}

test("proof: createGovernanceCase creates a case with correct fields", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gcc-test-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const gc = await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "safety_report",
    subjectType: "account",
    subjectId: "some-account-id",
    reason: "Test safety report reason",
  });

  assert.ok(gc, "governance case should be created");
  assert.ok(gc.id.startsWith("gc_"), "id should start with gc_");
  assert.equal(gc.status, "open");
  assert.equal(gc.caseType, "safety_report");
  assert.equal(gc.reporterAccountId, session.accountId);
  assert.equal(gc.resolvedAt, null);
});

test("proof: createGovernanceCase returns null for unknown reporter", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const result = await commerceBffService.createGovernanceCase({
    reporterAccountId: "non-existent-account-id",
    caseType: "safety_report",
    subjectType: "account",
    subjectId: "some-account-id",
    reason: "Should not work",
  });

  assert.equal(result, null);
});

test("proof: listGovernanceCases returns all cases sorted newest first", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gcc-list-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const gc1 = await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "safety_report",
    subjectType: "account",
    subjectId: "subject-a",
    reason: "First case",
  });

  const gc2 = await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "safety_report",
    subjectType: "drop",
    subjectId: "subject-b",
    reason: "Second case",
  });

  assert.ok(gc1, "first case should be created");
  assert.ok(gc2, "second case should be created");

  const cases = await commerceBffService.listGovernanceCases({});
  assert.ok(Array.isArray(cases), "should return an array");
  assert.ok(cases.length >= 2, "should have at least 2 cases");

  const ids = cases.map((c) => c.id);
  const idx1 = ids.indexOf(gc1.id);
  const idx2 = ids.indexOf(gc2.id);
  assert.ok(idx1 >= 0, "first case should be in list");
  assert.ok(idx2 >= 0, "second case should be in list");
  assert.ok(idx2 < idx1, "most recent case should come first");
});

test("proof: getGovernanceCasesForAccount returns only reporter's cases", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const sessionA = await commerceBffService.createSession({
    email: `gcc-acct-a-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const sessionB = await commerceBffService.createSession({
    email: `gcc-acct-b-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.createGovernanceCase({
    reporterAccountId: sessionA.accountId,
    caseType: "safety_report",
    subjectType: "account",
    subjectId: "subject-x",
    reason: "Account A case",
  });

  await commerceBffService.createGovernanceCase({
    reporterAccountId: sessionB.accountId,
    caseType: "safety_report",
    subjectType: "drop",
    subjectId: "subject-y",
    reason: "Account B case",
  });

  const casesA = await commerceBffService.getGovernanceCasesForAccount(sessionA.accountId);
  const casesB = await commerceBffService.getGovernanceCasesForAccount(sessionB.accountId);

  assert.ok(Array.isArray(casesA), "should return array for account A");
  assert.ok(Array.isArray(casesB), "should return array for account B");

  for (const c of casesA) {
    assert.equal(c.reporterAccountId, sessionA.accountId, "account A cases should only belong to account A");
  }

  for (const c of casesB) {
    assert.equal(c.reporterAccountId, sessionB.accountId, "account B cases should only belong to account B");
  }

  const bIdsInA = casesA.filter((c) => c.reporterAccountId === sessionB.accountId);
  assert.equal(bIdsInA.length, 0, "account A should not see account B's cases");
});
