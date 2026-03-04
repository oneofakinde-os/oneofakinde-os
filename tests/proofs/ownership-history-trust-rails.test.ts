import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postCheckoutRoute } from "../../app/api/v1/payments/checkout/[drop_id]/route";
import { POST as postStripeWebhookRoute } from "../../app/api/v1/payments/webhooks/stripe/route";
import { GET as getOwnershipHistoryRoute } from "../../app/api/v1/ownership-history/drops/[drop_id]/route";
import { commerceBffService } from "../../lib/bff/service";

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

function collectObjectKeys(input: unknown, keys = new Set<string>()): Set<string> {
  if (!input || typeof input !== "object") {
    return keys;
  }

  if (Array.isArray(input)) {
    for (const value of input) {
      collectObjectKeys(value, keys);
    }
    return keys;
  }

  for (const [key, value] of Object.entries(input)) {
    keys.add(key);
    collectObjectKeys(value, keys);
  }

  return keys;
}

function assertNoForbiddenKeys(payload: unknown, forbiddenKeys: string[]): void {
  const keys = collectObjectKeys(payload);
  for (const key of forbiddenKeys) {
    assert.equal(keys.has(key), false, `expected payload to hide private field "${key}"`);
  }
}

test("proof: drop ownership history endpoint is public-safe and append-only across refund", async (t) => {
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
    email: `ownership-history-${randomUUID()}@oneofakinde.test`,
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

  const paymentIntentId = `pi_history_${randomUUID()}`;
  const completionEvent = {
    id: `evt_history_complete_${randomUUID()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: checkoutPayload.checkoutSession.checkoutSessionId,
        payment_intent: paymentIntentId,
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

  const historyAfterCollectResponse = await getOwnershipHistoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/ownership-history/drops/stardust"),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.equal(historyAfterCollectResponse.status, 200);
  const historyAfterCollectPayload = await parseJson<{
    history: {
      dropId: string;
      entries: Array<{
        id: string;
        kind: "collect" | "refund";
        publicAmountUsd: number | null;
        actorHandle: string;
      }>;
    };
  }>(historyAfterCollectResponse);
  assert.equal(historyAfterCollectPayload.history.dropId, "stardust");
  assert.equal(historyAfterCollectPayload.history.entries.length, 1);
  assert.equal(historyAfterCollectPayload.history.entries[0]?.kind, "collect");
  assert.ok(
    (historyAfterCollectPayload.history.entries[0]?.publicAmountUsd ?? 0) > 0,
    "expected public collect amount in ownership history"
  );

  const collectEntryId = historyAfterCollectPayload.history.entries[0]?.id;

  const refundEvent = {
    id: `evt_history_refund_${randomUUID()}`,
    type: "charge.refunded",
    data: {
      object: {
        payment_intent: paymentIntentId,
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

  const historyAfterRefundResponse = await getOwnershipHistoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/ownership-history/drops/stardust"),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.equal(historyAfterRefundResponse.status, 200);

  const historyAfterRefundPayload = await parseJson<{
    history: {
      entries: Array<{
        id: string;
        kind: "collect" | "refund";
        publicAmountUsd: number | null;
      }>;
    };
  }>(historyAfterRefundResponse);

  assert.equal(historyAfterRefundPayload.history.entries.length, 2);
  assert.equal(historyAfterRefundPayload.history.entries[0]?.kind, "collect");
  assert.equal(historyAfterRefundPayload.history.entries[1]?.kind, "refund");
  assert.equal(
    historyAfterRefundPayload.history.entries[0]?.id,
    collectEntryId,
    "expected collect history row to persist after refund"
  );
  assert.ok(
    (historyAfterRefundPayload.history.entries[1]?.publicAmountUsd ?? 0) < 0,
    "expected refund reversal to publish a negative public amount"
  );

  assertNoForbiddenKeys(historyAfterRefundPayload, [
    "accountId",
    "ownerAccountId",
    "providerPaymentIntentId",
    "paymentIntentId",
    "paymentId",
    "quote",
    "lineItems",
    "email",
    "sessionToken",
    "token"
  ]);
});

test("proof: receipt totals stay exactly aligned with collect ledger transaction totals", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `settlement-parity-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const receipt = await commerceBffService.purchaseDrop(session.accountId, "twilight-whispers");
  assert.ok(receipt, "expected collect receipt");
  assert.equal(receipt?.status, "completed");

  if (!receipt) {
    return;
  }

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ledgerTransactions: Array<{
      id: string;
      kind: "collect" | "refund";
      receiptId: string | null;
      totalUsd: number;
      subtotalUsd: number;
      processingUsd: number;
      commissionUsd: number;
      payoutUsd: number;
    }>;
  };

  const collectTransaction = raw.ledgerTransactions.find(
    (entry) => entry.kind === "collect" && entry.receiptId === receipt.id
  );
  assert.ok(collectTransaction, "expected collect ledger transaction");

  assert.equal(receipt.amountUsd, collectTransaction?.totalUsd);
  assert.equal(receipt.subtotalUsd, collectTransaction?.subtotalUsd);
  assert.equal(receipt.processingUsd, collectTransaction?.processingUsd);
  assert.equal(receipt.commissionUsd, collectTransaction?.commissionUsd);
  assert.equal(receipt.payoutUsd, collectTransaction?.payoutUsd);
});
