import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { commerceBffService } from "../../lib/bff/service";
import { POST as checkoutRoute } from "../../app/api/v1/payments/checkout/[drop_id]/route";

// The non-prod gateway now defaults to bff, so the whole UI loop self-HTTPs to these
// API route handlers → commerceBffService → the market-law gates (no separate ungated
// mock store). This pins the payoff: the gated path REFUSES a term-less drop at
// checkout — the same refusal reproduced live, here exercised through the actual route
// handler the non-prod UI now hits, in-process.

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-nonprod-ui-gate-${randomUUID()}.json`);
}

async function makeCreatorWorldTermlessDrop() {
  const base = await commerceBffService.createSession({
    email: `nonprod-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Non-prod Gate Studio",
    studioSynopsis: "non-prod ui path gate proof"
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;
  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `nonprod-world-${randomUUID().slice(0, 6)}`,
    synopsis: "non-prod ui path gate proof"
  });
  assert.ok(world, "world created");
  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Ungated Non-prod Drop",
    worldId: world!.id,
    synopsis: "a term-less drop the gated UI path must refuse",
    priceUsd: 3,
    visibility: "public"
  });
  assert.ok(drop, "drop created");
  return drop!;
}

test("proof: the checkout route (the gated bff path the non-prod UI now uses) REFUSES a term-less drop", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const drop = await makeCreatorWorldTermlessDrop();
  const collector = await commerceBffService.createSession({
    email: `nonprod-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const response = await checkoutRoute(
    new Request(`http://localhost/api/v1/payments/checkout/${drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({ successUrl: "http://x/ok", cancelUrl: "http://x/no" })
    }),
    { params: Promise.resolve({ drop_id: drop.id }) }
  );

  assert.notEqual(response.status, 200, "a term-less checkout must not succeed");
  assert.notEqual(response.status, 201, "a term-less checkout must not create a pending payment");
  const body = (await response.json()) as { error?: string; reasons?: string[] };
  assert.match(
    JSON.stringify(body),
    /rights metadata|preconditions not met/i,
    "the refusal must name the missing rights/terms"
  );
});
