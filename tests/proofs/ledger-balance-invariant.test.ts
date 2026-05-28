import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-ledger-inv-${randomUUID()}.json`);
}

test("proof: collect line items sum correctly — subtotal + processing = total paid", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `ledger-inv-sum-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(receipt, "collect must succeed");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ledgerTransactions: Array<{
      id: string;
      receiptId: string | null;
      kind: string;
      subtotalUsd: number;
      processingUsd: number;
      totalUsd: number;
      commissionUsd: number;
      payoutUsd: number;
    }>;
    ledgerLineItems: Array<{ transactionId: string; kind: string; amountUsd: number }>;
  };

  const collectTxn = raw.ledgerTransactions.find(
    (t) => t.receiptId === receipt?.id && t.kind === "collect"
  );
  assert.ok(collectTxn, "collect ledger transaction must exist");

  const lineItems = raw.ledgerLineItems.filter((li) => li.transactionId === collectTxn?.id);
  assert.ok(lineItems.length > 0, "collect transaction must have line items");

  const subtotalLine = lineItems.find((li) => li.kind === "collect_subtotal");
  const processingLine = lineItems.find((li) => li.kind === "collect_processing_fee");
  assert.ok(subtotalLine, "collect_subtotal line item must exist");
  assert.ok(processingLine, "collect_processing_fee line item must exist");

  assert.equal(
    Number(subtotalLine.amountUsd.toFixed(2)),
    Number((collectTxn?.subtotalUsd ?? 0).toFixed(2)),
    "collect_subtotal line must match transaction subtotalUsd"
  );

  assert.equal(
    Number(processingLine.amountUsd.toFixed(2)),
    Number((collectTxn?.processingUsd ?? 0).toFixed(2)),
    "collect_processing_fee line must match transaction processingUsd"
  );

  const computedTotal = Number(
    (subtotalLine.amountUsd + processingLine.amountUsd).toFixed(2)
  );
  assert.equal(
    computedTotal,
    Number((collectTxn?.totalUsd ?? 0).toFixed(2)),
    "subtotal + processing must equal totalUsd (what collector paid)"
  );
});

test("proof: collect line items — commission + payout = subtotal (double-entry balance)", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `ledger-inv-balance-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "stardust");
  assert.ok(receipt, "collect must succeed");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ledgerTransactions: Array<{
      id: string;
      receiptId: string | null;
      kind: string;
      subtotalUsd: number;
      commissionUsd: number;
      payoutUsd: number;
    }>;
    ledgerLineItems: Array<{ transactionId: string; kind: string; amountUsd: number }>;
  };

  const collectTxn = raw.ledgerTransactions.find(
    (t) => t.receiptId === receipt?.id && t.kind === "collect"
  );
  assert.ok(collectTxn, "collect ledger transaction must exist");

  const lineItems = raw.ledgerLineItems.filter((li) => li.transactionId === collectTxn?.id);

  const commissionLine = lineItems.find((li) => li.kind === "platform_commission_collect");
  assert.ok(commissionLine, "platform_commission_collect line item must exist");

  const payoutLines = lineItems.filter((li) => li.kind === "artist_payout_collect");
  assert.ok(payoutLines.length >= 1, "at least one artist_payout_collect line item must exist");

  const totalPayoutUsd = payoutLines.reduce((s, li) => s + li.amountUsd, 0);

  assert.equal(
    Number(commissionLine.amountUsd.toFixed(2)),
    Number((collectTxn?.commissionUsd ?? 0).toFixed(2)),
    "commission line must match transaction commissionUsd"
  );

  assert.equal(
    Number(totalPayoutUsd.toFixed(2)),
    Number((collectTxn?.payoutUsd ?? 0).toFixed(2)),
    "sum of payout lines must match transaction payoutUsd"
  );

  const settlementSum = Number(
    (commissionLine.amountUsd + totalPayoutUsd).toFixed(2)
  );
  assert.ok(
    Math.abs(settlementSum - Number(collectTxn.subtotalUsd.toFixed(2))) <= 0.01,
    `commission + payout must equal subtotalUsd within rounding tolerance (got ${settlementSum} vs ${collectTxn.subtotalUsd})`
  );
});

test("proof: refund transaction line items are sign-reversed mirrors of collect line items", async (t) => {
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

  const session = await commerceBffService.createSession({
    email: `ledger-inv-refund-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(receipt, "collect must succeed before refund");

  const rawBefore = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    payments: Array<{ id: string; receiptId: string | null }>;
  };
  const payment = rawBefore.payments.find((p) => p.receiptId === receipt?.id);
  assert.ok(payment, "payment record must exist");

  await commerceBffService.refundPaymentForCreator(
    (
      await commerceBffService.createSession({
        email: "oneofakinde@oneofakinde.test",
        role: "creator"
      })
    ).accountId,
    { paymentId: payment?.id }
  );

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ledgerTransactions: Array<{
      id: string;
      receiptId: string | null;
      kind: string;
      reversalOfTransactionId: string | null;
    }>;
    ledgerLineItems: Array<{ transactionId: string; kind: string; amountUsd: number }>;
  };

  const collectTxn = raw.ledgerTransactions.find(
    (t) => t.receiptId === receipt?.id && t.kind === "collect"
  );
  const refundTxn = raw.ledgerTransactions.find(
    (t) => t.receiptId === receipt?.id && t.kind === "refund"
  );
  assert.ok(collectTxn, "original collect transaction must exist");
  assert.ok(refundTxn, "refund transaction must exist");
  assert.equal(
    refundTxn?.reversalOfTransactionId,
    collectTxn?.id,
    "refund must reference original collect transaction"
  );

  const collectLines = raw.ledgerLineItems.filter((li) => li.transactionId === collectTxn?.id);
  const refundLines = raw.ledgerLineItems.filter((li) => li.transactionId === refundTxn?.id);

  assert.equal(
    refundLines.length,
    collectLines.length,
    "refund must have same number of line items as collect"
  );

  const collectByKind = new Map(collectLines.map((li) => [li.kind, li.amountUsd]));
  for (const refundLine of refundLines) {
    const originalAmount = collectByKind.get(refundLine.kind);
    assert.ok(
      originalAmount !== undefined,
      `refund line kind '${refundLine.kind}' must have matching collect line`
    );
    assert.equal(
      Number(refundLine.amountUsd.toFixed(2)),
      Number((-(originalAmount ?? 0)).toFixed(2)),
      `refund line for '${refundLine.kind}' must be sign-reversed`
    );
  }
});

test("proof: net ledger balance for collect + refund pair is zero", async (t) => {
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

  const session = await commerceBffService.createSession({
    email: `ledger-inv-net-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(receipt, "collect must succeed");

  const rawBefore = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    payments: Array<{ id: string; receiptId: string | null }>;
  };
  const payment = rawBefore.payments.find((p) => p.receiptId === receipt?.id);
  assert.ok(payment, "payment record must exist");

  await commerceBffService.refundPaymentForCreator(
    (
      await commerceBffService.createSession({
        email: "oneofakinde@oneofakinde.test",
        role: "creator"
      })
    ).accountId,
    { paymentId: payment?.id }
  );

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ledgerTransactions: Array<{ id: string; receiptId: string | null; kind: string }>;
    ledgerLineItems: Array<{ transactionId: string; amountUsd: number }>;
  };

  const receiptTxns = raw.ledgerTransactions.filter(
    (t) => t.receiptId === receipt?.id
  );
  assert.ok(receiptTxns.length >= 2, "must have at least collect + refund transactions");

  const receiptTxnIds = new Set(receiptTxns.map((t) => t.id));
  const allLineItems = raw.ledgerLineItems.filter((li) =>
    receiptTxnIds.has(li.transactionId)
  );

  const netBalance = allLineItems.reduce((s, li) => s + li.amountUsd, 0);
  assert.ok(
    Math.abs(netBalance) <= 0.01,
    `net ledger balance for collect + refund must be zero (got ${netBalance.toFixed(4)})`
  );
});
