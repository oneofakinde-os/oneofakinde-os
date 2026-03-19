import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postCheckoutRoute } from "../../app/api/v1/payments/checkout/[drop_id]/route";
import { POST as postStripeWebhookRoute } from "../../app/api/v1/payments/webhooks/stripe/route";
import { commerceBffService } from "../../lib/bff/service";
import { buildCollectSettlementQuote } from "../../lib/domain/quote-engine";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-proof-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function createStripeSignedRequest(
  eventPayload: Record<string, unknown>,
  webhookSecret: string
): Request {
  const payloadText = JSON.stringify(eventPayload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payloadText}`, "utf8")
    .digest("hex");

  return new Request("http://127.0.0.1:3000/api/v1/payments/webhooks/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${signature}`
    },
    body: payloadText
  });
}

test("proof: settlement quotes are deterministic across engine and checkout preview", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const quoteA = buildCollectSettlementQuote({
    subtotalUsd: 12,
    processingUsd: 0.39
  });
  const quoteB = buildCollectSettlementQuote({
    subtotalUsd: 12,
    processingUsd: 0.39
  });
  assert.deepEqual(quoteA, quoteB, "expected deterministic quote output");

  const session = await commerceBffService.createSession({
    email: `quote-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const previewA = await commerceBffService.getCheckoutPreview(session.accountId, "through-the-lens");
  const previewB = await commerceBffService.getCheckoutPreview(session.accountId, "through-the-lens");
  assert.ok(previewA, "expected preview");
  assert.ok(previewB, "expected preview");

  if (!previewA || !previewB) {
    return;
  }

  assert.deepEqual(previewA.quote, previewB.quote, "expected stable checkout quote");
  assert.equal(previewA.totalUsd, previewA.quote.totalUsd);
  assert.equal(previewA.subtotalUsd, previewA.quote.subtotalUsd);
  assert.equal(previewA.processingUsd, previewA.quote.processingUsd);
});

test("proof: collect receipt includes ledger-backed settlement line items", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `receipt-ledger-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "voidrunner");
  assert.ok(receipt, "expected completed receipt");
  assert.equal(receipt?.status, "completed");
  assert.ok(receipt?.ledgerTransactionId, "expected collect ledger transaction id");

  if (!receipt) {
    return;
  }

  const resolvedReceipt = await commerceBffService.getReceipt(session.accountId, receipt.id);
  assert.ok(resolvedReceipt, "expected receipt lookup");
  assert.ok(resolvedReceipt?.lineItems && resolvedReceipt.lineItems.length > 0, "expected line items");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ledgerTransactions: Array<{ id: string; receiptId: string | null; kind: string }>;
    ledgerLineItems: Array<{ transactionId: string; kind: string; amountUsd: number }>;
  };

  const collectTransaction = raw.ledgerTransactions.find(
    (entry) => entry.receiptId === receipt.id && entry.kind === "collect"
  );
  assert.ok(collectTransaction, "expected collect ledger transaction");

  const collectLineItems = raw.ledgerLineItems.filter(
    (entry) => entry.transactionId === collectTransaction?.id
  );
  assert.ok(collectLineItems.length >= 4, "expected collect quote line-item expansion");
  assert.equal(resolvedReceipt?.lineItems?.length, collectLineItems.length);
});

test("proof: derivative collect payout splits follow authorized lineage split recipients", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creatorSession = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const collaboratorSession = await commerceBffService.createSession({
    email: "collaborator@oneofakinde.test",
    role: "collector"
  });
  const collectorSession = await commerceBffService.createSession({
    email: `derivative-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const derivative = await commerceBffService.createAuthorizedDerivative(
    creatorSession.accountId,
    "stardust",
    {
      derivativeDropId: "voidrunner",
      kind: "remix",
      attribution: "authorized remix split for settlement proof.",
      revenueSplits: [
        {
          recipientHandle: "oneofakinde",
          sharePercent: 70
        },
        {
          recipientHandle: "collaborator",
          sharePercent: 30
        }
      ]
    }
  );
  assert.ok(derivative, "expected derivative authorization");

  const receipt = await commerceBffService.purchaseDrop(collectorSession.accountId, "voidrunner");
  assert.ok(receipt, "expected derivative collect receipt");
  if (!receipt) {
    return;
  }

  const receiptLineItems = receipt.lineItems ?? [];
  const payoutLineItems = receiptLineItems.filter((entry) => entry.kind === "artist_payout_collect");
  assert.equal(payoutLineItems.length, 2, "expected split payout line items");

  const payoutByRecipientId = new Map(
    payoutLineItems.map((entry) => [entry.recipientAccountId ?? "", Number(entry.amountUsd.toFixed(2))])
  );

  assert.equal(
    payoutByRecipientId.get(creatorSession.accountId),
    6.82,
    "expected creator split payout amount"
  );
  assert.equal(
    payoutByRecipientId.get(collaboratorSession.accountId),
    2.92,
    "expected collaborator split payout amount"
  );

  const payoutTotal = payoutLineItems.reduce((sum, entry) => sum + entry.amountUsd, 0);
  assert.equal(
    Number(payoutTotal.toFixed(2)),
    Number((receipt.payoutUsd ?? 0).toFixed(2)),
    "expected split payout total to match quote payout total"
  );

  const workshopPanel = await commerceBffService.getWorkshopAnalyticsPanel(creatorSession.accountId);
  assert.ok(workshopPanel, "expected workshop analytics payout summary");
  if (!workshopPanel) {
    return;
  }

  assert.ok(workshopPanel.payouts.completedReceipts >= 1);
  assert.ok(workshopPanel.payouts.missingLedgerReceiptCount >= 0);
  assert.equal(
    Number((workshopPanel.payouts.payoutUsd - workshopPanel.payouts.payoutLedgerUsd).toFixed(2)),
    Number(workshopPanel.payouts.payoutParityDeltaUsd.toFixed(2))
  );
});

test("proof: non-derivative collect payout remains single-recipient", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creatorSession = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const collectorSession = await commerceBffService.createSession({
    email: `plain-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(collectorSession.accountId, "through-the-lens");
  assert.ok(receipt, "expected non-derivative collect receipt");
  if (!receipt) {
    return;
  }

  const receiptLineItems = receipt.lineItems ?? [];
  const payoutLineItems = receiptLineItems.filter((entry) => entry.kind === "artist_payout_collect");
  assert.equal(payoutLineItems.length, 1, "expected single payout line item for non-derivative drop");
  assert.equal(
    payoutLineItems[0]?.recipientAccountId,
    creatorSession.accountId,
    "expected payout recipient to resolve to studio creator account"
  );
});

test("proof: refund appends reversal ledger rows and keeps original collect rows", async (t) => {
  const dbPath = createIsolatedDbPath();
  const webhookSecret = `whsec_${randomUUID()}`;
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `ledger-refund-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const checkoutResponse = await postCheckoutRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/checkout/stardust", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({})
    }),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.equal(checkoutResponse.status, 201);

  const checkoutPayload = await parseJson<{
    checkoutSession:
      | {
          status: "already_owned";
          receiptId: string;
        }
      | {
          status: "pending";
          paymentId: string;
          checkoutSessionId: string;
        };
  }>(checkoutResponse);
  assert.equal(checkoutPayload.checkoutSession.status, "pending");

  if (checkoutPayload.checkoutSession.status !== "pending") {
    return;
  }

  const completionEvent = {
    id: `evt_m2_complete_${randomUUID()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: checkoutPayload.checkoutSession.checkoutSessionId,
        payment_intent: `pi_m2_${randomUUID()}`,
        metadata: {
          payment_id: checkoutPayload.checkoutSession.paymentId
        }
      }
    }
  };

  const completionResponse = await postStripeWebhookRoute(
    createStripeSignedRequest(completionEvent, webhookSecret)
  );
  assert.equal(completionResponse.status, 200);

  const collection = await commerceBffService.getMyCollection(session.accountId);
  const ownedDrop = collection?.ownedDrops.find((entry) => entry.drop.id === "stardust");
  assert.ok(ownedDrop, "expected owned drop after completion");

  if (!ownedDrop) {
    return;
  }

  const refundEvent = {
    id: `evt_m2_refund_${randomUUID()}`,
    type: "charge.refunded",
    data: {
      object: {
        payment_intent: completionEvent.data.object.payment_intent,
        metadata: {
          payment_id: checkoutPayload.checkoutSession.paymentId,
          checkout_session_id: checkoutPayload.checkoutSession.checkoutSessionId
        }
      }
    }
  };
  const refundResponse = await postStripeWebhookRoute(
    createStripeSignedRequest(refundEvent, webhookSecret)
  );
  assert.equal(refundResponse.status, 200);

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ledgerTransactions: Array<{
      id: string;
      kind: "collect" | "refund";
      receiptId: string | null;
      reversalOfTransactionId: string | null;
    }>;
    ledgerLineItems: Array<{
      transactionId: string;
      kind: string;
      amountUsd: number;
    }>;
  };

  const receiptTransactions = raw.ledgerTransactions.filter(
    (entry) => entry.receiptId === ownedDrop.receiptId
  );
  const collectTransaction = receiptTransactions.find((entry) => entry.kind === "collect");
  const refundTransaction = receiptTransactions.find((entry) => entry.kind === "refund");
  assert.ok(collectTransaction, "expected original collect ledger transaction");
  assert.ok(refundTransaction, "expected appended refund ledger transaction");
  assert.equal(
    refundTransaction?.reversalOfTransactionId,
    collectTransaction?.id,
    "expected refund reversal link"
  );

  const collectLineItems = raw.ledgerLineItems.filter(
    (entry) => entry.transactionId === collectTransaction?.id
  );
  const refundLineItems = raw.ledgerLineItems.filter(
    (entry) => entry.transactionId === refundTransaction?.id
  );
  assert.equal(
    refundLineItems.length,
    collectLineItems.length,
    "expected reversal line-item parity for append-only audit"
  );

  const collectByKind = new Map(collectLineItems.map((entry) => [entry.kind, entry.amountUsd]));
  for (const refundLineItem of refundLineItems) {
    const collectAmount = collectByKind.get(refundLineItem.kind);
    assert.notEqual(
      collectAmount,
      undefined,
      `expected matching collect line item for ${refundLineItem.kind}`
    );
    assert.equal(
      Number(refundLineItem.amountUsd.toFixed(2)),
      Number((-(collectAmount ?? 0)).toFixed(2)),
      `expected reversed amount for ${refundLineItem.kind}`
    );
  }
});
