import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getEntitlementRoute } from "../../app/api/v1/entitlements/drops/[drop_id]/route";
import { POST as postCheckoutRoute } from "../../app/api/v1/payments/checkout/[drop_id]/route";
import { POST as postStripeWebhookRoute } from "../../app/api/v1/payments/webhooks/stripe/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-entitlement-consistency-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function createStripeSignedRequest(eventPayload: Record<string, unknown>, webhookSecret: string): Request {
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

test("proof: entitlement consistency stays in sync across collect, media access, and refund reversal", async (t) => {
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
    email: `entitlement-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const dropId = "voidrunner";
  const entitlementBeforeCollect = await commerceBffService.hasDropEntitlement(session.accountId, dropId);
  assert.equal(entitlementBeforeCollect, false);

  const checkoutResponse = await postCheckoutRoute(
    new Request(`http://127.0.0.1:3000/api/v1/payments/checkout/${dropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({})
    }),
    withRouteParams({ drop_id: dropId })
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

  const completedEvent = {
    id: `evt_entitlement_complete_${randomUUID()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: checkoutPayload.checkoutSession.checkoutSessionId,
        payment_intent: `pi_entitlement_${randomUUID()}`,
        metadata: {
          payment_id: checkoutPayload.checkoutSession.paymentId
        }
      }
    }
  };
  const completedResponse = await postStripeWebhookRoute(
    createStripeSignedRequest(completedEvent, webhookSecret)
  );
  assert.equal(completedResponse.status, 200);

  const entitlementAfterCollect = await commerceBffService.hasDropEntitlement(session.accountId, dropId);
  assert.equal(entitlementAfterCollect, true);

  const entitlementApiAfterCollect = await getEntitlementRoute(
    new Request(`http://127.0.0.1:3000/api/v1/entitlements/drops/${dropId}`, {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ drop_id: dropId })
  );
  assert.equal(entitlementApiAfterCollect.status, 200);
  const entitlementPayloadAfterCollect = await parseJson<{ hasEntitlement: boolean }>(
    entitlementApiAfterCollect
  );
  assert.equal(entitlementPayloadAfterCollect.hasEntitlement, true);

  const watchAccessAfterCollect = await commerceBffService.createWatchAccessToken(session.accountId, dropId);
  assert.ok(watchAccessAfterCollect?.token, "expected media access token after entitlement grant");

  const refundResponse = await postStripeWebhookRoute(
    createStripeSignedRequest(
      {
        id: `evt_entitlement_refund_${randomUUID()}`,
        type: "charge.refunded",
        data: {
          object: {
            payment_intent: completedEvent.data.object.payment_intent,
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
  assert.equal(refundResponse.status, 200);

  const entitlementAfterRefund = await commerceBffService.hasDropEntitlement(session.accountId, dropId);
  assert.equal(entitlementAfterRefund, false);

  const entitlementApiAfterRefund = await getEntitlementRoute(
    new Request(`http://127.0.0.1:3000/api/v1/entitlements/drops/${dropId}`, {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ drop_id: dropId })
  );
  assert.equal(entitlementApiAfterRefund.status, 200);
  const entitlementPayloadAfterRefund = await parseJson<{ hasEntitlement: boolean }>(
    entitlementApiAfterRefund
  );
  assert.equal(entitlementPayloadAfterRefund.hasEntitlement, false);

  const watchAccessAfterRefund = await commerceBffService.createWatchAccessToken(session.accountId, dropId);
  assert.equal(watchAccessAfterRefund, null, "expected media access token denial after refund");

  const collection = await commerceBffService.getMyCollection(session.accountId);
  const stillOwned = collection?.ownedDrops.some((entry) => entry.drop.id === dropId) ?? false;
  assert.equal(stillOwned, false, "expected refunded drop removal from collection");
});
