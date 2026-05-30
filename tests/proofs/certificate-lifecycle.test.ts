import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCertificateRoute } from "../../app/api/v1/certificates/[cert_id]/route";
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

test("proof: certificate is issued on collect and revoked on refund", async (t) => {
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
    email: `cert-lifecycle-${randomUUID()}@oneofakinde.test`,
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
  const paymentIntentId = `pi_cert_${randomUUID()}`;
  const completedResponse = await postStripeWebhookRoute(
    createStripeSignedRequest({
      id: `evt_cert_complete_${randomUUID()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: checkoutPayload.checkoutSession.checkoutSessionId,
          payment_intent: paymentIntentId,
          metadata: { payment_id: checkoutPayload.checkoutSession.paymentId }
        }
      }
    }, webhookSecret)
  );
  assert.equal(completedResponse.status, 200);

  // Find the certificate from collection
  const collection = await commerceBffService.getMyCollection(session.accountId);
  const ownership = collection?.ownedDrops.find((d) => d.drop.id === "voidrunner");
  assert.ok(ownership, "expected ownership after collect");
  assert.ok(ownership?.certificateId, "expected certificateId on ownership");

  // Verify certificate via API
  const certResponse = await getCertificateRoute(
    new Request(`http://127.0.0.1:3000/api/v1/certificates/${ownership!.certificateId}`),
    withRouteParams({ cert_id: ownership!.certificateId })
  );
  assert.equal(certResponse.status, 200);
  const certPayload = await parseJson<{ certificate: { status: string; id: string } }>(certResponse);
  assert.equal(certPayload.certificate.status, "verified");

  // Public response must NOT include receiptId
  const certKeys = Object.keys(certPayload.certificate);
  assert.ok(!certKeys.includes("receiptId"), "public certificate must not expose receiptId");

  // Trigger refund
  const refundResponse = await postStripeWebhookRoute(
    createStripeSignedRequest({
      id: `evt_cert_refund_${randomUUID()}`,
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
    }, webhookSecret)
  );
  assert.equal(refundResponse.status, 200);

  // Verify certificate is now revoked
  const certAfterRefundResponse = await getCertificateRoute(
    new Request(`http://127.0.0.1:3000/api/v1/certificates/${ownership!.certificateId}`),
    withRouteParams({ cert_id: ownership!.certificateId })
  );
  assert.equal(certAfterRefundResponse.status, 200);
  const certAfterRefund = await parseJson<{ certificate: { status: string } }>(certAfterRefundResponse);
  assert.equal(certAfterRefund.certificate.status, "revoked");
});

test("proof: certificate edition number increments per drop across collectors", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const sessionA = await commerceBffService.createSession({
    email: `edition-a-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const sessionB = await commerceBffService.createSession({
    email: `edition-b-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  await commerceBffService.purchaseDrop(sessionA.accountId, "twilight-whispers");
  await commerceBffService.purchaseDrop(sessionB.accountId, "twilight-whispers");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ownerships: Array<{ accountId: string; dropId: string; editionNumber?: number }>;
  };

  const ownershipsForDrop = raw.ownerships.filter((o) => o.dropId === "twilight-whispers");
  assert.ok(ownershipsForDrop.length >= 2, "expected at least two ownerships");

  const editionNumbers = ownershipsForDrop.map((o) => o.editionNumber).filter((n) => n !== undefined);
  assert.ok(editionNumbers.length > 0, "expected edition numbers to be assigned");

  const unique = new Set(editionNumbers);
  assert.equal(unique.size, editionNumbers.length, "edition numbers must be unique per drop");
});
