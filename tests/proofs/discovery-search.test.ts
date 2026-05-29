import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-ds-${randomUUID()}.json`);
}

test("proof: discovery search by tag returns only drops with matching tag", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // stardust has tag "cinematic", through-the-lens has tag "documentary"
  const cinematicDrops = await commerceBffService.listDiscoveryDrops(null, { tags: ["cinematic"] });
  assert.ok(Array.isArray(cinematicDrops), "tag filter should return array");

  for (const drop of cinematicDrops) {
    const hasCinematic = (drop.tags ?? []).includes("cinematic");
    assert.ok(hasCinematic, `drop ${drop.id} must have 'cinematic' tag when filtered by cinematic`);
  }

  // stardust has 'cinematic' tag — should appear
  const stardust = cinematicDrops.find((d) => d.id === "stardust");
  assert.ok(stardust, "stardust with cinematic tag should appear in cinematic tag filter");
});

test("proof: discovery search excludes drops without rights metadata", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const baseSession = await commerceBffService.createSession({
    email: `ds-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studioResult = await commerceBffService.setupCreatorStudio(baseSession.accountId, {
    studioTitle: "Search Gate Studio",
    studioSynopsis: "for search testing",
  });
  assert.ok(studioResult, "studio created");
  const creatorSession = studioResult.session;

  const world = await commerceBffService.createWorld(creatorSession.accountId, {
    title: "search gate world",
    synopsis: "for search testing",
    defaultDropVisibility: "public",
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creatorSession.accountId, {
    title: "no rights searchable drop",
    worldId: world.id,
    synopsis: "no rights metadata",
    priceUsd: 1.00,
    visibility: "public",
  });
  assert.ok(drop, "drop created");

  // Search via tag filter — this drop has no tags or rights, must be excluded
  const allDrops = await commerceBffService.listDiscoveryDrops(null);
  const found = allDrops.find((d) => d.id === drop.id);
  assert.equal(found, undefined, "drop without rights metadata must be excluded from discovery search");
});

test("proof: discovery search respects category + medium cross-filter", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // Seed: stardust is category=video medium=video, through-the-lens is category=video medium=video
  // Cross-filter: category=video AND medium=video should return both
  const drops = await commerceBffService.listDiscoveryDrops(null, { category: ["video"], medium: ["video"] });
  assert.ok(Array.isArray(drops), "cross-filter should return array");

  for (const drop of drops) {
    assert.equal(drop.category, "video", `drop ${drop.id} must have category=video`);
    assert.equal(drop.medium, "video", `drop ${drop.id} must have medium=video`);
  }

  // Cross-filter: category=music AND medium=video should return nothing (no such drops in seed)
  const mismatchDrops = await commerceBffService.listDiscoveryDrops(null, {
    category: ["music"],
    medium: ["video"],
  });
  assert.ok(Array.isArray(mismatchDrops), "cross-filter mismatch should return array");
  assert.equal(mismatchDrops.length, 0, "no drops should match category=music + medium=video in seed");
});

test("proof: discovery search includes proofSignal on all results", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // Any filter-based search must still return full DiscoveryDrop with proofSignal
  const drops = await commerceBffService.listDiscoveryDrops(null, { category: ["video"] });
  assert.ok(drops.length > 0, "should find video drops");

  for (const drop of drops) {
    assert.ok(typeof drop.proofSignal === "object", `drop ${drop.id} must have proofSignal`);
    assert.ok(typeof drop.proofSignal.hasRightsMetadata === "boolean");
    assert.ok(typeof drop.proofSignal.isProofReady === "boolean");
    assert.ok(typeof drop.savedByViewer === "boolean");
    assert.ok(typeof drop.collectAvailable === "boolean");
  }
});
