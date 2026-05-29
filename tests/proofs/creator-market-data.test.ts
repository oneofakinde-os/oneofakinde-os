import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-cmd-${randomUUID()}.json`);
}

test("proof: creator market data is only accessible by the studio owner", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creatorSession = await commerceBffService.createSession({
    email: `cmd-creator-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });

  const collectorSession = await commerceBffService.createSession({
    email: `cmd-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Owner can access their own market data
  const ownerData = await commerceBffService.getCreatorMarketData(
    creatorSession.accountId,
    creatorSession.handle
  );
  assert.ok(ownerData !== null, "studio owner must be able to access their market data");
  assert.equal(ownerData.studioHandle, creatorSession.handle);

  // Collector cannot access creator's market data
  const collectorAttempt = await commerceBffService.getCreatorMarketData(
    collectorSession.accountId,
    creatorSession.handle
  );
  assert.equal(collectorAttempt, null, "non-owner must receive null for creator market data");
});

test("proof: creator market data returns savedIntentCount and collectCount per drop", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const baseSession = await commerceBffService.createSession({
    email: `cmd-creator2-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studioResult = await commerceBffService.setupCreatorStudio(baseSession.accountId, {
    studioTitle: "Market Data Studio",
    studioSynopsis: "for market data testing",
  });
  assert.ok(studioResult, "studio created");
  const creatorSession = studioResult.session;

  const collectorSession = await commerceBffService.createSession({
    email: `cmd-collector2-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const world = await commerceBffService.createWorld(creatorSession.accountId, {
    title: "market data world",
    synopsis: "for market data testing",
    defaultDropVisibility: "public",
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creatorSession.accountId, {
    title: "market data drop",
    worldId: world.id,
    synopsis: "test drop for market data",
    priceUsd: 5.00,
    visibility: "public",
  });
  assert.ok(drop, "drop created");

  // Collector saves the drop
  await commerceBffService.addSavedIntent(collectorSession.accountId, drop.id);

  const marketData = await commerceBffService.getCreatorMarketData(
    creatorSession.accountId,
    creatorSession.handle
  );
  assert.ok(marketData, "market data must be returned");

  const dropData = marketData.drops.find((d) => d.dropId === drop.id);
  assert.ok(dropData, "market data must include newly created drop");
  assert.equal(dropData.savedIntentCount, 1, "savedIntentCount must reflect the collector save");
  assert.equal(dropData.collectCount, 0, "collectCount must be 0 (no completed purchases)");
  assert.ok(typeof dropData.title === "string");
  assert.ok(typeof dropData.rightsComplete === "boolean");
  assert.ok(typeof dropData.openGovernanceCaseCount === "number");
});

test("proof: creator market data does not expose resale price or earnings leaderboard", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creatorSession = await commerceBffService.createSession({
    email: `cmd-creator3-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });

  const marketData = await commerceBffService.getCreatorMarketData(
    creatorSession.accountId,
    creatorSession.handle
  );
  assert.ok(marketData, "market data returned");

  const FORBIDDEN_FIELDS = [
    "totalEarnings",
    "grossRevenue",
    "resaleVolume",
    "resaleCount",
    "resaleVelocity",
    "marketCap",
    "priceAppreciation",
    "topResaleValue",
  ];

  for (const field of FORBIDDEN_FIELDS) {
    assert.ok(!(field in marketData), `CreatorMarketDataSummary must not expose '${field}'`);
    for (const drop of marketData.drops) {
      assert.ok(!(field in drop), `Drop market data must not expose '${field}'`);
    }
  }
});

test("proof: creator cannot access another creator's market data", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const creatorA = await commerceBffService.createSession({
    email: `cmd-creatorA-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });

  const creatorB = await commerceBffService.createSession({
    email: `cmd-creatorB-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });

  // creatorA tries to access creatorB's market data — must be blocked
  const attempt = await commerceBffService.getCreatorMarketData(creatorA.accountId, creatorB.handle);
  assert.equal(attempt, null, "creator must not access another creator's market data");

  // creatorB can access their own
  const ownData = await commerceBffService.getCreatorMarketData(creatorB.accountId, creatorB.handle);
  assert.ok(ownData !== null, "creator must be able to access their own market data");
  assert.equal(ownData.studioHandle, creatorB.handle);
});
