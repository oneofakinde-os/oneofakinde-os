import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-aet-${randomUUID()}.json`);
}

test("proof: governance case operations succeed with audit trail intact", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    delete process.env.OOK_MODERATOR_ACCOUNT_IDS;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `aet-ops-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const adminSession = await commerceBffService.createSession({
    email: `aet-admin-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });
  process.env.OOK_MODERATOR_ACCOUNT_IDS = adminSession.accountId;

  const gc = await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "safety_report",
    subjectType: "account",
    subjectId: "subject-audit-ops",
    reason: "Audit trail ops test — initial case",
  });

  assert.ok(gc, "governance case creation should succeed with audit trail intact");

  const updated = await commerceBffService.updateGovernanceCaseStatus(
    adminSession.accountId,
    gc.id,
    "under_review"
  );

  assert.ok(updated, "status update should succeed with audit trail intact");
  assert.equal(updated.status, "under_review");

  const withNote = await commerceBffService.addGovernanceCaseNote(
    adminSession.accountId,
    gc.id,
    "Audit trail note added during review"
  );

  assert.ok(withNote, "addGovernanceCaseNote should succeed with audit trail intact");
  assert.ok(withNote.notes, "note should be persisted");
});

test("proof: multiple governance operations produce consistent state", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    delete process.env.OOK_MODERATOR_ACCOUNT_IDS;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `aet-multi-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const adminSession = await commerceBffService.createSession({
    email: `aet-multi-admin-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });
  process.env.OOK_MODERATOR_ACCOUNT_IDS = adminSession.accountId;

  const countBefore = (await commerceBffService.listGovernanceCases({})).length;

  const gc1 = await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "safety_report",
    subjectType: "account",
    subjectId: "subject-multi-1",
    reason: "Multi-op test case 1",
  });

  const gc2 = await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "safety_report",
    subjectType: "drop",
    subjectId: "subject-multi-2",
    reason: "Multi-op test case 2",
  });

  const gc3 = await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "policy_review",
    subjectType: "account",
    subjectId: "subject-multi-3",
    reason: "Multi-op test case 3",
  });

  assert.ok(gc1, "first case should be created");
  assert.ok(gc2, "second case should be created");
  assert.ok(gc3, "third case should be created");

  await commerceBffService.updateGovernanceCaseStatus(
    adminSession.accountId,
    gc1.id,
    "under_review"
  );

  await commerceBffService.updateGovernanceCaseStatus(
    adminSession.accountId,
    gc2.id,
    "resolved"
  );

  const allCases = await commerceBffService.listGovernanceCases({});

  assert.ok(
    allCases.length >= countBefore + 3,
    "list should include all 3 newly created cases"
  );

  const found1 = allCases.find((c) => c.id === gc1.id);
  const found2 = allCases.find((c) => c.id === gc2.id);
  const found3 = allCases.find((c) => c.id === gc3.id);

  assert.ok(found1, "first case should appear in list");
  assert.ok(found2, "second case should appear in list");
  assert.ok(found3, "third case should appear in list");

  assert.equal(found1!.status, "under_review", "first case should have under_review status");
  assert.equal(found2!.status, "resolved", "second case should have resolved status");
  assert.equal(found3!.status, "open", "third case should remain open");
});

test("proof: audit trail does not block case resolution", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    delete process.env.OOK_MODERATOR_ACCOUNT_IDS;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `aet-resolve-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const adminSession = await commerceBffService.createSession({
    email: `aet-resolve-admin-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });
  process.env.OOK_MODERATOR_ACCOUNT_IDS = adminSession.accountId;

  const gc = await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "safety_report",
    subjectType: "drop",
    subjectId: "subject-audit-resolve",
    reason: "Audit trail resolution test",
  });

  assert.ok(gc, "governance case should be created");

  const resolved = await commerceBffService.updateGovernanceCaseStatus(
    adminSession.accountId,
    gc.id,
    "resolved"
  );

  assert.ok(resolved, "case resolution should not be blocked by audit trail");
  assert.equal(resolved.status, "resolved");
  assert.ok(resolved.resolvedAt, "resolvedAt should be set on resolved case");
});

test("proof: flagCertificateForReview changes cert status without breaking audit", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    delete process.env.OOK_MODERATOR_ACCOUNT_IDS;
    await fs.rm(dbPath, { force: true });
  });

  const adminSession = await commerceBffService.createSession({
    email: `aet-flag-cert-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });
  process.env.OOK_MODERATOR_ACCOUNT_IDS = adminSession.accountId;

  const gc = await commerceBffService.flagCertificateForReview(
    adminSession.accountId,
    "cert_seed_stardust",
    "Audit trail test: flagging seeded certificate for review"
  );

  assert.ok(gc, "flagCertificateForReview should succeed with audit trail intact");
  assert.equal(gc.caseType, "certificate_review", "case type should be certificate_review");

  const cert = await commerceBffService.getCertificateById("cert_seed_stardust");
  assert.ok(cert, "certificate should still exist after flagging");
  assert.equal(
    cert.status,
    "under_review",
    "certificate status should be under_review after flagging"
  );
});
