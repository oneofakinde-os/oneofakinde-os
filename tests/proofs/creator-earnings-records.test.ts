import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-earn-${randomUUID()}.json`);
}

test("proof: creator earnings record is created on successful collect", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `earn-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(receipt, "collect must succeed");
  assert.equal(receipt?.status, "completed");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    creatorEarnings: Array<{
      id: string;
      studioHandle: string;
      dropId: string;
      receiptId: string;
      ledgerTransactionId: string;
      grossAmountUsd: number;
      platformFeeUsd: number;
      netAmountUsd: number;
      payoutStatus: string;
    }>;
  };

  assert.ok(Array.isArray(raw.creatorEarnings), "creatorEarnings collection must exist");
  const earnings = raw.creatorEarnings.find((e) => e.receiptId === receipt?.id);
  assert.ok(earnings, "creator earnings record must be created for the collect receipt");
  assert.equal(earnings.dropId, "voidrunner");
  assert.ok(earnings.studioHandle, "studioHandle must be set");
  assert.ok(earnings.id.startsWith("earn_"), "id must use earn_ prefix");
  assert.equal(earnings.payoutStatus, "pending", "initial payout status must be pending");
});

test("proof: creator earnings fee math matches the settlement quote", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `earn-fee-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(receipt);

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    creatorEarnings: Array<{
      receiptId: string;
      grossAmountUsd: number;
      platformFeeUsd: number;
      netAmountUsd: number;
    }>;
  };

  const earnings = raw.creatorEarnings.find((e) => e.receiptId === receipt?.id);
  assert.ok(earnings);

  assert.equal(
    Number(earnings.grossAmountUsd.toFixed(2)),
    Number((receipt?.amountUsd ?? 0).toFixed(2)),
    "grossAmountUsd must equal the receipt total (what the collector paid)"
  );
  assert.equal(
    Number(earnings.platformFeeUsd.toFixed(2)),
    Number((receipt?.commissionUsd ?? 0).toFixed(2)),
    "platformFeeUsd must equal the commission from the quote"
  );
  assert.equal(
    Number(earnings.netAmountUsd.toFixed(2)),
    Number((receipt?.payoutUsd ?? 0).toFixed(2)),
    "netAmountUsd must equal the payout from the quote"
  );
  assert.ok(
    Number(earnings.grossAmountUsd.toFixed(2)) >=
      Number((earnings.platformFeeUsd + earnings.netAmountUsd).toFixed(2)) - 0.01,
    "gross >= platform fee + net earnings (within rounding tolerance)"
  );
});

test("proof: creator earnings payout status is reversed on refund", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  const collectorSession = await commerceBffService.createSession({
    email: `earn-refund-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(collectorSession.accountId, "voidrunner");
  assert.ok(receipt, "collect must succeed before refund");

  // Simulate refund via the creator refund method
  const payment = await (async () => {
    const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
      payments: Array<{ id: string; receiptId: string | null }>;
    };
    return raw.payments.find((p) => p.receiptId === receipt?.id);
  })();
  assert.ok(payment, "payment record must exist");

  await commerceBffService.refundPaymentForCreator(
    (await commerceBffService.createSession({
      email: "oneofakinde@oneofakinde.test",
      role: "creator"
    })).accountId,
    { paymentId: payment?.id }
  );

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    creatorEarnings: Array<{ receiptId: string; payoutStatus: string }>;
  };
  const earnings = raw.creatorEarnings.find((e) => e.receiptId === receipt?.id);
  assert.ok(earnings, "earnings record must still exist after refund");
  assert.equal(
    earnings.payoutStatus,
    "reversed",
    "payout status must be reversed after refund"
  );
});

test("proof: creator earnings summary aggregates pending and available correctly", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  const c1 = await commerceBffService.createSession({
    email: `earn-sum1-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const c2 = await commerceBffService.createSession({
    email: `earn-sum2-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const r1 = await commerceBffService.purchaseDrop(c1.accountId, "voidrunner");
  const r2 = await commerceBffService.purchaseDrop(c2.accountId, "stardust");

  assert.ok(r1 && r2, "both collects must succeed");

  const summary = await commerceBffService.getCreatorEarningsSummary("oneofakinde");
  assert.ok(summary.pendingCount >= 2, "must have at least 2 pending records");
  assert.ok(summary.totalGrossUsd > 0, "total gross must be positive");
  assert.ok(summary.totalNetUsd > 0, "total net must be positive");
  assert.ok(
    summary.totalGrossUsd >= summary.totalPlatformFeeUsd + summary.totalNetUsd - 0.02,
    "gross >= fees + net (within rounding tolerance)"
  );
});

test("proof: creator earnings record links ledger transaction correctly", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `earn-link-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(receipt?.ledgerTransactionId);

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    creatorEarnings: Array<{ receiptId: string; ledgerTransactionId: string }>;
    ledgerTransactions: Array<{ id: string; kind: string }>;
  };

  const earnings = raw.creatorEarnings.find((e) => e.receiptId === receipt?.id);
  assert.ok(earnings, "earnings record must exist");
  assert.equal(
    earnings.ledgerTransactionId,
    receipt?.ledgerTransactionId,
    "earnings must reference the same ledger transaction as the receipt"
  );

  const txn = raw.ledgerTransactions.find((t) => t.id === earnings.ledgerTransactionId);
  assert.ok(txn, "ledger transaction referenced by earnings must exist");
  assert.equal(txn.kind, "collect");
});
