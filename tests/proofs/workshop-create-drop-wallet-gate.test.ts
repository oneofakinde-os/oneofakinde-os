/**
 * Proof: workshop POST /api/v1/workshop/drops accepts walletGate.
 *
 * Mirrors how the create-drop stepper submits the form: it sets a
 * `walletGate` field on the request body and the resulting drop should
 * carry that gate through to the catalog and the public drop response.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import { POST as postWorkshopDropRoute } from "../../app/api/v1/workshop/drops/route";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-stepper-${randomUUID()}.json`);
}

async function postCreateDrop(
  sessionToken: string,
  body: Record<string, unknown>
): Promise<Response> {
  return postWorkshopDropRoute(
    new Request("http://localhost/api/v1/workshop/drops", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": sessionToken
      },
      body: JSON.stringify(body)
    })
  );
}

async function bootstrapCreatorWithWorld() {
  const session = await commerceBffService.createSession({
    email: `creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const studio = await commerceBffService.setupCreatorStudio(session.accountId, {
    studioTitle: "stepper studio",
    studioSynopsis: "wallet-gate stepper test"
  });
  assert.ok(studio, "studio created");
  const world = await commerceBffService.createWorld(session.accountId, {
    title: "stepper-world",
    synopsis: "world for stepper drops"
  });
  assert.ok(world, "world created");
  return { session, world };
}

test("proof: stepper API persists walletGate on the created drop", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { session, world } = await bootstrapCreatorWithWorld();

  const res = await postCreateDrop(session.sessionToken, {
    title: `gated stepper drop ${randomUUID().slice(0, 6)}`,
    worldId: world.id,
    synopsis: "drop created via the stepper API with a wallet gate.",
    priceUsd: 2.49,
    walletGate: "ethereum"
  });

  assert.equal(res.status, 201, "drop creation succeeded");
  const body = (await res.json()) as { drop: { id: string; walletGate?: string } };
  assert.equal(body.drop.walletGate, "ethereum", "walletGate persisted");

  // Re-fetch via the service to confirm catalog state.
  const persisted = await commerceBffService.getDropById(body.drop.id);
  assert.ok(persisted);
  assert.equal(persisted.walletGate, "ethereum", "walletGate present after round-trip");
});

test("proof: stepper API ignores invalid walletGate values", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { session, world } = await bootstrapCreatorWithWorld();

  const res = await postCreateDrop(session.sessionToken, {
    title: `invalid gate ${randomUUID().slice(0, 6)}`,
    worldId: world.id,
    synopsis: "drop with an invalid walletGate value.",
    priceUsd: 0.99,
    walletGate: "bitcoin" // not a valid WalletChain
  });

  assert.equal(res.status, 201, "still creates the drop");
  const body = (await res.json()) as { drop: { walletGate?: string } };
  assert.equal(body.drop.walletGate, undefined, "invalid chain dropped silently");
});

test("proof: stepper API omits walletGate when no chain selected (no gate)", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { session, world } = await bootstrapCreatorWithWorld();

  const res = await postCreateDrop(session.sessionToken, {
    title: `ungated stepper drop ${randomUUID().slice(0, 6)}`,
    worldId: world.id,
    synopsis: "drop created via the stepper without a wallet gate.",
    priceUsd: 1.99
  });

  assert.equal(res.status, 201);
  const body = (await res.json()) as { drop: { walletGate?: string } };
  assert.equal(body.drop.walletGate, undefined, "no gate when omitted");
});
