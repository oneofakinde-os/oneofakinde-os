import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-cds-${randomUUID()}.json`);
}

test("proof: openCollectDispute creates a collect_dispute case", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `cds-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const gc = await commerceBffService.openCollectDispute({
    reporterAccountId: session.accountId,
    receiptId: "receipt_test_001",
    reason: "Payment was processed but ownership was not issued",
  });

  assert.ok(gc, "collect dispute case should be created");
  assert.equal(gc.caseType, "collect_dispute");
  assert.equal(gc.status, "open");
  assert.equal(gc.reporterAccountId, session.accountId);
});

test("proof: openCollectDispute links to the receipt", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `cds-link-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const receiptId = `rcpt_test_${randomUUID().slice(0, 8)}`;

  const gc = await commerceBffService.openCollectDispute({
    reporterAccountId: session.accountId,
    receiptId,
    reason: "Testing relatedReceiptId linkage",
  });

  assert.ok(gc, "collect dispute case should be created");
  assert.equal(gc.relatedReceiptId, receiptId);
});

test("proof: openCollectDispute returns null for unknown reporter", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const result = await commerceBffService.openCollectDispute({
    reporterAccountId: "non-existent-account-id-xyz",
    receiptId: "receipt_test_002",
    reason: "Should not work for unknown reporter",
  });

  assert.equal(result, null);
});
