/**
 * Proof: certificate-wallet bridge
 *
 * Verifies that the public wallet endpoint correctly surfaces verified on-chain
 * wallets belonging to the certificate owner, while:
 *   - returning nothing for an unknown certificate
 *   - excluding pending or disconnected wallets
 *   - not leaking accountId in the response
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import { GET as getCertWalletsRoute } from "../../app/api/v1/certificates/[cert_id]/wallets/route";
import { POST as postCheckoutRoute } from "../../app/api/v1/payments/checkout/[drop_id]/route";
import { POST as postPurchaseRoute } from "../../app/api/v1/payments/purchase/route";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-cert-wallet-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

// Minimal Next.js route context shim
function makeContext(certId: string) {
  return { params: Promise.resolve({ cert_id: certId }) };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

/**
 * Creates a session, purchases the first available drop via the manual payment
 * provider, and returns { session, certId }.
 */
async function seedCertificate(email: string) {
  const session = await commerceBffService.createSession({ email, role: "collector" });

  const drops = await commerceBffService.listDrops();
  const drop = drops[0];
  assert.ok(drop, "at least one drop in catalog");

  const checkoutRes = await postCheckoutRoute(
    new Request(`http://localhost/api/v1/payments/checkout/${drop.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ook-session-token": session.sessionToken },
      body: JSON.stringify({})
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(checkoutRes.status, 201);

  const checkoutPayload = await parseJson<{
    checkoutSession: { status: "already_owned"; receiptId: string } | { status: "pending"; paymentId: string };
  }>(checkoutRes);
  assert.equal(checkoutPayload.checkoutSession.status, "pending");
  if (checkoutPayload.checkoutSession.status !== "pending") throw new Error("checkout not pending");

  const purchaseRes = await postPurchaseRoute(
    new Request("http://localhost/api/v1/payments/purchase", {
      method: "POST",
      headers: { "content-type": "application/json", "x-ook-session-token": session.sessionToken },
      body: JSON.stringify({ paymentId: checkoutPayload.checkoutSession.paymentId })
    })
  );
  assert.equal(purchaseRes.status, 200);

  const collection = await commerceBffService.getMyCollection(session.accountId);
  assert.ok(collection && collection.ownedDrops.length > 0, "drop in collection after purchase");
  const certId = collection.ownedDrops[0]!.certificateId;
  assert.ok(certId, "certificate id present");

  return { session, certId };
}

test("proof: getCertificateWallets — returns verified wallets for certificate owner", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { session, certId } = await seedCertificate(`cert-wallet-owner-${randomUUID()}@oneofakinde.test`);

  // Initially no wallets
  const empty = await commerceBffService.getCertificateWallets(certId);
  assert.deepEqual(empty, [], "no wallets before connecting");

  // Connect a wallet (pending — should not appear)
  const pending = await commerceBffService.connectWallet(session.accountId, {
    address: "0xaabbccdd00112233aabbccdd00112233aabbccdd",
    chain: "ethereum",
    label: "cold storage"
  });
  assert.ok(pending, "wallet connected");
  assert.equal(pending.status, "pending");

  const stillEmpty = await commerceBffService.getCertificateWallets(certId);
  assert.deepEqual(stillEmpty, [], "pending wallet not surfaced");

  // Verify the wallet
  const verified = await commerceBffService.verifyWalletConnection(
    session.accountId,
    pending.id,
    "0xsig_abc123"
  );
  assert.ok(verified, "wallet verified");
  assert.equal(verified.status, "verified");

  const withWallet = await commerceBffService.getCertificateWallets(certId);
  assert.equal(withWallet.length, 1, "one verified wallet surfaced");

  const w = withWallet[0]!;
  assert.equal(w.address, "0xaabbccdd00112233aabbccdd00112233aabbccdd");
  assert.equal(w.chain, "ethereum");
  assert.equal(w.label, "cold storage");
  assert.ok(w.verifiedAt, "verifiedAt present");
  assert.equal("accountId" in w, false, "accountId not leaked");

  // Add a second wallet on a different chain
  const tezos = await commerceBffService.connectWallet(session.accountId, {
    address: "tz1CertWalletTezosAddressExample1",
    chain: "tezos"
  });
  assert.ok(tezos);
  await commerceBffService.verifyWalletConnection(session.accountId, tezos.id, "sig_tez");

  const both = await commerceBffService.getCertificateWallets(certId);
  assert.equal(both.length, 2, "two verified wallets");

  // Disconnect ethereum wallet — should drop to one
  await commerceBffService.disconnectWallet(session.accountId, pending.id);
  const afterDisconnect = await commerceBffService.getCertificateWallets(certId);
  assert.equal(afterDisconnect.length, 1, "disconnected wallet removed");
  assert.equal(afterDisconnect[0]!.chain, "tezos", "only tezos wallet remains");
});

test("proof: getCertificateWallets — returns empty for unknown certificate", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const result = await commerceBffService.getCertificateWallets("cert_does_not_exist");
  assert.deepEqual(result, [], "unknown cert returns empty array");
});

test("proof: GET /api/v1/certificates/:cert_id/wallets — 404 for unknown cert", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const res = await getCertWalletsRoute(new Request("http://localhost/"), makeContext("cert_unknown_xyz") as never);
  assert.equal(res.status, 404, "returns 404 for unknown certificate");
});

test("proof: GET /api/v1/certificates/:cert_id/wallets — 200 with verified wallets", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { session, certId } = await seedCertificate(`cert-wallet-route-${randomUUID()}@oneofakinde.test`);

  // Verify a wallet for the owner
  const wallet = await commerceBffService.connectWallet(session.accountId, {
    address: "0xroutetest1234567890abcdef1234567890abcd",
    chain: "polygon",
    label: "hot wallet"
  });
  assert.ok(wallet);
  await commerceBffService.verifyWalletConnection(session.accountId, wallet.id, "0xsig_polygon");

  // Hit the route
  const res = await getCertWalletsRoute(new Request("http://localhost/"), makeContext(certId) as never);
  assert.equal(res.status, 200, "returns 200");

  const body = await res.json() as { wallets: unknown[] };
  assert.ok(Array.isArray(body.wallets), "wallets array present");
  assert.equal(body.wallets.length, 1, "one wallet returned");

  const rw = body.wallets[0] as Record<string, unknown>;
  assert.equal(rw["chain"], "polygon");
  assert.equal(rw["label"], "hot wallet");
  assert.equal("accountId" in rw, false, "accountId not leaked in route response");
});
