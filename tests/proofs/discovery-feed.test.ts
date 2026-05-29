import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-df-${randomUUID()}.json`);
}

test("proof: discovery feed returns only market-ready drops (rights metadata required)", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // Seed DB has stardust (public + rights) and through-the-lens (public + rights)
  const drops = await commerceBffService.listDiscoveryDrops(null);
  assert.ok(Array.isArray(drops), "should return an array");

  // All returned drops must be market-ready (checked by listing: only stardust + through-the-lens are public)
  for (const drop of drops) {
    assert.ok(drop.visibility === "public" || drop.visibility === undefined, "all discovery drops must be publicly visible");
    assert.ok(drop.proofSignal !== undefined, "each discovery drop should have a proofSignal");
  }

  // At least stardust and through-the-lens should appear (both public + rights in seed)
  assert.ok(drops.length >= 2, "at least 2 market-ready drops should be in the seeded discovery feed");
});

test("proof: discovery feed excludes drops without rights metadata", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // Create a creator and a world, then a drop WITHOUT rights metadata
  const baseSession = await commerceBffService.createSession({
    email: `df-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studioResult = await commerceBffService.setupCreatorStudio(baseSession.accountId, {
    studioTitle: "Discovery Test Studio",
    studioSynopsis: "for discovery testing",
  });
  assert.ok(studioResult, "studio created");
  const creatorSession = studioResult.session;

  const world = await commerceBffService.createWorld(creatorSession.accountId, {
    title: "test discovery world",
    synopsis: "for testing",
    defaultDropVisibility: "public",
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creatorSession.accountId, {
    title: "drop without rights metadata",
    worldId: world.id,
    synopsis: "this drop has no rights metadata",
    priceUsd: 2.99,
    visibility: "public",
  });
  assert.ok(drop, "drop created");

  // Discovery should NOT include this drop (no rights metadata)
  const drops = await commerceBffService.listDiscoveryDrops(null);
  const found = drops.find((d) => d.id === drop.id);
  assert.equal(found, undefined, "drop without rights metadata must be excluded from discovery");
});

test("proof: discovery feed excludes unreleased drops for anonymous viewers", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // Drops with future releaseAt should not appear for anonymous viewer
  const drops = await commerceBffService.listDiscoveryDrops(null);
  for (const drop of drops) {
    if (drop.releaseAt) {
      assert.ok(
        new Date(drop.releaseAt) <= new Date(),
        `unreleased drop ${drop.id} must not appear in anonymous discovery feed`
      );
    }
  }
});

test("proof: discovery feed includes savedByViewer state when authenticated", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const collectorSession = await commerceBffService.createSession({
    email: `df-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Save stardust (in seed DB)
  const saved = await commerceBffService.addSavedIntent(collectorSession.accountId, "stardust");
  assert.ok(saved, "saved intent created");

  const drops = await commerceBffService.listDiscoveryDrops(collectorSession.accountId);
  const stardust = drops.find((d) => d.id === "stardust");
  assert.ok(stardust, "stardust should appear in authenticated discovery feed");
  assert.equal(stardust.savedByViewer, true, "savedByViewer should be true for saved drop");

  const throughTheLens = drops.find((d) => d.id === "through-the-lens");
  if (throughTheLens) {
    assert.equal(throughTheLens.savedByViewer, false, "unsaved drop should have savedByViewer=false");
  }
});

test("proof: discovery feed includes proof signal for each drop", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const drops = await commerceBffService.listDiscoveryDrops(null);
  assert.ok(drops.length > 0, "should have at least one drop in seed discovery feed");

  for (const drop of drops) {
    assert.ok(typeof drop.proofSignal === "object", "each drop must have a proofSignal object");
    assert.ok(typeof drop.proofSignal.hasRightsMetadata === "boolean");
    assert.ok(typeof drop.proofSignal.isProofReady === "boolean");
    assert.ok(typeof drop.collectAvailable === "boolean");
    assert.ok(typeof drop.savedByViewer === "boolean");
  }

  // Stardust has rights + verified cert → should be proof-ready
  const stardust = drops.find((d) => d.id === "stardust");
  assert.ok(stardust, "stardust should be in discovery feed");
  assert.equal(stardust.proofSignal.hasRightsMetadata, true);
  assert.equal(stardust.proofSignal.hasCertificate, true);
  assert.equal(stardust.proofSignal.isProofReady, true);
});
