import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-crf-${randomUUID()}.json`);
}

test("proof: flagCertificateForReview creates a certificate_review case", async (t) => {
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
    email: `crf-admin-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });
  process.env.OOK_MODERATOR_ACCOUNT_IDS = adminSession.accountId;

  const gc = await commerceBffService.flagCertificateForReview(
    adminSession.accountId,
    "cert_seed_stardust",
    "Suspected provenance mismatch on seeded certificate"
  );

  assert.ok(gc, "certificate review case should be created");
  assert.equal(gc.caseType, "certificate_review");
});

test("proof: flagCertificateForReview sets certificate status to under_review", async (t) => {
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
    email: `crf-admin-status-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });
  process.env.OOK_MODERATOR_ACCOUNT_IDS = adminSession.accountId;

  await commerceBffService.flagCertificateForReview(
    adminSession.accountId,
    "cert_seed_stardust",
    "Flagging for status check test"
  );

  const cert = await commerceBffService.getCertificateById("cert_seed_stardust");
  assert.ok(cert, "certificate should exist");
  assert.equal(cert.status, "under_review", "certificate status should be under_review after flagging");
});

test("proof: flagCertificateForReview returns null for unknown certId", async (t) => {
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
    email: `crf-admin-unknown-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });
  process.env.OOK_MODERATOR_ACCOUNT_IDS = adminSession.accountId;

  const result = await commerceBffService.flagCertificateForReview(
    adminSession.accountId,
    "cert_nonexistent_xyz",
    "Should return null for unknown cert"
  );

  assert.equal(result, null);
});
