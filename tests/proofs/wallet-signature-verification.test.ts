/**
 * Proof: real cryptographic verification of wallet signatures.
 *
 * Generates an ephemeral Ethereum key with viem, signs the BFF-issued
 * challenge, then exercises the public `verifyWalletConnection` path:
 *   - valid signature for the right address verifies
 *   - tampered signature rejects
 *   - signature for a *different* address rejects
 *   - signature for a *different* message rejects
 *   - polygon path uses the same secp256k1 verifier
 *   - mock mode (OOK_WALLET_SIGNATURES=mock) preserves legacy permissive
 *     behaviour for tests that don't generate real sigs
 *
 * Also unit-tests the `verifyWalletSignature` helper directly so the
 * cryptographic core is covered independently of BFF state.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { commerceBffService } from "../../lib/bff/service";
import { verifyWalletSignature } from "../../lib/wallet/signatures";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-walletsig-${randomUUID()}.json`);
}

async function withRealVerifier<T>(fn: () => Promise<T>): Promise<T> {
  const prev = process.env.OOK_WALLET_SIGNATURES;
  process.env.OOK_WALLET_SIGNATURES = "real";
  try {
    return await fn();
  } finally {
    if (prev === undefined) {
      delete process.env.OOK_WALLET_SIGNATURES;
    } else {
      process.env.OOK_WALLET_SIGNATURES = prev;
    }
  }
}

test("unit: verifyWalletSignature accepts a valid ethereum personal_sign signature", async () => {
  await withRealVerifier(async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const message = "oneofakinde-verify:tester:abc-123";
    const signature = await account.signMessage({ message });

    const ok = await verifyWalletSignature({
      chain: "ethereum",
      address: account.address,
      message,
      signature
    });
    assert.equal(ok, true);
  });
});

test("unit: verifyWalletSignature rejects a tampered signature", async () => {
  await withRealVerifier(async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const message = "oneofakinde-verify:tester:abc-123";
    const goodSig = await account.signMessage({ message });
    // Flip one hex char somewhere in the body
    const tampered = (goodSig.slice(0, -3) + (goodSig.slice(-3, -2) === "0" ? "1" : "0") + goodSig.slice(-2)) as `0x${string}`;

    const ok = await verifyWalletSignature({
      chain: "ethereum",
      address: account.address,
      message,
      signature: tampered
    });
    assert.equal(ok, false);
  });
});

test("unit: verifyWalletSignature rejects a signature meant for a different address", async () => {
  await withRealVerifier(async () => {
    const signer = privateKeyToAccount(generatePrivateKey());
    const otherAccount = privateKeyToAccount(generatePrivateKey());
    const message = "oneofakinde-verify:tester:address-mismatch";
    const signature = await signer.signMessage({ message });

    const ok = await verifyWalletSignature({
      chain: "ethereum",
      address: otherAccount.address, // claim the wrong address
      message,
      signature
    });
    assert.equal(ok, false);
  });
});

test("unit: verifyWalletSignature rejects a signature over a different message", async () => {
  await withRealVerifier(async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const signature = await account.signMessage({ message: "issued-message" });

    const ok = await verifyWalletSignature({
      chain: "ethereum",
      address: account.address,
      message: "different-message", // server expects this one
      signature
    });
    assert.equal(ok, false);
  });
});

test("unit: verifyWalletSignature treats polygon as secp256k1 (same verifier as ethereum)", async () => {
  await withRealVerifier(async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const message = "polygon-challenge";
    const signature = await account.signMessage({ message });

    const ok = await verifyWalletSignature({
      chain: "polygon",
      address: account.address,
      message,
      signature
    });
    assert.equal(ok, true);
  });
});

test("unit: verifyWalletSignature gracefully handles malformed signature input", async () => {
  await withRealVerifier(async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const cases = ["", "0x", "0xnothex", "not-even-hex"];
    for (const sig of cases) {
      const ok = await verifyWalletSignature({
        chain: "ethereum",
        address: account.address,
        message: "msg",
        signature: sig
      });
      assert.equal(ok, false, `expected false for "${sig}"`);
    }
  });
});

test("unit: mock mode accepts any non-empty signature regardless of chain", async () => {
  const prev = process.env.OOK_WALLET_SIGNATURES;
  process.env.OOK_WALLET_SIGNATURES = "mock";
  try {
    for (const chain of ["ethereum", "tezos", "polygon"] as const) {
      const ok = await verifyWalletSignature({
        chain,
        address: "0xanything-since-we-mock",
        message: "msg",
        signature: "anysig"
      });
      assert.equal(ok, true, `mock mode should pass for ${chain}`);
    }

    const tooShort = await verifyWalletSignature({
      chain: "ethereum",
      address: "0xa",
      message: "m",
      signature: "ab"
    });
    assert.equal(tooShort, false, "mock mode still rejects sub-3-char sigs");
  } finally {
    if (prev === undefined) {
      delete process.env.OOK_WALLET_SIGNATURES;
    } else {
      process.env.OOK_WALLET_SIGNATURES = prev;
    }
  }
});

test("integration: verifyWalletConnection accepts a real personal_sign signature end-to-end", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  process.env.OOK_WALLET_SIGNATURES = "real";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    delete process.env.OOK_WALLET_SIGNATURES;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `walletsig-real-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const account = privateKeyToAccount(generatePrivateKey());
  const pending = await commerceBffService.connectWallet(session.accountId, {
    address: account.address,
    chain: "ethereum",
    label: "real signer"
  });
  assert.ok(pending, "wallet connection initiated");
  assert.equal(pending.status, "pending");
  assert.ok(pending.challenge, "challenge issued");

  // Sign the exact challenge the server issued
  const signature = await account.signMessage({ message: pending.challenge! });

  const verified = await commerceBffService.verifyWalletConnection(
    session.accountId,
    pending.id,
    signature
  );
  assert.ok(verified, "wallet verified with real signature");
  assert.equal(verified.status, "verified");
});

test("integration: verifyWalletConnection rejects a junk signature in real mode", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  process.env.OOK_WALLET_SIGNATURES = "real";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    delete process.env.OOK_WALLET_SIGNATURES;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `walletsig-junk-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const account = privateKeyToAccount(generatePrivateKey());
  const pending = await commerceBffService.connectWallet(session.accountId, {
    address: account.address,
    chain: "ethereum"
  });
  assert.ok(pending);

  // "0xdeadbeef..." is what the legacy mock used. In real mode it should fail.
  const blocked = await commerceBffService.verifyWalletConnection(
    session.accountId,
    pending.id,
    "0xdeadbeef1234"
  );
  assert.equal(blocked, null, "junk signature rejected in real mode");

  // Wallet remains pending — a follow-up real signature can still verify it.
  const wallets = await commerceBffService.listWalletConnections(session.accountId);
  const stillPending = wallets.find((w) => w.id === pending.id);
  assert.ok(stillPending);
  assert.equal(stillPending.status, "pending");
});

test("integration: verifyWalletConnection rejects a signature from a different key (correct address claim)", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  process.env.OOK_WALLET_SIGNATURES = "real";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    delete process.env.OOK_WALLET_SIGNATURES;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `walletsig-impersonate-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const claimed = privateKeyToAccount(generatePrivateKey());
  const attacker = privateKeyToAccount(generatePrivateKey());

  const pending = await commerceBffService.connectWallet(session.accountId, {
    address: claimed.address, // user claims this address
    chain: "ethereum"
  });
  assert.ok(pending);

  // Attacker signs the challenge with a *different* key
  const sigFromAttacker = await attacker.signMessage({ message: pending.challenge! });

  const blocked = await commerceBffService.verifyWalletConnection(
    session.accountId,
    pending.id,
    sigFromAttacker
  );
  assert.equal(blocked, null, "signature from non-claimed key is rejected");
});
