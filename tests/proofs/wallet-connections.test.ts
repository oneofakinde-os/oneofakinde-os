import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import {
  GET as getWalletsRoute,
  POST as postWalletsRoute
} from "../../app/api/v1/account/wallets/route";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-wallet-${randomUUID()}.json`);
}

test("proof: wallet connection lifecycle — connect, verify, disconnect, reconnect", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: "wallet-test@example.com",
    role: "collector"
  });
  assert.ok(session, "session created");

  // List wallets — should be empty
  const emptyList = await commerceBffService.listWalletConnections(session.accountId);
  assert.equal(emptyList.length, 0, "no wallets initially");

  // Connect a wallet
  const wallet = await commerceBffService.connectWallet(session.accountId, {
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chain: "ethereum",
    label: "main wallet"
  });
  assert.ok(wallet, "wallet connected");
  assert.equal(wallet.status, "pending");
  assert.equal(wallet.chain, "ethereum");
  assert.equal(wallet.label, "main wallet");
  assert.ok(wallet.challenge, "challenge provided");
  assert.ok(wallet.challenge.startsWith("oneofakinde-verify:"), "challenge has correct prefix");
  assert.equal(wallet.address, "0x1234567890abcdef1234567890abcdef12345678");

  // Should appear in list
  const pendingList = await commerceBffService.listWalletConnections(session.accountId);
  assert.equal(pendingList.length, 1);
  assert.equal(pendingList[0]!.status, "pending");

  // Reject duplicate address+chain
  const duplicate = await commerceBffService.connectWallet(session.accountId, {
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chain: "ethereum"
  });
  assert.equal(duplicate, null, "duplicate rejected");

  // Same address on different chain should work
  const tezosWallet = await commerceBffService.connectWallet(session.accountId, {
    address: "tz1VeryLongTezosAddressHere1234567890",
    chain: "tezos"
  });
  assert.ok(tezosWallet, "different chain accepted");

  // Verify the ethereum wallet with a signature
  const verified = await commerceBffService.verifyWalletConnection(
    session.accountId,
    wallet.id,
    "0xdeadbeef1234"
  );
  assert.ok(verified, "wallet verified");
  assert.equal(verified.status, "verified");
  assert.ok(verified.verifiedAt, "verifiedAt set");
  assert.equal(verified.challenge, null, "challenge hidden after verification");

  // Verified wallet should hide challenge in list
  const verifiedList = await commerceBffService.listWalletConnections(session.accountId);
  const ethWallet = verifiedList.find((w) => w.chain === "ethereum");
  assert.ok(ethWallet);
  assert.equal(ethWallet.challenge, null, "challenge hidden in list for verified wallet");

  // Disconnect the verified wallet
  const disconnected = await commerceBffService.disconnectWallet(session.accountId, wallet.id);
  assert.equal(disconnected, true, "wallet disconnected");

  // Should no longer appear in active list
  const afterDisconnect = await commerceBffService.listWalletConnections(session.accountId);
  const ethAfter = afterDisconnect.find((w) => w.chain === "ethereum");
  assert.equal(ethAfter, undefined, "disconnected wallet not in list");

  // Reconnecting same address should work after disconnect
  const reconnected = await commerceBffService.connectWallet(session.accountId, {
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chain: "ethereum"
  });
  assert.ok(reconnected, "reconnection after disconnect works");
  assert.equal(reconnected.status, "pending");

  // Clean up tezos wallet
  await commerceBffService.disconnectWallet(session.accountId, tezosWallet.id);
});

test("proof: wallet connection API route — auth guard + CRUD", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  // Unauthenticated request should fail
  const unauthed = await getWalletsRoute(new Request("http://localhost/api/v1/account/wallets"));
  assert.equal(unauthed.status, 401, "unauthenticated GET returns 401");

  // Create session for authenticated requests
  const session = await commerceBffService.createSession({
    email: "wallet-api@example.com",
    role: "collector"
  });
  assert.ok(session);

  const headers = { cookie: `ook_session=${session.sessionToken}` };

  // GET — empty list
  const getEmpty = await getWalletsRoute(
    new Request("http://localhost/api/v1/account/wallets", { headers })
  );
  assert.equal(getEmpty.status, 200);
  const emptyBody = (await getEmpty.json()) as { wallets: unknown[] };
  assert.equal(emptyBody.wallets.length, 0);

  // POST connect
  const connectRes = await postWalletsRoute(
    new Request("http://localhost/api/v1/account/wallets", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({
        action: "connect",
        address: "0xabcdef1234567890abcdef1234567890abcdef12",
        chain: "ethereum",
        label: "test"
      })
    })
  );
  assert.equal(connectRes.status, 200);
  const connectBody = (await connectRes.json()) as { wallet: { id: string; status: string; challenge: string } };
  assert.equal(connectBody.wallet.status, "pending");
  assert.ok(connectBody.wallet.challenge);

  // POST verify
  const verifyRes = await postWalletsRoute(
    new Request("http://localhost/api/v1/account/wallets", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        walletId: connectBody.wallet.id,
        signature: "0xfakeSignature123"
      })
    })
  );
  assert.equal(verifyRes.status, 200);
  const verifyBody = (await verifyRes.json()) as { wallet: { status: string } };
  assert.equal(verifyBody.wallet.status, "verified");

  // POST disconnect
  const disconnectRes = await postWalletsRoute(
    new Request("http://localhost/api/v1/account/wallets", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({
        action: "disconnect",
        walletId: connectBody.wallet.id
      })
    })
  );
  assert.equal(disconnectRes.status, 200);
  const disconnectBody = (await disconnectRes.json()) as { disconnected: boolean };
  assert.equal(disconnectBody.disconnected, true);

  // GET — empty again after disconnect
  const getFinal = await getWalletsRoute(
    new Request("http://localhost/api/v1/account/wallets", { headers })
  );
  const finalBody = (await getFinal.json()) as { wallets: unknown[] };
  assert.equal(finalBody.wallets.length, 0);
});

test("proof: wallet connection validation — bad inputs rejected", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: "wallet-validation@example.com",
    role: "collector"
  });
  assert.ok(session);

  const headers = { cookie: `ook_session=${session.sessionToken}` };

  // Missing action
  const noAction = await postWalletsRoute(
    new Request("http://localhost/api/v1/account/wallets", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({})
    })
  );
  assert.equal(noAction.status, 400);

  // Invalid chain
  const badChain = await postWalletsRoute(
    new Request("http://localhost/api/v1/account/wallets", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ action: "connect", address: "0x1234567890abcdef", chain: "bitcoin" })
    })
  );
  assert.equal(badChain.status, 400);

  // Address too short
  const shortAddr = await postWalletsRoute(
    new Request("http://localhost/api/v1/account/wallets", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ action: "connect", address: "0x123", chain: "ethereum" })
    })
  );
  assert.equal(shortAddr.status, 400);

  // Verify with bad signature (too short)
  const wallet = await commerceBffService.connectWallet(session.accountId, {
    address: "0xabcdef1234567890abcdef1234567890abcdef12",
    chain: "polygon"
  });
  assert.ok(wallet);

  const badSig = await postWalletsRoute(
    new Request("http://localhost/api/v1/account/wallets", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ action: "verify", walletId: wallet.id, signature: "x" })
    })
  );
  assert.equal(badSig.status, 400, "short signature rejected");

  // Unknown action
  const unknownAction = await postWalletsRoute(
    new Request("http://localhost/api/v1/account/wallets", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ action: "transfer" })
    })
  );
  assert.equal(unknownAction.status, 400);
});

test("proof: wallet connections are isolated between accounts", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const alice = await commerceBffService.createSession({
    email: "alice-wallets@example.com",
    role: "collector"
  });
  const bob = await commerceBffService.createSession({
    email: "bob-wallets@example.com",
    role: "collector"
  });
  assert.ok(alice);
  assert.ok(bob);

  // Alice connects a wallet
  const aliceWallet = await commerceBffService.connectWallet(alice.accountId, {
    address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    chain: "ethereum"
  });
  assert.ok(aliceWallet);

  // Bob cannot see Alice's wallet
  const bobWallets = await commerceBffService.listWalletConnections(bob.accountId);
  assert.equal(bobWallets.length, 0, "Bob cannot see Alice's wallets");

  // Bob cannot disconnect Alice's wallet
  const bobDisconnect = await commerceBffService.disconnectWallet(bob.accountId, aliceWallet.id);
  assert.equal(bobDisconnect, false, "Bob cannot disconnect Alice's wallet");

  // Bob cannot verify Alice's wallet
  const bobVerify = await commerceBffService.verifyWalletConnection(
    bob.accountId,
    aliceWallet.id,
    "0xfakesig"
  );
  assert.equal(bobVerify, null, "Bob cannot verify Alice's wallet");

  // Alice can see her own wallet
  const aliceWallets = await commerceBffService.listWalletConnections(alice.accountId);
  assert.equal(aliceWallets.length, 1);
});
