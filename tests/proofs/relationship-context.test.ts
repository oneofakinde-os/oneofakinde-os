import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-rc-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop() {
  const base = await commerceBffService.createSession({
    email: `rc-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Context Test Studio",
    studioSynopsis: "for context testing",
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `ctx-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for context testing",
    defaultDropVisibility: "public",
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Context Drop",
    worldId: world.id,
    synopsis: "for context testing",
    priceUsd: 1.99,
    visibility: "public",
  });
  assert.ok(drop, "drop created");
  return { creator, drop };
}

test("proof: relationship context is false for all signals before any relationship", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();

  const viewer = await commerceBffService.createSession({
    email: `rc-viewer-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const context = await commerceBffService.getRelationshipContext(viewer.accountId, creator.handle);
  assert.ok(context, "context returned");
  assert.equal(context.viewerAccountId, viewer.accountId);
  assert.equal(context.studioHandle, creator.handle);
  assert.equal(context.hasCollectedFromStudio, false, "no collection yet");
  assert.equal(context.hasSavedFromStudio, false, "no save yet");
  assert.equal(context.isFollowingStudio, false, "not following yet");
  assert.equal(context.isActivePatron, false, "not patron yet");
});

test("proof: relationship context reflects follow correctly", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();

  const viewer = await commerceBffService.createSession({
    email: `rc-follower-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.followStudio(viewer.accountId, creator.handle);

  const context = await commerceBffService.getRelationshipContext(viewer.accountId, creator.handle);
  assert.equal(context.isFollowingStudio, true, "isFollowingStudio must be true after follow");
  assert.equal(context.hasCollectedFromStudio, false, "hasCollectedFromStudio must remain false");
  assert.equal(context.isActivePatron, false, "isActivePatron must remain false");
});

test("proof: relationship context reflects collection correctly", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop();

  const viewer = await commerceBffService.createSession({
    email: `rc-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.purchaseDrop(viewer.accountId, drop.id);

  const context = await commerceBffService.getRelationshipContext(viewer.accountId, creator.handle);
  assert.equal(context.hasCollectedFromStudio, true, "hasCollectedFromStudio must be true after purchase");
  assert.equal(context.isFollowingStudio, false, "isFollowingStudio must remain false");
  assert.equal(context.isActivePatron, false, "isActivePatron must remain false");
});

test("proof: relationship context reflects patron commitment correctly", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();

  const viewer = await commerceBffService.createSession({
    email: `rc-patron-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.commitPatron(viewer.accountId, creator.handle);

  const context = await commerceBffService.getRelationshipContext(viewer.accountId, creator.handle);
  assert.equal(context.isActivePatron, true, "isActivePatron must be true after commitPatron");
  assert.equal(context.isFollowingStudio, false, "isFollowingStudio remains false unless explicitly followed");
  assert.equal(context.hasCollectedFromStudio, false, "hasCollectedFromStudio remains false");
});
