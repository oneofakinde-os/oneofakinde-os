import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-gcs-${randomUUID()}.json`);
}

test("proof: updateGovernanceCaseStatus transitions to under_review", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gcs-review-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const adminSession = await commerceBffService.createSession({
    email: `gcs-admin-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });

  const gc = await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "safety_report",
    subjectType: "account",
    subjectId: "subject-z",
    reason: "Testing under_review transition",
  });

  assert.ok(gc, "governance case should be created");

  const updated = await commerceBffService.updateGovernanceCaseStatus(
    adminSession.accountId,
    gc.id,
    "under_review"
  );

  assert.ok(updated, "updated case should be returned");
  assert.equal(updated.status, "under_review");
  assert.equal(updated.resolvedAt, null);
});

test("proof: updateGovernanceCaseStatus sets resolvedAt on closed", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gcs-resolve-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const adminSession = await commerceBffService.createSession({
    email: `gcs-admin-resolve-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });

  const gc = await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "safety_report",
    subjectType: "account",
    subjectId: "subject-resolve",
    reason: "Testing resolved status",
  });

  assert.ok(gc, "governance case should be created");

  const resolved = await commerceBffService.updateGovernanceCaseStatus(
    adminSession.accountId,
    gc.id,
    "resolved"
  );

  assert.ok(resolved, "resolved case should be returned");
  assert.equal(resolved.status, "resolved");
  assert.ok(resolved.resolvedAt, "resolvedAt should be set when status is resolved");
});

test("proof: updateGovernanceCaseStatus sets notes when provided", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `gcs-notes-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const adminSession = await commerceBffService.createSession({
    email: `gcs-admin-notes-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });

  const gc = await commerceBffService.createGovernanceCase({
    reporterAccountId: session.accountId,
    caseType: "safety_report",
    subjectType: "drop",
    subjectId: "subject-notes",
    reason: "Testing notes field",
  });

  assert.ok(gc, "governance case should be created");

  const withNotes = await commerceBffService.updateGovernanceCaseStatus(
    adminSession.accountId,
    gc.id,
    "under_review",
    "Admin reviewed and flagged for further investigation"
  );

  assert.ok(withNotes, "updated case should be returned");
  assert.ok(withNotes.notes, "notes should be set");
  assert.ok(
    withNotes.notes!.includes("Admin reviewed"),
    "notes should contain provided text"
  );
});

test("proof: updateGovernanceCaseStatus returns null for unknown caseId", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const adminSession = await commerceBffService.createSession({
    email: `gcs-admin-unknown-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });

  const result = await commerceBffService.updateGovernanceCaseStatus(
    adminSession.accountId,
    "gc_nonexistent_case_id",
    "resolved"
  );

  assert.equal(result, null);
});
