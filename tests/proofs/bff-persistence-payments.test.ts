import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-proof-${randomUUID()}.json`);
}

test("bff proof: session + purchase persist to file store", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `persistence-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const drop = await commerceBffService.getDropById("voidrunner");
  assert.ok(drop, "expected drop to exist");

  const receipt = await commerceBffService.purchaseDrop(session.accountId, drop.id);
  assert.ok(receipt, "expected purchase receipt");
  assert.equal(receipt?.status, "completed");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    sessions: Array<{ token: string; accountId: string }>;
    receipts: Array<{ id: string; accountId: string }>;
  };

  assert.ok(
    raw.sessions.some((entry) => entry.token === session.sessionToken && entry.accountId === session.accountId),
    "expected persisted session record"
  );
  assert.ok(
    raw.receipts.some((entry) => entry.id === receipt?.id && entry.accountId === session.accountId),
    "expected persisted receipt record"
  );
});

test("bff proof: checkout session and completion flow persists payment contract", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `checkout-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const checkoutSession = await commerceBffService.createCheckoutSession({
    accountId: session.accountId,
    dropId: "twilight-whispers"
  });
  assert.ok(checkoutSession, "expected checkout session response");
  assert.equal(checkoutSession?.status, "pending");

  if (!checkoutSession || checkoutSession.status !== "pending") {
    return;
  }

  await commerceBffService.recordCertificatePreview(session.accountId, "twilight-whispers");
  const receipt = await commerceBffService.completePendingPayment(checkoutSession.paymentId);
  assert.ok(receipt, "expected receipt from pending payment completion");
  assert.equal(receipt?.status, "completed");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    payments: Array<{ id: string; status: string; receiptId?: string }>;
  };
  const payment = raw.payments.find((entry) => entry.id === checkoutSession.paymentId);
  assert.ok(payment, "expected payment record");
  assert.equal(payment?.status, "succeeded");
  assert.ok(payment?.receiptId, "expected payment record to link receipt");
});
