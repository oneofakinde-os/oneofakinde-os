import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import { FORBIDDEN_FILTER_KEYS } from "../../lib/domain/discovery";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-dfi-${randomUUID()}.json`);
}

test("proof: discovery category filter returns only drops with matching category", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // Seeded: stardust (video) and through-the-lens (video) are both public + rights
  const videoDrops = await commerceBffService.listDiscoveryDrops(null, { category: ["video"] });
  for (const drop of videoDrops) {
    assert.equal(drop.category, "video", "category filter should only return video drops");
  }

  // Music filter should return no public market-ready drops (twilight-whispers is world_members)
  const musicDrops = await commerceBffService.listDiscoveryDrops(null, { category: ["music"] });
  assert.ok(Array.isArray(musicDrops), "music filter should return array");
});

test("proof: discovery medium filter returns only drops with matching medium", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const drops = await commerceBffService.listDiscoveryDrops(null, { medium: ["video"] });
  for (const drop of drops) {
    assert.equal(drop.medium, "video", "medium filter must only return video drops");
  }
});

test("proof: discovery dropType filter returns only drops with matching type", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // available_now filter on public drops
  const drops = await commerceBffService.listDiscoveryDrops(null, { dropType: ["available_now"] });
  assert.ok(Array.isArray(drops), "dropType filter should return array");
  // All returned drops must be released (not upcoming)
  for (const drop of drops) {
    if (drop.releaseAt) {
      assert.ok(new Date(drop.releaseAt) <= new Date(), "available_now drops must already be released");
    }
  }
});

test("proof: discovery proof-ready filter excludes proof-incomplete drops", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const drops = await commerceBffService.listDiscoveryDrops(null, { proofReady: true });
  for (const drop of drops) {
    assert.equal(
      drop.proofSignal.isProofReady,
      true,
      `drop ${drop.id} in proof-ready filter must have isProofReady=true`
    );
  }

  // Stardust (rights + verified cert) should appear; through-the-lens (rights only) should not
  const stardust = drops.find((d) => d.id === "stardust");
  assert.ok(stardust, "stardust with verified cert should appear in proof-ready filter");

  const ttl = drops.find((d) => d.id === "through-the-lens");
  assert.equal(ttl, undefined, "through-the-lens without cert should be excluded from proof-ready filter");
});

test("proof: followed-studios filter respects relationship state", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const collectorSession = await commerceBffService.createSession({
    email: `dfi-follow-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Without following any studio, followedStudiosOnly should return nothing
  const noFollowDrops = await commerceBffService.listDiscoveryDrops(collectorSession.accountId, {
    followedStudiosOnly: true,
  });
  assert.equal(noFollowDrops.length, 0, "should return no drops before following any studio");

  // Follow oneofakinde studio
  await commerceBffService.followStudio(collectorSession.accountId, "oneofakinde");

  const followedDrops = await commerceBffService.listDiscoveryDrops(collectorSession.accountId, {
    followedStudiosOnly: true,
  });
  assert.ok(followedDrops.length > 0, "should return drops from followed studio");
  for (const drop of followedDrops) {
    assert.equal(drop.isFollowingStudio, true, "all returned drops must be from a followed studio");
  }
});

test("proof: saved-before filter respects current collector saved intent state", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const collectorSession = await commerceBffService.createSession({
    email: `dfi-save-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const noSavedDrops = await commerceBffService.listDiscoveryDrops(collectorSession.accountId, {
    savedBeforeOnly: true,
  });
  assert.equal(noSavedDrops.length, 0, "should return no drops before saving any");

  await commerceBffService.addSavedIntent(collectorSession.accountId, "stardust");

  const savedDrops = await commerceBffService.listDiscoveryDrops(collectorSession.accountId, {
    savedBeforeOnly: true,
  });
  assert.ok(savedDrops.length > 0, "should return saved drops after saving");
  for (const drop of savedDrops) {
    assert.equal(drop.savedByViewer, true, "all returned drops must be saved by viewer");
  }
});

test("proof: price filter excludes drops above price threshold", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  // stardust is $1.99, through-the-lens is $12
  const cheapDrops = await commerceBffService.listDiscoveryDrops(null, { priceMaxUsd: 2.0 });
  for (const drop of cheapDrops) {
    assert.ok(drop.priceUsd <= 2.0, `drop ${drop.id} priceUsd=${drop.priceUsd} must be within priceMaxUsd=2.0`);
  }

  const stardust = cheapDrops.find((d) => d.id === "stardust");
  assert.ok(stardust, "stardust ($1.99) should appear under $2 filter");

  const ttl = cheapDrops.find((d) => d.id === "through-the-lens");
  assert.equal(ttl, undefined, "through-the-lens ($12) must be excluded from $2 filter");
});

test("proof: FORBIDDEN_FILTER_KEYS contains all speculative filter names", () => {
  const expectedForbidden = [
    "most_resold",
    "resale_ranking",
    "resale_velocity",
    "market_cap",
    "top_value",
    "bid",
    "ask",
    "order_book",
    "speculation",
    "resale_count",
    "price_appreciation",
  ];

  for (const key of expectedForbidden) {
    assert.ok(
      FORBIDDEN_FILTER_KEYS.has(key),
      `FORBIDDEN_FILTER_KEYS must contain '${key}'`
    );
  }
});
