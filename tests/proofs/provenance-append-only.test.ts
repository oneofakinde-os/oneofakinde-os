import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { POST as postCheckoutRoute } from "../../app/api/v1/payments/checkout/[drop_id]/route";
import { POST as postStripeWebhookRoute } from "../../app/api/v1/payments/webhooks/stripe/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-proof-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
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

test("proof: provenance events are appended on collect and revoked on refund (append-only)", async (t) => {
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
    email: `prov-${randomUUID()}@oneofakinde.test`,
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
    checkoutSession: { status: "pending"; paymentId: string; checkoutSessionId: string };
  }>(checkoutResponse);
  assert.equal(checkoutPayload.checkoutSession.status, "pending");
  if (checkoutPayload.checkoutSession.status !== "pending") return;

  await commerceBffService.recordCertificatePreview(session.accountId, "voidrunner");
  const paymentIntentId = `pi_prov_${randomUUID()}`;
  const completedEvent = {
    id: `evt_prov_complete_${randomUUID()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: checkoutPayload.checkoutSession.checkoutSessionId,
        payment_intent: paymentIntentId,
        metadata: { payment_id: checkoutPayload.checkoutSession.paymentId }
      }
    }
  };

  const completedResponse = await postStripeWebhookRoute(
    createStripeSignedRequest(completedEvent, webhookSecret)
  );
  assert.equal(completedResponse.status, 200);

  // Read raw DB after collect: should have ownership_created + certificate_issued events
  const rawAfterCollect = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    provenanceEvents: Array<{ id: string; dropId: string; kind: string; actorHandle: string }>;
  };

  const collectEvents = rawAfterCollect.provenanceEvents.filter(
    (e) => e.dropId === "voidrunner"
  );
  assert.ok(
    collectEvents.some((e) => e.kind === "ownership_created"),
    "expected ownership_created provenance event after collect"
  );
  assert.ok(
    collectEvents.some((e) => e.kind === "certificate_issued"),
    "expected certificate_issued provenance event after collect"
  );

  const countBeforeRefund = collectEvents.length;

  // Trigger refund
  const refundEvent = {
    id: `evt_prov_refund_${randomUUID()}`,
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

  // Read raw DB after refund: original events MUST still exist (append-only)
  const rawAfterRefund = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    provenanceEvents: Array<{ id: string; dropId: string; kind: string }>;
  };

  const refundEvents = rawAfterRefund.provenanceEvents.filter(
    (e) => e.dropId === "voidrunner"
  );

  // Original collect events are preserved
  assert.ok(
    refundEvents.length > countBeforeRefund,
    "expected additional provenance events after refund (append-only)"
  );
  assert.ok(
    refundEvents.some((e) => e.kind === "ownership_created"),
    "ownership_created event must persist after refund"
  );
  assert.ok(
    refundEvents.some((e) => e.kind === "certificate_issued"),
    "certificate_issued event must persist after refund"
  );
  assert.ok(
    refundEvents.some((e) => e.kind === "ownership_revoked"),
    "expected ownership_revoked event after refund"
  );
  assert.ok(
    refundEvents.some((e) => e.kind === "certificate_revoked"),
    "expected certificate_revoked event after refund"
  );
});

test("proof: provenance event table has no update or delete exposure in the application layer", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const service = await import("../../lib/bff/service");
  const keys = Object.keys(service.commerceBffService) as string[];

  const mutatingProvenanceMethods = keys.filter(
    (k) => /prov(enance)?/i.test(k) && /update|delete|edit|remove|patch|clear|reset/i.test(k)
  );

  assert.equal(
    mutatingProvenanceMethods.length,
    0,
    `expected no mutating provenance methods exposed on service, found: ${mutatingProvenanceMethods.join(", ")}`
  );
});
