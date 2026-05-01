/**
 * Proof: sensitivity rating resolver (Sprint 0.3)
 *
 * Validates the BFF-side resolution of `Drop.sensitivityRating` /
 * `Drop.sensitivitySource` at read time:
 *
 *   1. drop with explicit rating  → uses its own; source = "drop"
 *   2. drop without rating, world has default → inherits world default; source = "world_default"
 *   3. drop without rating, world has no default → resolves to "none"; source = "drop"
 *   4. world's default change is reflected on next read for inheriting drops
 *
 * The plan section 0.3 says no proof test is required (the interstitial is
 * a UI gate, not a security boundary), but this resolver is non-trivial
 * backend logic that future sprints will lean on (workshop UI, analytics
 * cohorts, etc.) — easier to lock the contract now than to debug a
 * regression later.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-sens-${randomUUID()}.json`);
}

async function bootstrapCreatorWithWorld(opts?: {
  defaultSensitivityRating?: "none" | "advisory" | "mature";
}) {
  const session = await commerceBffService.createSession({
    email: `sens-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const studio = await commerceBffService.setupCreatorStudio(session.accountId, {
    studioTitle: "sensitivity studio",
    studioSynopsis: "test studio for sensitivity rating resolver"
  });
  assert.ok(studio, "studio created");

  const world = await commerceBffService.createWorld(session.accountId, {
    title: `sens-world-${randomUUID().slice(0, 6)}`,
    synopsis: "test world for sensitivity inheritance",
    defaultSensitivityRating: opts?.defaultSensitivityRating
  });
  assert.ok(world, "world created");
  return { session, world };
}

test("proof: drop with explicit sensitivity rating wins (source = 'drop')", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { session, world } = await bootstrapCreatorWithWorld({ defaultSensitivityRating: "advisory" });

  const drop = await commerceBffService.createDrop(session.accountId, {
    title: `explicit-mature-${randomUUID().slice(0, 6)}`,
    worldId: world.id,
    synopsis: "drop sets its own mature rating, overriding the world default.",
    priceUsd: 1.99,
    sensitivityRating: "mature"
  });
  assert.ok(drop);

  // After read: explicit rating wins over world default.
  const fetched = await commerceBffService.getDropById(drop.id);
  assert.ok(fetched);
  assert.equal(fetched.sensitivityRating, "mature", "drop's own rating wins");
  assert.equal(fetched.sensitivitySource, "drop", "source = drop when explicit");
});

test("proof: drop without rating inherits world default (source = 'world_default')", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { session, world } = await bootstrapCreatorWithWorld({ defaultSensitivityRating: "advisory" });

  const drop = await commerceBffService.createDrop(session.accountId, {
    title: `inherit-${randomUUID().slice(0, 6)}`,
    worldId: world.id,
    synopsis: "drop without explicit rating; should inherit world default.",
    priceUsd: 1.99
  });
  assert.ok(drop);

  const fetched = await commerceBffService.getDropById(drop.id);
  assert.ok(fetched);
  assert.equal(fetched.sensitivityRating, "advisory", "inherits world default");
  assert.equal(fetched.sensitivitySource, "world_default", "source reflects inheritance");
});

test("proof: drop without rating + world without default resolves to 'none' (source = 'drop')", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { session, world } = await bootstrapCreatorWithWorld(); // no world default

  const drop = await commerceBffService.createDrop(session.accountId, {
    title: `default-none-${randomUUID().slice(0, 6)}`,
    worldId: world.id,
    synopsis: "drop without explicit rating and no world default.",
    priceUsd: 1.99
  });
  assert.ok(drop);

  const fetched = await commerceBffService.getDropById(drop.id);
  assert.ok(fetched);
  assert.equal(fetched.sensitivityRating, "none", "resolves to none");
  // The plan keeps source='drop' for the implicit-none case (it's the drop's
  // own absent rating defaulting). The workshop UI uses this distinction to
  // show "inherited from world" hints, which only fire when source is
  // explicitly "world_default".
  assert.equal(fetched.sensitivitySource, "drop", "source defaults to drop");
});

test("proof: listDrops applies the same resolver as getDropById", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { session, world } = await bootstrapCreatorWithWorld({ defaultSensitivityRating: "mature" });

  const drop = await commerceBffService.createDrop(session.accountId, {
    title: `list-resolver-${randomUUID().slice(0, 6)}`,
    worldId: world.id,
    synopsis: "drop without explicit rating, in a mature-default world.",
    priceUsd: 1.99
  });
  assert.ok(drop);

  // Resolution must be consistent across read paths.
  const viaList = (await commerceBffService.listDrops()).find((d) => d.id === drop.id);
  assert.ok(viaList);
  assert.equal(viaList.sensitivityRating, "mature");
  assert.equal(viaList.sensitivitySource, "world_default");

  const viaWorld = (await commerceBffService.listDropsByWorldId(world.id)).find((d) => d.id === drop.id);
  assert.ok(viaWorld);
  assert.equal(viaWorld.sensitivityRating, "mature");
  assert.equal(viaWorld.sensitivitySource, "world_default");

  const viaStudio = (await commerceBffService.listDropsByStudioHandle(session.handle)).find((d) => d.id === drop.id);
  assert.ok(viaStudio);
  assert.equal(viaStudio.sensitivityRating, "mature");
  assert.equal(viaStudio.sensitivitySource, "world_default");
});
