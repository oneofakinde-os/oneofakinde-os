import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import { FORBIDDEN_FILTER_KEYS } from "../../lib/domain/discovery";
import { checkPersonalizationDrift, computeTasteGraph } from "../../lib/domain/personalization";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-pg-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop() {
  const creatorBase = await commerceBffService.createSession({
    email: `pg-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(creatorBase.accountId, {
    studioTitle: "Guardrail Studio",
    studioSynopsis: "for personalization guardrail testing",
  });
  const creator = studio!.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `pg-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for guardrail testing",
    defaultDropVisibility: "public",
  });

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Guardrail Drop",
    worldId: world!.id,
    synopsis: "for guardrail testing",
    priceUsd: 1.99,
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

test("proof: FORBIDDEN_FILTER_KEYS never shrinks — all original anti-speculation keys remain blocked", () => {
  const originallyForbidden = [
    "most_resold",
    "resale_ranking",
    "resale_velocity",
    "market_cap",
    "top_value",
    "highest_resale_gain",
    "fastest_price_increase",
    "bid",
    "ask",
    "order_book",
    "speculation",
    "investment_rank",
    "market_value_leaderboard",
    "most_profitable",
    "top_value_collector",
    "resale_count",
    "price_appreciation",
  ];
  for (const key of originallyForbidden) {
    assert.ok(
      FORBIDDEN_FILTER_KEYS.has(key),
      `FORBIDDEN_FILTER_KEYS must still block '${key}' — this set must only grow`
    );
  }
  assert.ok(
    FORBIDDEN_FILTER_KEYS.size >= originallyForbidden.length,
    "FORBIDDEN_FILTER_KEYS size must be at least the original count"
  );
});

test("proof: checkPersonalizationDrift detects speculative fields injected into results", async (t) => {
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
    email: `pg-driftcheck-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.addSavedIntent(collector.accountId, drop.id);

  const cleanResults = await commerceBffService.listDiscoveryDrops(collector.accountId, {});

  const drift = checkPersonalizationDrift(cleanResults);
  assert.equal(drift.hasSpeculativeField, false, "clean results have no speculative drift");
  assert.equal(drift.offendingFields.length, 0, "no offending fields in clean results");

  // Inject a speculative field and verify detection
  const poisoned = cleanResults.map((d) => ({
    ...d,
    speculation: "highest_return_holder",
  })) as Parameters<typeof checkPersonalizationDrift>[0];

  const poisonedDrift = checkPersonalizationDrift(poisoned);
  assert.equal(poisonedDrift.hasSpeculativeField, true, "drift detector catches injected speculation field");
});

test("proof: speculationSignalCount is always 0 in discovery drift metrics", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const metrics = await commerceBffService.getDiscoveryDriftMetrics();
  assert.ok(metrics, "drift metrics returned");
  assert.equal(
    metrics.speculationSignalCount,
    0,
    "speculationSignalCount must always be 0 — hardcoded constitutional guardrail"
  );
});

test("proof: computeTasteGraph does not read resale, bid, ask, or investment data", async (t) => {
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
    email: `pg-tastecheck-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.purchaseDrop(collector.accountId, drop.id);

  // Load the database snapshot and verify computeTasteGraph only reads allowed signals
  // by checking output has no speculative keys
  const graph = await commerceBffService.getTasteGraph(collector.accountId);
  assert.ok(graph, "taste graph returned");

  const graphJson = JSON.stringify(graph);
  const forbidden = ["collectOffers", "creatorEarnings", "resale", "bid", "ask", "profit", "market_cap"];
  for (const field of forbidden) {
    assert.ok(
      !graphJson.includes(`"${field}"`),
      `taste graph output must not reference '${field}'`
    );
  }
});

test("proof: discovery results never expose collectOffers or creatorEarnings to collector", async (t) => {
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
    email: `pg-disccheck-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const drops = await commerceBffService.listDiscoveryDrops(collector.accountId, {});
  const serialized = JSON.stringify(drops);

  assert.ok(!serialized.includes('"collectOffers"'), "discovery must not expose collectOffers");
  assert.ok(!serialized.includes('"creatorEarnings"'), "discovery must not expose creatorEarnings");
});

test("proof: taste graph affinityByHandle does not cross account boundaries", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop();

  const collector1 = await commerceBffService.createSession({
    email: `pg-ac1-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const collector2 = await commerceBffService.createSession({
    email: `pg-ac2-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // collector1 follows creator, collector2 does not
  await commerceBffService.followStudio(collector1.accountId, creator.handle);

  const graph1 = await commerceBffService.getTasteGraph(collector1.accountId);
  const graph2 = await commerceBffService.getTasteGraph(collector2.accountId);

  assert.ok(graph1, "collector1 graph returned");
  assert.ok(graph2, "collector2 graph returned");

  const c1Affinity = graph1.affinityByHandle[creator.handle] ?? 0;
  const c2Affinity = graph2.affinityByHandle[creator.handle] ?? 0;

  assert.ok(c1Affinity > 0, "collector1 has affinity from follow");
  assert.equal(c2Affinity, 0, "collector2 has no affinity — no cross-account leakage");
});

test("proof: personalization route requires authentication", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { GET } = await import("../../app/api/v1/settings/personalization/route");
  const req = new Request("http://localhost/api/v1/settings/personalization");
  const res = await GET(req);
  assert.equal(res.status, 401, "unauthenticated request to personalization route must return 401");
});

test("proof: saved-intent lane route requires authentication", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { GET } = await import("../../app/api/v1/saves/lane/route");
  const req = new Request("http://localhost/api/v1/saves/lane");
  const res = await GET(req);
  assert.equal(res.status, 401, "unauthenticated request to saves lane route must return 401");
});

test("proof: received dispatches route requires authentication", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { GET } = await import("../../app/api/v1/studio/dispatches/received/route");
  const req = new Request("http://localhost/api/v1/studio/dispatches/received");
  const res = await GET(req);
  assert.equal(res.status, 401, "unauthenticated request to received dispatches route must return 401");
});

test("proof: market intelligence route requires authentication", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { GET } = await import("../../app/api/v1/studio/market-intelligence/route");
  const req = new Request("http://localhost/api/v1/studio/market-intelligence");
  const res = await GET(req);
  assert.equal(res.status, 401, "unauthenticated request to market intelligence route must return 401");
});
