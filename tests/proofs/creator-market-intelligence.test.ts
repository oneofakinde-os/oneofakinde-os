import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-cmi-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop() {
  const creatorBase = await commerceBffService.createSession({
    email: `cmi-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(creatorBase.accountId, {
    studioTitle: "Market Intel Studio",
    studioSynopsis: "for market intelligence testing",
  });
  const creator = studio!.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `cmi-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for market intelligence testing",
    defaultDropVisibility: "public",
  });

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Market Intel Drop",
    worldId: world!.id,
    synopsis: "for market intelligence testing",
    priceUsd: 2.99,
    visibility: "public",
  });
  await commerceBffService.upsertRightsMetadataForDrop(drop!.id, {
    licenseType: "personal-use-only",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true
  });
  await commerceBffService.upsertCreatorTerms(creator.accountId, drop!.id, {
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true
  });

  return { creator, drop: drop! };
}

test("proof: getCreatorMarketIntelligence returns null for non-creator accounts", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();

  const outsider = await commerceBffService.createSession({
    email: `cmi-outsider-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const intelligence = await commerceBffService.getCreatorMarketIntelligence(
    outsider.accountId,
    creator.handle
  );
  assert.equal(intelligence, null, "non-creator cannot access another studio's market intelligence");
});

test("proof: getCreatorMarketIntelligence includes collect and save counts per drop", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop();

  const collector = await commerceBffService.createSession({
    email: `cmi-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.purchaseDrop(collector.accountId, drop.id);
  await commerceBffService.addSavedIntent(collector.accountId, drop.id);

  const intelligence = await commerceBffService.getCreatorMarketIntelligence(
    creator.accountId,
    creator.handle
  );
  assert.ok(intelligence, "creator can access own market intelligence");
  assert.ok(Array.isArray(intelligence.drops), "drops is array");
  assert.ok(intelligence.drops.length > 0, "at least one drop listed");

  const dropEntry = intelligence.drops.find((d) => d.dropId === drop.id);
  assert.ok(dropEntry, "published drop appears in intelligence");
  assert.ok(dropEntry.collectCount >= 1, "collect count reflects purchase");
  assert.ok(dropEntry.savedIntentCount >= 1, "saved intent count reflects save");
});

test("proof: getCreatorMarketIntelligence includes follower and patron counts", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();

  const follower = await commerceBffService.createSession({
    email: `cmi-follower-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(follower.accountId, creator.handle);

  const intelligence = await commerceBffService.getCreatorMarketIntelligence(
    creator.accountId,
    creator.handle
  );
  assert.ok(intelligence, "intelligence returned");
  assert.ok(intelligence.followerCount >= 1, "follower count reflects follows");
  assert.equal(typeof intelligence.activePatronCount, "number", "activePatronCount is a number");
  assert.ok(typeof intelligence.measuredAt === "string", "measuredAt is a timestamp");
});

test("proof: market intelligence contains no resale/price speculation fields", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();

  const intelligence = await commerceBffService.getCreatorMarketIntelligence(
    creator.accountId,
    creator.handle
  );
  assert.ok(intelligence, "intelligence returned");

  const serialized = JSON.stringify(intelligence);
  const forbidden = [
    "resale_velocity",
    "price_appreciation",
    "market_cap",
    "speculation",
    "investment",
    "bid",
    "ask",
    "profit",
    "most_profitable",
    "top_value",
  ];
  for (const field of forbidden) {
    assert.ok(
      !serialized.includes(`"${field}"`),
      `market intelligence must not expose speculative field '${field}'`
    );
  }
});

test("proof: getCreatorMarketIntelligence returns null for unknown studio", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();

  const intelligence = await commerceBffService.getCreatorMarketIntelligence(
    creator.accountId,
    "nonexistent-studio"
  );
  assert.equal(intelligence, null, "unknown studio returns null");
});
