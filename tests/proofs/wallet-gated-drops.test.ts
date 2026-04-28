/**
 * Proof: wallet-gated drops
 *
 * Verifies that drops with `walletGate` set:
 *   - block checkout/purchase for collectors with no verified wallet on the chain
 *   - block when verified wallet is on a *different* chain
 *   - allow once a verified wallet on the required chain exists
 *   - allow the studio owner regardless (creator bypass)
 *   - already-owned drops continue to surface as satisfied
 *   - the checkout preview surfaces a structured walletGate descriptor
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-wallet-gate-${randomUUID()}.json`);
}

/**
 * Spins up a creator + world + gated drop, plus a collector account, and
 * returns handles for tests to use. The gated drop's `walletGate` is set to
 * `chain` (default `ethereum`), with `releaseDate` already in the past so
 * collection is otherwise allowed.
 */
async function seedGatedDrop(chain: "ethereum" | "tezos" | "polygon" = "ethereum") {
  // 1. Creator account — start as collector, then upgrade via setupCreatorStudio.
  //    (Direct `role: "creator"` sessions skip the upgrade path and have no studio.)
  const creatorEmail = `creator-${randomUUID()}@oneofakinde.test`;
  const creatorSession = await commerceBffService.createSession({
    email: creatorEmail,
    role: "collector"
  });

  const studio = await commerceBffService.setupCreatorStudio(creatorSession.accountId, {
    studioTitle: "gated studio",
    studioSynopsis: "wallet-gated test studio"
  });
  assert.ok(studio, "studio created");

  const world = await commerceBffService.createWorld(creatorSession.accountId, {
    title: "gated-world",
    synopsis: "where wallet-gated drops live"
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creatorSession.accountId, {
    title: `gated-drop-${randomUUID().slice(0, 6)}`,
    worldId: world.id,
    synopsis: "drop that requires a verified wallet to collect.",
    priceUsd: 4.99,
    walletGate: chain
  });
  assert.ok(drop, "gated drop created");
  assert.equal(drop.walletGate, chain);

  // 2. Collector account
  const collectorEmail = `collector-${randomUUID()}@oneofakinde.test`;
  const collectorSession = await commerceBffService.createSession({
    email: collectorEmail,
    role: "collector"
  });

  return { creatorSession, collectorSession, drop, world };
}

test("proof: wallet-gated drop — checkout preview reports unsatisfied gate for collector with no wallet", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { collectorSession, drop } = await seedGatedDrop("ethereum");

  const preview = await commerceBffService.getCheckoutPreview(collectorSession.accountId, drop.id);
  assert.ok(preview, "preview returned");
  assert.ok(preview.walletGate, "walletGate descriptor present on preview");
  assert.equal(preview.walletGate.chain, "ethereum");
  assert.equal(preview.walletGate.satisfied, false);
  assert.equal(preview.walletGate.verifiedAddress, null);
});

test("proof: wallet-gated drop — purchase blocked when no verified wallet on required chain", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { collectorSession, drop } = await seedGatedDrop("ethereum");

  const blocked = await commerceBffService.purchaseDrop(collectorSession.accountId, drop.id);
  assert.equal(blocked, null, "purchase blocked");
});

test("proof: wallet-gated drop — verified wallet on wrong chain still blocks", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { collectorSession, drop } = await seedGatedDrop("ethereum");

  // Verify a TEZOS wallet (wrong chain)
  const tezos = await commerceBffService.connectWallet(collectorSession.accountId, {
    address: "tz1WrongChainExampleAddress00000",
    chain: "tezos"
  });
  assert.ok(tezos);
  await commerceBffService.verifyWalletConnection(collectorSession.accountId, tezos.id, "sig_tez");

  const preview = await commerceBffService.getCheckoutPreview(collectorSession.accountId, drop.id);
  assert.ok(preview);
  assert.equal(preview.walletGate?.satisfied, false, "wrong-chain wallet does not satisfy gate");

  const blocked = await commerceBffService.purchaseDrop(collectorSession.accountId, drop.id);
  assert.equal(blocked, null, "purchase blocked for wrong-chain wallet");
});

test("proof: wallet-gated drop — verified wallet on required chain unlocks purchase", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { collectorSession, drop } = await seedGatedDrop("ethereum");

  // Verify an ethereum wallet
  const ethAddress = "0xgate1234567890abcdef1234567890abcdef1234";
  const wallet = await commerceBffService.connectWallet(collectorSession.accountId, {
    address: ethAddress,
    chain: "ethereum",
    label: "main"
  });
  assert.ok(wallet);
  await commerceBffService.verifyWalletConnection(collectorSession.accountId, wallet.id, "sig_eth");

  const preview = await commerceBffService.getCheckoutPreview(collectorSession.accountId, drop.id);
  assert.ok(preview);
  assert.equal(preview.walletGate?.satisfied, true, "gate satisfied with right-chain wallet");
  assert.equal(preview.walletGate?.verifiedAddress, ethAddress, "verifiedAddress surfaced");

  const receipt = await commerceBffService.purchaseDrop(collectorSession.accountId, drop.id);
  assert.ok(receipt, "purchase succeeds when gate is satisfied");
  assert.equal(receipt.dropId, drop.id);
});

test("proof: wallet-gated drop — studio owner bypasses their own gate", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { creatorSession, drop } = await seedGatedDrop("ethereum");

  const preview = await commerceBffService.getCheckoutPreview(creatorSession.accountId, drop.id);
  assert.ok(preview, "preview returned for studio owner");
  assert.equal(preview.walletGate?.satisfied, true, "studio owner satisfies own gate");
  assert.equal(preview.walletGate?.verifiedAddress, null, "owner needs no wallet to satisfy");
});

test("proof: drop without walletGate — preview omits walletGate descriptor", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  // Use a plain seeded drop (no walletGate)
  const session = await commerceBffService.createSession({
    email: `plain-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const drops = await commerceBffService.listDrops();
  const plainDrop = drops.find((d) => !d.walletGate);
  assert.ok(plainDrop, "at least one ungated drop in catalog");

  const preview = await commerceBffService.getCheckoutPreview(session.accountId, plainDrop.id);
  assert.ok(preview, "ungated preview returned");
  assert.equal(preview.walletGate, undefined, "no walletGate descriptor on ungated drop");
});

test("proof: wallet-gated drop — already-owned receipt continues to surface as satisfied", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { collectorSession, drop } = await seedGatedDrop("ethereum");

  // Verify wallet, purchase, then disconnect — owner should still see gate satisfied.
  const wallet = await commerceBffService.connectWallet(collectorSession.accountId, {
    address: "0xowned1234567890abcdef1234567890abcdef12",
    chain: "ethereum"
  });
  assert.ok(wallet);
  await commerceBffService.verifyWalletConnection(collectorSession.accountId, wallet.id, "sig");
  const receipt = await commerceBffService.purchaseDrop(collectorSession.accountId, drop.id);
  assert.ok(receipt, "purchase succeeded");

  // Now disconnect the wallet
  await commerceBffService.disconnectWallet(collectorSession.accountId, wallet.id);

  // Existing owner should still see gate satisfied because they already own
  const preview = await commerceBffService.getCheckoutPreview(collectorSession.accountId, drop.id);
  assert.ok(preview);
  assert.equal(preview.walletGate?.satisfied, true, "already-owned bypasses gate even after disconnect");
});
