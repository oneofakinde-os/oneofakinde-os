import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-cal-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop() {
  const base = await commerceBffService.createSession({
    email: `cal-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Access Test Studio",
    studioSynopsis: "for access testing",
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `access-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for access testing",
    defaultDropVisibility: "public",
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Collector-Only Drop",
    worldId: world.id,
    synopsis: "for collector-only access testing",
    priceUsd: 5.00,
    visibility: "collectors_only",
  });
  assert.ok(drop, "drop created");
  return { creator, drop, world };
}

test("proof: active holder can access collector-only content", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop();

  const collector = await commerceBffService.createSession({
    email: `cal-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Before collecting: no access
  const beforeAccess = await commerceBffService.canAccessCollectorOnlyContent(
    collector.accountId,
    drop.id
  );
  assert.equal(beforeAccess, false, "non-holder must not have collector-only access");

  // Simulate a completed purchase
  await commerceBffService.purchaseDrop(collector.accountId, drop.id);

  const afterAccess = await commerceBffService.canAccessCollectorOnlyContent(
    collector.accountId,
    drop.id
  );
  assert.equal(afterAccess, true, "holder after purchase must have collector-only access");
});

test("proof: non-holder denied collector-only access", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop();

  const nonHolder = await commerceBffService.createSession({
    email: `cal-nonholder-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const canAccess = await commerceBffService.canAccessCollectorOnlyContent(
    nonHolder.accountId,
    drop.id
  );
  assert.equal(canAccess, false, "non-holder must be denied collector-only access");
});

test("proof: collector-only access returns boolean without leaking other collector data", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop();

  const result = await commerceBffService.canAccessCollectorOnlyContent("fake-account", drop.id);
  assert.equal(typeof result, "boolean", "access check must return boolean");
  assert.equal(result, false, "unknown account must not have access");
});
