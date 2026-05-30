import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCertificateRoute } from "../../app/api/v1/certificates/[cert_id]/route";
import { GET as getCollectionRoute } from "../../app/api/v1/collection/route";
import { POST as postCheckoutRoute } from "../../app/api/v1/payments/checkout/[drop_id]/route";
import { POST as postPurchaseRoute } from "../../app/api/v1/payments/purchase/route";
import { POST as postStripeWebhookRoute } from "../../app/api/v1/payments/webhooks/stripe/route";
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
  webhookSecret: string,
  options?: {
    timestampSeconds?: number;
  }
): Request {
  const payloadText = JSON.stringify(eventPayload);
  const timestamp = String(options?.timestampSeconds ?? Math.floor(Date.now() / 1000));
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

test("proof: refund webhook revokes entitlement and certificate", async (t) => {
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
    email: `refund-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const checkoutResponse = await postCheckoutRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/checkout/voidrunner", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({})
    }),
    withRouteParams({ drop_id: "voidrunner" })
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

  await commerceBffService.recordCertificatePreview(session.accountId, "voidrunner");
  const completedEventPayload = {
    id: "evt_proof_checkout_completed_once",
    type: "checkout.session.completed",
    data: {
      object: {
        id: checkoutPayload.checkoutSession.checkoutSessionId,
        payment_intent: "pi_proof_complete",
        metadata: {
          payment_id: checkoutPayload.checkoutSession.paymentId
        }
      }
    }
  };

  const completedWebhookResponse = await postStripeWebhookRoute(
    createStripeSignedRequest(completedEventPayload, webhookSecret)
  );

  assert.equal(completedWebhookResponse.status, 200);
  const completedPayload = await parseJson<{ effect: string }>(completedWebhookResponse);
  assert.equal(completedPayload.effect, "payment_completed");

  const replayWebhookResponse = await postStripeWebhookRoute(
    createStripeSignedRequest(completedEventPayload, webhookSecret)
  );
  assert.equal(replayWebhookResponse.status, 200);
  const replayPayload = await parseJson<{ effect: string }>(replayWebhookResponse);
  assert.equal(replayPayload.effect, "ignored");

  const collectionAfterPurchase = await commerceBffService.getMyCollection(session.accountId);
  const purchasedDrop = collectionAfterPurchase?.ownedDrops.find((entry) => entry.drop.id === "voidrunner");
  assert.ok(purchasedDrop, "expected purchased drop ownership before refund");

  const certificateBeforeRefund = purchasedDrop
    ? await commerceBffService.getCertificateById(purchasedDrop.certificateId)
    : null;
  assert.equal(certificateBeforeRefund?.status, "verified");

  const refundWebhookResponse = await postStripeWebhookRoute(
    createStripeSignedRequest(
      {
        id: "evt_proof_charge_refunded_once",
        type: "charge.refunded",
        data: {
          object: {
            payment_intent: "pi_proof_complete",
            metadata: {
              payment_id: checkoutPayload.checkoutSession.paymentId,
              checkout_session_id: checkoutPayload.checkoutSession.checkoutSessionId
            }
          }
        }
      },
      webhookSecret
    )
  );

  assert.equal(refundWebhookResponse.status, 200);
  const refundPayload = await parseJson<{ effect: string }>(refundWebhookResponse);
  assert.equal(refundPayload.effect, "payment_refunded");

  const hasEntitlement = await commerceBffService.hasDropEntitlement(session.accountId, "voidrunner");
  assert.equal(hasEntitlement, false, "expected entitlement revoked after refund");

  if (!purchasedDrop) {
    return;
  }

  const refundedReceipt = await commerceBffService.getReceipt(session.accountId, purchasedDrop.receiptId);
  assert.equal(refundedReceipt?.status, "refunded");

  const revokedCertificate = await commerceBffService.getCertificateById(purchasedDrop.certificateId);
  assert.equal(revokedCertificate?.status, "revoked");
});

test("proof: stripe webhook rejects stale signatures", async (t) => {
  const webhookSecret = `whsec_${randomUUID()}`;
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS = "60";

  t.after(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS;
  });

  const staleTimestampSeconds = Math.floor(Date.now() / 1000) - 3600;
  const staleRequest = createStripeSignedRequest(
    {
      id: "evt_stale_signature",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_stale",
          payment_intent: "pi_stale",
          metadata: {
            payment_id: "pay_stale"
          }
        }
      }
    },
    webhookSecret,
    {
      timestampSeconds: staleTimestampSeconds
    }
  );

  const response = await postStripeWebhookRoute(staleRequest);
  assert.equal(response.status, 401);
});

test("proof: purchase completion is account-bound", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const ownerSession = await commerceBffService.createSession({
    email: `owner-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const attackerSession = await commerceBffService.createSession({
    email: `attacker-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const checkoutResponse = await postCheckoutRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/checkout/voidrunner", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": ownerSession.sessionToken
      },
      body: JSON.stringify({})
    }),
    withRouteParams({ drop_id: "voidrunner" })
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

  const attackerPurchaseResponse = await postPurchaseRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/purchase", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": attackerSession.sessionToken
      },
      body: JSON.stringify({
        paymentId: checkoutPayload.checkoutSession.paymentId
      })
    })
  );
  assert.equal(attackerPurchaseResponse.status, 404);

  const attackerEntitlement = await commerceBffService.hasDropEntitlement(attackerSession.accountId, "voidrunner");
  const ownerEntitlement = await commerceBffService.hasDropEntitlement(ownerSession.accountId, "voidrunner");
  assert.equal(attackerEntitlement, false);
  assert.equal(ownerEntitlement, false);
});

test("proof: public certificate verify route works without session", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const response = await getCertificateRoute(
    new Request("http://127.0.0.1:3000/api/v1/certificates/cert_seed_stardust"),
    withRouteParams({ cert_id: "cert_seed_stardust" })
  );
  assert.equal(response.status, 200);

  const payload = await parseJson<{
    certificate: {
      id: string;
      dropId: string;
      ownerHandle: string;
      status: "verified" | "revoked";
    };
  }>(response);

  assert.equal(payload.certificate.id, "cert_seed_stardust");
  assert.equal(payload.certificate.dropId, "stardust");
  assert.equal(payload.certificate.ownerHandle, "collector_demo");
  assert.equal(payload.certificate.status, "verified");
});

test("proof: api payloads avoid leaking private persistence fields", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `noleak-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const checkoutResponse = await postCheckoutRoute(
    new Request("http://127.0.0.1:3000/api/v1/payments/checkout/twilight-whispers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({})
    }),
    withRouteParams({ drop_id: "twilight-whispers" })
  );
  assert.equal(checkoutResponse.status, 201);
  const checkoutPayload = await parseJson<unknown>(checkoutResponse);

  const collectionResponse = await getCollectionRoute(
    new Request("http://127.0.0.1:3000/api/v1/collection", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(collectionResponse.status, 200);
  const collectionPayload = await parseJson<unknown>(collectionResponse);

  const certificateResponse = await getCertificateRoute(
    new Request("http://127.0.0.1:3000/api/v1/certificates/cert_seed_stardust"),
    withRouteParams({ cert_id: "cert_seed_stardust" })
  );
  assert.equal(certificateResponse.status, 200);
  const certificatePayload = await parseJson<unknown>(certificateResponse);

  assertNoForbiddenKeys(checkoutPayload, [
    "ownerAccountId",
    "providerPaymentIntentId",
    "createdAt",
    "updatedAt",
    "expiresAt",
    "sessionToken",
    "token",
    "email",
    "accountId"
  ]);

  assertNoForbiddenKeys(collectionPayload, [
    "ownerAccountId",
    "providerPaymentIntentId",
    "createdAt",
    "updatedAt",
    "expiresAt",
    "sessionToken",
    "token",
    "email",
    "roles"
  ]);

  assertNoForbiddenKeys(certificatePayload, [
    "ownerAccountId",
    "providerPaymentIntentId",
    "createdAt",
    "updatedAt",
    "expiresAt",
    "sessionToken",
    "token",
    "email",
    "accountId"
  ]);
});
