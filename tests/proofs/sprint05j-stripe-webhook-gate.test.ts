/**
 * Sprint 0.5J proof tests — Stripe Webhook Settlement Gate
 *
 * The sprint-0.5i suite proves the manual completePendingPayment path enforces the
 * three-gate readiness check (rights → creator terms → certificate preview), but the
 * Stripe webhook settlement path (completePaymentByLookupInDatabase, reached via the
 * live POST /api/v1/payments/webhooks/stripe route) — the highest-volume real-money
 * settlement path — had no dedicated gate proof. A silent regression there would let
 * webhook-driven settlement mint ownership that outruns the meaning, the proof, or the
 * creator's terms.
 *
 * These proofs drive the REAL signed webhook route and assert that, for each missing
 * gate, webhook settlement is blocked: no ownership is issued, ownership_settlement_failed
 * is emitted with the specific reason, the payment is marked failed, and Stripe is still
 * acknowledged (HTTP 200, effect "payment_failed"). The happy path confirms a fully-gated
 * collect settles through the webhook.
 */

import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { POST as postStripeWebhookRoute } from "../../app/api/v1/payments/webhooks/stripe/route";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(prefix = "s05j-wh"): string {
  return path.join("/tmp", `ook-bff-${prefix}-${randomUUID()}.json`);
}

function setupEnv(t: TestContext, dbPath: string, webhookSecret: string): void {
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    await fs.rm(dbPath, { force: true });
  });
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
      "stripe-signature": `t=${timestamp},v1=${signature}`,
    },
    body: payloadText,
  });
}

async function bootstrapCreatorWithDrop(prefix: string) {
  const base = await commerceBffService.createSession({
    email: `${prefix}-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: `${prefix} Studio`,
    studioSynopsis: "sprint 0.5j webhook gate",
  });
  const creator = studio!.session;
  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `${prefix}-world-${randomUUID().slice(0, 6)}`,
    synopsis: "testing",
    defaultDropVisibility: "public",
  });
  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: `${prefix} Drop`,
    worldId: world!.id,
    synopsis: "testing",
    priceUsd: 1.99,
    visibility: "public",
  });
  return { creator, drop: drop! };
}

async function addRights(dropId: string): Promise<void> {
  await commerceBffService.upsertRightsMetadataForDrop(dropId, {
    licenseType: "all_rights_reserved",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });
}

async function addTerms(creatorAccountId: string, dropId: string): Promise<void> {
  await commerceBffService.upsertCreatorTerms(creatorAccountId, dropId, {
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });
}

type PendingCheckout = { status: "pending"; paymentId: string; checkoutSessionId: string };

async function createPendingPayment(accountId: string, dropId: string): Promise<PendingCheckout> {
  const checkout = await commerceBffService.createCheckoutSession({
    accountId,
    dropId,
    successUrl: "https://example.test/ok",
    cancelUrl: "https://example.test/cancel",
  });
  assert.ok(checkout && checkout.status === "pending", "checkout session must be pending");
  return checkout as PendingCheckout;
}

function completionEventFor(pending: PendingCheckout): Record<string, unknown> {
  return {
    id: `evt_05j_${randomUUID()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: pending.checkoutSessionId,
        payment_intent: `pi_05j_${randomUUID()}`,
        metadata: { payment_id: pending.paymentId },
      },
    },
  };
}

async function driveWebhook(event: Record<string, unknown>, webhookSecret: string) {
  const response = await postStripeWebhookRoute(createStripeSignedRequest(event, webhookSecret));
  const body = (await response.json()) as { received?: boolean; effect?: string; paymentId?: string };
  return { status: response.status, body };
}

type DbSnapshot = {
  ownerships: Array<{ accountId: string; dropId: string }>;
  payments: Array<{ id: string; status: string }>;
  auditEvents: Array<{ action: string; meta: string }>;
};

async function readDb(dbPath: string): Promise<DbSnapshot> {
  return JSON.parse(await fs.readFile(dbPath, "utf8")) as DbSnapshot;
}

function assertBlocked(db: DbSnapshot, collectorAccountId: string, dropId: string, paymentId: string, reason: string): void {
  assert.equal(
    db.ownerships.find((o) => o.accountId === collectorAccountId && o.dropId === dropId),
    undefined,
    `no ownership may be issued via the webhook when the gate blocks (${reason})`,
  );
  const failed = db.auditEvents.find(
    (e) => e.action === "ownership_settlement_failed" && JSON.parse(e.meta).reason === reason,
  );
  assert.ok(failed, `ownership_settlement_failed(${reason}) must be emitted on the webhook path`);
  assert.equal(
    db.payments.find((p) => p.id === paymentId)?.status,
    "failed",
    "the payment must be marked failed when the gate blocks",
  );
}

test("proof[0.5j]: stripe webhook settlement is blocked when rights metadata is absent", async (t) => {
  const dbPath = isolatedDbPath("rights");
  const secret = `whsec_${randomUUID()}`;
  setupEnv(t, dbPath, secret);

  const { drop } = await bootstrapCreatorWithDrop("wh-rights");
  const collector = await commerceBffService.createSession({
    email: `wh-rights-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  // No rights, no terms, no preview.
  const pending = await createPendingPayment(collector.accountId, drop.id);

  const { status, body } = await driveWebhook(completionEventFor(pending), secret);
  assert.equal(status, 200, "webhook must be acknowledged (200) even when settlement is gated");
  assert.equal(body.effect, "payment_failed", "a gated webhook settlement must report payment_failed");

  assertBlocked(await readDb(dbPath), collector.accountId, drop.id, pending.paymentId, "missing_rights");
});

test("proof[0.5j]: stripe webhook settlement is blocked when creator terms are absent", async (t) => {
  const dbPath = isolatedDbPath("terms");
  const secret = `whsec_${randomUUID()}`;
  setupEnv(t, dbPath, secret);

  const { drop } = await bootstrapCreatorWithDrop("wh-terms");
  await addRights(drop.id); // rights present, terms absent
  const collector = await commerceBffService.createSession({
    email: `wh-terms-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const pending = await createPendingPayment(collector.accountId, drop.id);

  const { status, body } = await driveWebhook(completionEventFor(pending), secret);
  assert.equal(status, 200);
  assert.equal(body.effect, "payment_failed");

  assertBlocked(await readDb(dbPath), collector.accountId, drop.id, pending.paymentId, "missing_creator_terms");
});

test("proof[0.5j]: stripe webhook settlement is blocked when certificate preview is absent", async (t) => {
  const dbPath = isolatedDbPath("preview");
  const secret = `whsec_${randomUUID()}`;
  setupEnv(t, dbPath, secret);

  const { creator, drop } = await bootstrapCreatorWithDrop("wh-preview");
  await addRights(drop.id);
  await addTerms(creator.accountId, drop.id); // rights + terms present, preview absent
  const collector = await commerceBffService.createSession({
    email: `wh-preview-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const pending = await createPendingPayment(collector.accountId, drop.id);

  const { status, body } = await driveWebhook(completionEventFor(pending), secret);
  assert.equal(status, 200);
  assert.equal(body.effect, "payment_failed");

  assertBlocked(await readDb(dbPath), collector.accountId, drop.id, pending.paymentId, "missing_certificate_preview");
});

test("proof[0.5j]: stripe webhook settlement succeeds and issues ownership when all three gates pass", async (t) => {
  const dbPath = isolatedDbPath("ok");
  const secret = `whsec_${randomUUID()}`;
  setupEnv(t, dbPath, secret);

  const { creator, drop } = await bootstrapCreatorWithDrop("wh-ok");
  await addRights(drop.id);
  await addTerms(creator.accountId, drop.id);
  const collector = await commerceBffService.createSession({
    email: `wh-ok-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);
  const pending = await createPendingPayment(collector.accountId, drop.id);

  const { status, body } = await driveWebhook(completionEventFor(pending), secret);
  assert.equal(status, 200);
  assert.equal(body.effect, "payment_completed", "a fully-gated webhook settlement must complete");

  const db = await readDb(dbPath);
  assert.ok(
    db.ownerships.find((o) => o.accountId === collector.accountId && o.dropId === drop.id),
    "ownership must be issued when all three gates pass",
  );
  assert.equal(
    db.payments.find((p) => p.id === pending.paymentId)?.status,
    "succeeded",
    "the payment must be marked succeeded",
  );
});
