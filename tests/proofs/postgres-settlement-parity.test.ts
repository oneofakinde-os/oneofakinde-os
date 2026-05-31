import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { Pool } from "pg";

// Postgres parity proofs — exercise the settlement spine against REAL Postgres (the
// backend production uses): the direct collect path, the market-law backstop, the
// truncate/reinsert write model's data-safety, AND the real-money settlement paths
// (Stripe webhook + manual payment-completion), each gate-blocking and settling on
// real Postgres, plus webhook idempotency.
//
// Runs ONLY when OOK_BFF_DATABASE_URL is set (CI with a Postgres service); skips in
// file-mode so the existing file-backed suite is unaffected.
const POSTGRES_URL =
  process.env.OOK_BFF_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
const skip: string | undefined = POSTGRES_URL
  ? undefined
  : "no Postgres configured (OOK_BFF_DATABASE_URL) — file-mode skip";

const WEBHOOK_SECRET = "whsec_pg_parity_test";
if (POSTGRES_URL) {
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "postgres";
  delete process.env.OOK_BFF_DB_PATH;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
}

import { POST as postStripeWebhookRoute } from "../../app/api/v1/payments/webhooks/stripe/route";
import { commerceBffService } from "../../lib/bff/service";

const CONSERVATIVE_RIGHTS = {
  licenseType: "personal-use-only",
  commercialUse: false,
  derivativesAllowed: false,
  attributionRequired: true
};
const CONSERVATIVE_TERMS = {
  commercialUse: false,
  derivativesAllowed: false,
  attributionRequired: true
};

async function makeCreatorWorldDrop(label: string) {
  const base = await commerceBffService.createSession({
    email: `pg-${label}-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: `PG Parity ${label}`,
    studioSynopsis: "postgres settlement parity"
  });
  assert.ok(studio, "studio created on postgres");
  const creator = studio.session;
  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `pg-${label}-world-${randomUUID().slice(0, 8)}`,
    synopsis: "postgres settlement parity"
  });
  assert.ok(world, "world created on postgres");
  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: `pg-${label}-drop-${randomUUID().slice(0, 8)}`,
    worldId: world.id,
    synopsis: "postgres settlement parity",
    priceUsd: 4.0,
    visibility: "public"
  });
  assert.ok(drop, "drop created on postgres");
  return { creator, drop };
}

async function addRights(dropId: string): Promise<void> {
  await commerceBffService.upsertRightsMetadataForDrop(dropId, CONSERVATIVE_RIGHTS);
}
async function addTerms(creatorAccountId: string, dropId: string): Promise<void> {
  await commerceBffService.upsertCreatorTerms(creatorAccountId, dropId, CONSERVATIVE_TERMS);
}

async function makeCollector(label: string): Promise<string> {
  const s = await commerceBffService.createSession({
    email: `pg-${label}-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  return s.accountId;
}

async function settleFreshDrop(label: string): Promise<void> {
  const { creator, drop } = await makeCreatorWorldDrop(label);
  await addRights(drop.id);
  await addTerms(creator.accountId, drop.id);
  const collectorId = await makeCollector(label);
  const receipt = await commerceBffService.purchaseDrop(collectorId, drop.id);
  assert.ok(receipt, `settlement produced a receipt on Postgres (${label})`);
}

// ── Postgres assertion helpers (separate connection from the bff pool) ──
async function pgRows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = new Pool({ connectionString: POSTGRES_URL });
  try {
    return (await pool.query(sql, params)).rows as T[];
  } finally {
    await pool.end();
  }
}
async function bffTableCounts(): Promise<Record<string, number>> {
  const tables = await pgRows<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'bff_%' ORDER BY tablename"
  );
  const counts: Record<string, number> = {};
  for (const { tablename } of tables) {
    const r = await pgRows<{ c: number }>(`SELECT count(*)::int AS c FROM public.${tablename}`);
    counts[tablename] = r[0].c;
  }
  return counts;
}
async function ownershipCount(accountId: string, dropId: string): Promise<number> {
  const r = await pgRows<{ c: number }>(
    "SELECT count(*)::int AS c FROM bff_ownerships WHERE account_id = $1 AND drop_id = $2",
    [accountId, dropId]
  );
  return r[0].c;
}
async function paymentStatus(paymentId: string): Promise<string | undefined> {
  const r = await pgRows<{ status: string }>("SELECT status FROM bff_payments WHERE id = $1", [paymentId]);
  return r[0]?.status;
}
async function hasSettlementFailure(reason: string): Promise<boolean> {
  const r = await pgRows<{ meta: string }>(
    "SELECT meta FROM bff_audit_events WHERE action = 'ownership_settlement_failed'"
  );
  return r.some((row) => {
    try {
      return JSON.parse(row.meta).reason === reason;
    } catch {
      return false;
    }
  });
}

// ── Stripe webhook harness (mirrors sprint05j-stripe-webhook-gate, driven on Postgres) ──
type PendingCheckout = { status: "pending"; paymentId: string; checkoutSessionId: string };
async function createPendingPayment(accountId: string, dropId: string): Promise<PendingCheckout> {
  const checkout = await commerceBffService.createCheckoutSession({
    accountId,
    dropId,
    successUrl: "https://example.test/ok",
    cancelUrl: "https://example.test/cancel"
  });
  assert.ok(checkout && checkout.status === "pending", "checkout session must be pending");
  return checkout as PendingCheckout;
}
function completionEventFor(pending: PendingCheckout): Record<string, unknown> {
  return {
    id: `evt_pg_${randomUUID()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: pending.checkoutSessionId,
        payment_intent: `pi_pg_${randomUUID()}`,
        metadata: { payment_id: pending.paymentId }
      }
    }
  };
}
function signedRequest(event: Record<string, unknown>): Request {
  const payloadText = JSON.stringify(event);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", WEBHOOK_SECRET)
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
async function driveWebhook(event: Record<string, unknown>): Promise<{ status: number; effect?: string }> {
  const response = await postStripeWebhookRoute(signedRequest(event));
  const body = (await response.json()) as { effect?: string };
  return { status: response.status, effect: body.effect };
}

// ───────────────────────── direct collect path ─────────────────────────

test("pg-parity: a drop carrying rights + terms settles on real Postgres", { skip }, async () => {
  const { creator, drop } = await makeCreatorWorldDrop("ok");
  await addRights(drop.id);
  await addTerms(creator.accountId, drop.id);
  const collectorId = await makeCollector("ok");
  const receipt = await commerceBffService.purchaseDrop(collectorId, drop.id);
  assert.ok(receipt, "settlement produced a receipt on Postgres");
  assert.equal(receipt!.status, "completed", "settlement completes on Postgres");
});

test("pg-parity: the settlement backstop refuses a term-less drop on real Postgres", { skip }, async () => {
  const { drop } = await makeCreatorWorldDrop("termless");
  const collectorId = await makeCollector("termless");
  let threw = false;
  let result: unknown = "unset";
  try {
    result = await commerceBffService.purchaseDrop(collectorId, drop.id);
  } catch (error) {
    threw = true;
    assert.match(String(error), /settlement backstop|rights metadata and creator terms/i);
  }
  assert.ok(threw || result === null, "a term-less drop must not settle on Postgres");
});

test(
  "pg-parity: the truncate+reinsert write model preserves data across writes (CASCADE closure)",
  { skip },
  async () => {
    await settleFreshDrop("survive-a");
    const before = await bffTableCounts();
    assert.ok(Object.values(before).some((c) => c > 0), "the first settlement populated tables");
    await settleFreshDrop("survive-b");
    const after = await bffTableCounts();
    const losses = Object.entries(before)
      .filter(([t, c]) => c > 0 && (after[t] ?? 0) < c)
      .map(([t, c]) => `${t}: ${c} -> ${after[t] ?? 0}`);
    assert.deepEqual(losses, [], `tables lost rows across a write (CASCADE wiped without re-insert): ${losses.join("; ")}`);
  }
);

// ───────────────────── Stripe webhook settlement path ─────────────────────

test("pg-parity: webhook settlement is BLOCKED for a rights/terms-missing drop on real Postgres", { skip }, async () => {
  const { drop } = await makeCreatorWorldDrop("wh-block"); // no rights/terms/preview
  const collectorId = await makeCollector("wh-block");
  const pending = await createPendingPayment(collectorId, drop.id);

  const { status, effect } = await driveWebhook(completionEventFor(pending));
  assert.equal(status, 200, "Stripe is acknowledged even when settlement is gated");
  assert.equal(effect, "payment_failed", "a gated webhook settlement reports payment_failed");

  assert.equal(await ownershipCount(collectorId, drop.id), 0, "no ownership minted via a gated webhook");
  assert.equal(await paymentStatus(pending.paymentId), "failed", "payment marked failed when gate blocks");
  assert.ok(await hasSettlementFailure("missing_rights"), "ownership_settlement_failed(missing_rights) emitted on Postgres");
});

test("pg-parity: webhook settlement SETTLES a fully-gated drop on real Postgres", { skip }, async () => {
  const { creator, drop } = await makeCreatorWorldDrop("wh-ok");
  await addRights(drop.id);
  await addTerms(creator.accountId, drop.id);
  const collectorId = await makeCollector("wh-ok");
  await commerceBffService.recordCertificatePreview(collectorId, drop.id);
  const pending = await createPendingPayment(collectorId, drop.id);

  const { status, effect } = await driveWebhook(completionEventFor(pending));
  assert.equal(status, 200);
  assert.equal(effect, "payment_completed", "a fully-gated webhook settlement completes on Postgres");

  assert.equal(await ownershipCount(collectorId, drop.id), 1, "ownership minted on Postgres");
  assert.equal(await paymentStatus(pending.paymentId), "succeeded", "payment marked succeeded");
});

test("pg-parity: a replayed webhook event does NOT double-mint on real Postgres (idempotency)", { skip }, async () => {
  const { creator, drop } = await makeCreatorWorldDrop("wh-idem");
  await addRights(drop.id);
  await addTerms(creator.accountId, drop.id);
  const collectorId = await makeCollector("wh-idem");
  await commerceBffService.recordCertificatePreview(collectorId, drop.id);
  const pending = await createPendingPayment(collectorId, drop.id);
  const event = completionEventFor(pending);

  const first = await driveWebhook(event);
  assert.equal(first.effect, "payment_completed", "first delivery settles");
  assert.equal(await ownershipCount(collectorId, drop.id), 1);

  // Replay the exact same event — must not settle a second ownership.
  const replay = await driveWebhook(event);
  assert.equal(replay.status, 200, "a replayed webhook is still acknowledged");
  assert.equal(await ownershipCount(collectorId, drop.id), 1, "a replayed webhook must not double-mint");
  assert.equal(await paymentStatus(pending.paymentId), "succeeded", "payment stays succeeded after replay");
});

// ─────────────────── manual payment-completion path ───────────────────

test("pg-parity: manual payment-completion is BLOCKED for a rights/terms-missing drop on real Postgres", { skip }, async () => {
  const { drop } = await makeCreatorWorldDrop("mc-block");
  const collectorId = await makeCollector("mc-block");
  const pending = await createPendingPayment(collectorId, drop.id);

  await commerceBffService.completePendingPayment(pending.paymentId);

  assert.equal(await ownershipCount(collectorId, drop.id), 0, "no ownership minted via a gated manual completion");
  assert.equal(await paymentStatus(pending.paymentId), "failed", "payment marked failed when gate blocks");
  assert.ok(await hasSettlementFailure("missing_rights"), "ownership_settlement_failed(missing_rights) emitted on Postgres");
});

test("pg-parity: manual payment-completion SETTLES a fully-gated drop on real Postgres", { skip }, async () => {
  const { creator, drop } = await makeCreatorWorldDrop("mc-ok");
  await addRights(drop.id);
  await addTerms(creator.accountId, drop.id);
  const collectorId = await makeCollector("mc-ok");
  await commerceBffService.recordCertificatePreview(collectorId, drop.id);
  const pending = await createPendingPayment(collectorId, drop.id);

  const receipt = await commerceBffService.completePendingPayment(pending.paymentId);
  assert.ok(receipt, "a fully-gated manual completion settles on Postgres");
  assert.equal(await ownershipCount(collectorId, drop.id), 1, "ownership minted on Postgres");
  assert.equal(await paymentStatus(pending.paymentId), "succeeded", "payment marked succeeded");
});
