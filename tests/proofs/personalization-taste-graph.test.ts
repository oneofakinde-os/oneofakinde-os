import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-ptg-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop() {
  const creatorBase = await commerceBffService.createSession({
    email: `ptg-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(creatorBase.accountId, {
    studioTitle: "Taste Graph Studio",
    studioSynopsis: "for taste graph testing",
  });
  const creator = studio!.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `ptg-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for taste testing",
    defaultDropVisibility: "public",
  });

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Taste Test Drop",
    worldId: world!.id,
    synopsis: "for taste graph testing",
    priceUsd: 1.99,
    visibility: "public",
  });
  assert.ok(drop, "drop created");

  // Add rights metadata so drop is market-ready and appears in discovery
  await commerceBffService.upsertRightsMetadataForDrop(drop.id, {
    licenseType: "personal-use-only",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });

  return { creator, drop };
}

test("proof: getTasteGraph returns null for unknown account", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const result = await commerceBffService.getTasteGraph("nonexistent-account-id");
  assert.equal(result, null, "unknown account returns null taste graph");
});

test("proof: getTasteGraph reflects follow signal", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();
  const collector = await commerceBffService.createSession({
    email: `ptg-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.followStudio(collector.accountId, creator.handle);

  const graph = await commerceBffService.getTasteGraph(collector.accountId);
  assert.ok(graph, "graph returned");
  assert.ok(graph.affinityByHandle[creator.handle] > 0, "follow boosts studio affinity");
});

test("proof: getTasteGraph reflects collect signal with higher weight than follow", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop();

  const followerOnly = await commerceBffService.createSession({
    email: `ptg-follower-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(followerOnly.accountId, creator.handle);

  const collector = await commerceBffService.createSession({
    email: `ptg-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.purchaseDrop(collector.accountId, drop.id);

  const followerGraph = await commerceBffService.getTasteGraph(followerOnly.accountId);
  const collectorGraph = await commerceBffService.getTasteGraph(collector.accountId);

  assert.ok(followerGraph, "follower graph returned");
  assert.ok(collectorGraph, "collector graph returned");
  assert.ok(
    (collectorGraph.affinityByHandle[creator.handle] ?? 0) >
      (followerGraph.affinityByHandle[creator.handle] ?? 0),
    "collect has higher affinity weight than follow alone"
  );
});

test("proof: disableTasteGraph=true causes getTasteGraph to return null", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();
  const collector = await commerceBffService.createSession({
    email: `ptg-optout-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(collector.accountId, creator.handle);

  // Verify graph exists before opt-out
  const beforeGraph = await commerceBffService.getTasteGraph(collector.accountId);
  assert.ok(beforeGraph, "graph exists before opt-out");

  // Opt out
  await commerceBffService.updatePersonalizationPreferences(collector.accountId, {
    disableTasteGraph: true,
  });

  const afterGraph = await commerceBffService.getTasteGraph(collector.accountId);
  assert.equal(afterGraph, null, "graph is null after opt-out");
});

test("proof: re-enabling taste graph (disableTasteGraph=false) restores graph computation", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();
  const collector = await commerceBffService.createSession({
    email: `ptg-reopt-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(collector.accountId, creator.handle);

  await commerceBffService.updatePersonalizationPreferences(collector.accountId, {
    disableTasteGraph: true,
  });
  assert.equal(
    await commerceBffService.getTasteGraph(collector.accountId),
    null,
    "disabled: null"
  );

  await commerceBffService.updatePersonalizationPreferences(collector.accountId, {
    disableTasteGraph: false,
  });
  const restored = await commerceBffService.getTasteGraph(collector.accountId);
  assert.ok(restored, "re-enabled: graph restored");
  assert.ok(restored.affinityByHandle[creator.handle] > 0, "affinity data intact after re-enable");
});

test("proof: taste graph contains no speculative or investment fields", async (t) => {
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
    email: `ptg-speccheck-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.purchaseDrop(collector.accountId, drop.id);
  await commerceBffService.followStudio(collector.accountId, creator.handle);

  const graph = await commerceBffService.getTasteGraph(collector.accountId);
  assert.ok(graph, "graph returned");

  const serialized = JSON.stringify(graph);
  const forbidden = [
    "resale",
    "price_appreciation",
    "market_cap",
    "speculation",
    "investment",
    "bid",
    "ask",
    "profit",
    "collectOffers",
    "creatorEarnings",
  ];
  for (const field of forbidden) {
    assert.ok(
      !serialized.includes(`"${field}"`),
      `taste graph must not contain speculative field '${field}'`
    );
  }
});

test("proof: rankDiscoveryDrops attaches recommendationReason to each result", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();
  const collector = await commerceBffService.createSession({
    email: `ptg-reason-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(collector.accountId, creator.handle);

  const drops = await commerceBffService.listDiscoveryDrops(collector.accountId, {});
  assert.ok(Array.isArray(drops), "listDiscoveryDrops returns array");

  for (const drop of drops) {
    assert.ok(
      drop.recommendationReason !== undefined,
      `every ranked drop must have a recommendationReason (drop ${drop.id} is missing it)`
    );
  }
});

test("proof: followed_studio reason appears for drops from followed studios", async (t) => {
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
    email: `ptg-followed-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(collector.accountId, creator.handle);

  const drops = await commerceBffService.listDiscoveryDrops(collector.accountId, {});
  const targetDrop = drops.find((d) => d.id === drop.id);
  assert.ok(targetDrop, "creator's drop appears in discovery");
  assert.equal(
    targetDrop.recommendationReason,
    "followed_studio",
    "drop from followed studio has reason=followed_studio"
  );
});

test("proof: patron_studio reason takes priority over followed_studio", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop();

  // Get creator's worlds for the patron tier config
  const allWorlds = await commerceBffService.listWorlds();
  const creatorWorlds = allWorlds.filter((w) => w.studioHandle === creator.handle);
  assert.ok(creatorWorlds.length > 0, "creator has worlds");

  const collector = await commerceBffService.createSession({
    email: `ptg-patron-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Follow AND become patron
  await commerceBffService.followStudio(collector.accountId, creator.handle);

  // Create patron tier config and commit
  await commerceBffService.upsertWorkshopPatronTierConfig(creator.accountId, {
    worldId: creatorWorlds[0].id,
    title: "Supporter",
    amountCents: 500,
    commitmentCadence: "monthly",
    periodDays: 30,
    earlyAccessWindowHours: 24,
    benefitsSummary: "Early access",
    status: "active",
  });

  await commerceBffService.commitPatron(collector.accountId, creator.handle);

  const drops = await commerceBffService.listDiscoveryDrops(collector.accountId, {});
  const targetDrop = drops.find((d) => d.id === drop.id);
  assert.ok(targetDrop, "creator's drop appears in discovery");
  assert.equal(
    targetDrop.recommendationReason,
    "patron_studio",
    "patron_studio reason takes priority over followed_studio"
  );
});

test("proof: getPersonalizationPreferences returns defaults when not set", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `ptg-defaults-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const prefs = await commerceBffService.getPersonalizationPreferences(session.accountId);
  assert.ok(prefs, "preferences returned");
  assert.equal(prefs.accountId, session.accountId);
  assert.equal(prefs.disableTasteGraph, false, "taste graph enabled by default");
});

test("proof: taste graph uses no resale or price signals in ranking", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();
  const collector = await commerceBffService.createSession({
    email: `ptg-nosale-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(collector.accountId, creator.handle);

  const drops = await commerceBffService.listDiscoveryDrops(collector.accountId, {});
  const serialized = JSON.stringify(drops);

  // Speculative fields that must not appear in discovery results
  const speculative = [
    "resale_ranking",
    "price_appreciation",
    "investment_rank",
    "market_value_leaderboard",
    "most_profitable",
  ];
  for (const field of speculative) {
    assert.ok(
      !serialized.includes(`"${field}"`),
      `discovery results must not expose speculative field '${field}'`
    );
  }
});
