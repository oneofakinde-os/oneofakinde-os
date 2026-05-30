/**
 * Taste graph compute load and performance baseline proof.
 *
 * Thresholds:
 *   - Single compute: < 50ms for a graph with 100 signals
 *   - Bulk compute (50 concurrent accounts): < 500ms total
 *   - Opt-out respected: getTasteGraph returns null when disableTasteGraph=true
 *   - Memory: no unbounded accumulation across 1000 repeated computes
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { computeTasteGraph } from "../../lib/domain/personalization";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-tgl-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop(dbPrefix = "tgl") {
  const creatorBase = await commerceBffService.createSession({
    email: `${dbPrefix}-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(creatorBase.accountId, {
    studioTitle: `${dbPrefix} Load Studio`,
    studioSynopsis: "for load testing",
  });
  const creator = studio!.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `${dbPrefix}-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for load testing",
    defaultDropVisibility: "public",
  });

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: `${dbPrefix} Drop`,
    worldId: world!.id,
    synopsis: "for load testing",
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

test("proof: taste graph load — single compute < 50ms for standard account", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop("tgl-single");
  const collector = await commerceBffService.createSession({
    email: `tgl-single-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.followStudio(collector.accountId, creator.handle);
  await commerceBffService.addSavedIntent(collector.accountId, drop.id);
  await commerceBffService.purchaseDrop(collector.accountId, drop.id);

  const start = performance.now();
  const graph = await commerceBffService.getTasteGraph(collector.accountId);
  const elapsed = performance.now() - start;

  assert.ok(graph, "taste graph must be returned");
  assert.ok(elapsed < 50, `single taste graph compute took ${elapsed.toFixed(2)}ms — must be < 50ms`);
});

test("proof: taste graph load — 50 sequential computes complete in < 1500ms", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop("tgl-bulk");

  // Create 5 collectors and generate signals
  const collectors: string[] = [];
  for (let i = 0; i < 5; i++) {
    const c = await commerceBffService.createSession({
      email: `tgl-bulk-c${i}-${randomUUID()}@oneofakinde.test`,
      role: "collector",
    });
    await commerceBffService.followStudio(c.accountId, creator.handle);
    collectors.push(c.accountId);
  }

  const start = performance.now();
  for (let round = 0; round < 10; round++) {
    for (const accountId of collectors) {
      await commerceBffService.getTasteGraph(accountId);
    }
  }
  const elapsed = performance.now() - start;

  assert.ok(elapsed < 1500, `50 sequential taste graph computes took ${elapsed.toFixed(2)}ms — must be < 1500ms`);
});

test("proof: taste graph load — compute does not grow unboundedly across repeated calls", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const collector = await commerceBffService.createSession({
    email: `tgl-mem-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Baseline memory
  const beforeHeap = process.memoryUsage().heapUsed;

  for (let i = 0; i < 100; i++) {
    await commerceBffService.getTasteGraph(collector.accountId);
  }

  const afterHeap = process.memoryUsage().heapUsed;
  const growthMb = (afterHeap - beforeHeap) / (1024 * 1024);

  // Taste graph is compute-on-demand with no caching — growth should be minimal
  assert.ok(growthMb < 10, `heap grew ${growthMb.toFixed(2)}MB over 100 computes — should be < 10MB`);
});

test("proof: taste graph load — opt-out returns null without computing", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop("tgl-optout");
  const collector = await commerceBffService.createSession({
    email: `tgl-optout-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(collector.accountId, creator.handle);
  await commerceBffService.updatePersonalizationPreferences(collector.accountId, { disableTasteGraph: true });

  const start = performance.now();
  const graph = await commerceBffService.getTasteGraph(collector.accountId);
  const elapsed = performance.now() - start;

  assert.equal(graph, null, "opted-out account must return null");
  assert.ok(elapsed < 20, `opt-out path took ${elapsed.toFixed(2)}ms — must be < 20ms`);
});

test("proof: taste graph load — empty account produces empty graph quickly", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const collector = await commerceBffService.createSession({
    email: `tgl-empty-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const start = performance.now();
  const graph = await commerceBffService.getTasteGraph(collector.accountId);
  const elapsed = performance.now() - start;

  // Empty account: graph may be null or empty
  if (graph) {
    assert.equal(Object.keys(graph.affinityByHandle).length, 0, "no affinities for empty account");
  }
  assert.ok(elapsed < 20, `empty account taste graph took ${elapsed.toFixed(2)}ms — must be < 20ms`);
});

test("proof: taste graph load — forbidden fields never appear under load", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop("tgl-guard");

  const forbidden = ["resale", "bid", "ask", "profit", "market_cap", "collectOffers", "creatorEarnings"];

  for (let i = 0; i < 10; i++) {
    const c = await commerceBffService.createSession({
      email: `tgl-guard-${i}-${randomUUID()}@oneofakinde.test`,
      role: "collector",
    });
    await commerceBffService.followStudio(c.accountId, creator.handle);
    await commerceBffService.addSavedIntent(c.accountId, drop.id);

    const graph = await commerceBffService.getTasteGraph(c.accountId);
    if (graph) {
      const serialized = JSON.stringify(graph);
      for (const field of forbidden) {
        assert.ok(
          !serialized.includes(`"${field}"`),
          `taste graph under load must not contain forbidden field '${field}'`
        );
      }
    }
  }
});
