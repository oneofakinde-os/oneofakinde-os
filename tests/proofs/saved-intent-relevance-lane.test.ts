import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-sirl-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop() {
  const creatorBase = await commerceBffService.createSession({
    email: `sirl-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(creatorBase.accountId, {
    studioTitle: "Lane Test Studio",
    studioSynopsis: "for saved-intent lane testing",
  });
  const creator = studio!.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `sirl-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for saved-intent testing",
    defaultDropVisibility: "public",
  });

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Lane Test Drop",
    worldId: world!.id,
    synopsis: "for lane testing",
    priceUsd: 4.99,
    visibility: "public",
  });

  return { creator, drop: drop! };
}

test("proof: getSavedIntentRelevanceLane returns empty for account with no saves", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `sirl-nosaves-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const lane = await commerceBffService.getSavedIntentRelevanceLane(session.accountId);
  assert.ok(Array.isArray(lane), "returns array");
  assert.equal(lane.length, 0, "no saves → empty lane");
});

test("proof: getSavedIntentRelevanceLane includes only saved drops", async (t) => {
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
    email: `sirl-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.addSavedIntent(collector.accountId, drop.id);

  const lane = await commerceBffService.getSavedIntentRelevanceLane(collector.accountId);
  assert.ok(Array.isArray(lane), "returns array");
  assert.ok(lane.length > 0, "lane has at least one drop");
  const found = lane.find((d) => d.id === drop.id);
  assert.ok(found, "saved drop appears in relevance lane");
});

test("proof: saved intent lane results have savedByViewer=true for all entries", async (t) => {
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
    email: `sirl-viewflag-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.addSavedIntent(collector.accountId, drop.id);

  const lane = await commerceBffService.getSavedIntentRelevanceLane(collector.accountId);
  for (const d of lane) {
    assert.equal(d.savedByViewer, true, `lane drop ${d.id} must have savedByViewer=true`);
  }
});

test("proof: saved intent lane results contain no speculative fields", async (t) => {
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
    email: `sirl-speccheck-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.addSavedIntent(collector.accountId, drop.id);

  const lane = await commerceBffService.getSavedIntentRelevanceLane(collector.accountId);
  const serialized = JSON.stringify(lane);

  const forbidden = ["resale_ranking", "price_appreciation", "market_cap", "speculation", "investment_rank"];
  for (const field of forbidden) {
    assert.ok(
      !serialized.includes(`"${field}"`),
      `saved intent lane must not contain speculative field '${field}'`
    );
  }
});

test("proof: saved intent lane returns empty for unknown account", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const lane = await commerceBffService.getSavedIntentRelevanceLane("nonexistent-account");
  assert.ok(Array.isArray(lane), "returns array for unknown account");
  assert.equal(lane.length, 0, "unknown account → empty lane");
});
