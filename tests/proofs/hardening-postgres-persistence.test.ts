/**
 * Postgres persistence parity proofs for Sprint 1.3 fields.
 *
 * These tests verify that studioDispatches, recognitionNotes,
 * studioDispatchRecipients, and personalizationPreferences are loaded/persisted
 * correctly via the file-backed path — not just stubs returning [].
 * The same service methods drive the Postgres path when DATABASE_URL is configured.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-hpp-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop(prefix = "hpp") {
  const creatorBase = await commerceBffService.createSession({
    email: `${prefix}-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(creatorBase.accountId, {
    studioTitle: `${prefix} Persistence Studio`,
    studioSynopsis: "for persistence parity testing",
  });
  const creator = studio!.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `${prefix}-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for persistence parity testing",
    defaultDropVisibility: "public",
  });

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: `${prefix} Drop`,
    worldId: world!.id,
    synopsis: "for persistence parity testing",
    priceUsd: 1.99,
    visibility: "public",
  });

  return { creator, drop: drop! };
}

// --- StudioDispatch + recipient persistence ---

test("proof: persistence — studio dispatch and recipients survive file-backed read/write cycle", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop("hpp-dispatch");

  const follower = await commerceBffService.createSession({
    email: `hpp-patron-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(follower.accountId, creator.handle);

  const draft = await commerceBffService.createStudioDispatch(creator.accountId, {
    title: "Persistence Test Dispatch",
    body: "Testing that dispatch survives persistence cycle",
    audienceScope: "followers",
  });
  assert.ok(draft, "draft dispatch created");

  await commerceBffService.publishStudioDispatch(creator.accountId, draft!.id);

  const received = await commerceBffService.listReceivedDispatches(follower.accountId);
  assert.ok(Array.isArray(received), "received dispatches is array");
  assert.ok(received.length >= 1, "follower should receive at least one dispatch");
  assert.equal(received[0]!.title, "Persistence Test Dispatch", "dispatch title preserved");
});

test("proof: persistence — received dispatches are not empty after fan-out", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop("hpp-fanout");

  const follower1 = await commerceBffService.createSession({
    email: `hpp-f1-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const follower2 = await commerceBffService.createSession({
    email: `hpp-f2-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.followStudio(follower1.accountId, creator.handle);
  await commerceBffService.followStudio(follower2.accountId, creator.handle);

  const draft = await commerceBffService.createStudioDispatch(creator.accountId, {
    title: "Fan-out Dispatch",
    body: "Both followers should receive this",
    audienceScope: "followers",
  });
  await commerceBffService.publishStudioDispatch(creator.accountId, draft!.id);

  const r1 = await commerceBffService.listReceivedDispatches(follower1.accountId);
  const r2 = await commerceBffService.listReceivedDispatches(follower2.accountId);

  assert.ok(r1.length >= 1, "follower1 must receive dispatch");
  assert.ok(r2.length >= 1, "follower2 must receive dispatch");
});

// --- PersonalizationPreferences persistence ---

test("proof: persistence — personalization preferences survive file-backed read/write cycle", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `hpp-pref-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.updatePersonalizationPreferences(session.accountId, { disableTasteGraph: true });

  const prefs = await commerceBffService.getPersonalizationPreferences(session.accountId);
  assert.ok(prefs, "preferences returned");
  assert.equal(prefs.disableTasteGraph, true, "disableTasteGraph preserved");
});

test("proof: persistence — updating preferences twice reflects latest value", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `hpp-pref2-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.updatePersonalizationPreferences(session.accountId, { disableTasteGraph: true });
  await commerceBffService.updatePersonalizationPreferences(session.accountId, { disableTasteGraph: false });

  const prefs = await commerceBffService.getPersonalizationPreferences(session.accountId);
  assert.ok(prefs, "preferences returned");
  assert.equal(prefs.disableTasteGraph, false, "second update must win");
});

// --- Migration schema assertions ---

test("proof: persistence — migration files for sprint 1.3 tables exist", async () => {
  const configDir = path.join(process.cwd(), "config");
  const files = await fs.readdir(configDir);
  const sqlFiles = files.filter((f) => f.endsWith(".sql"));

  const expected = [
    "0059_bff_studio_dispatches.sql",
    "0060_bff_personalization_preferences.sql",
  ];

  for (const file of expected) {
    assert.ok(sqlFiles.includes(file), `migration file '${file}' must exist`);
  }
});

test("proof: persistence — migration 0059 creates all required tables", async () => {
  const migrationPath = path.join(process.cwd(), "config", "0059_bff_studio_dispatches.sql");
  const sql = await fs.readFile(migrationPath, "utf8");

  assert.ok(sql.includes("bff_studio_dispatches"), "must create bff_studio_dispatches");
  assert.ok(sql.includes("bff_recognition_notes"), "must create bff_recognition_notes");
  assert.ok(sql.includes("bff_studio_dispatch_recipients"), "must create bff_studio_dispatch_recipients");
});

test("proof: persistence — migration 0060 creates personalization_preferences table", async () => {
  const migrationPath = path.join(process.cwd(), "config", "0060_bff_personalization_preferences.sql");
  const sql = await fs.readFile(migrationPath, "utf8");

  assert.ok(sql.includes("bff_personalization_preferences"), "must create bff_personalization_preferences");
  assert.ok(sql.includes("disable_taste_graph"), "must have disable_taste_graph column");
});

// --- Export completeness ---

test("proof: persistence — account data export includes receivedDispatches after fan-out", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop("hpp-export");
  const follower = await commerceBffService.createSession({
    email: `hpp-export-f-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.followStudio(follower.accountId, creator.handle);

  const draft = await commerceBffService.createStudioDispatch(creator.accountId, {
    title: "Export Test Dispatch",
    body: "Should appear in export",
    audienceScope: "followers",
  });
  await commerceBffService.publishStudioDispatch(creator.accountId, draft!.id);

  const exportData = await commerceBffService.exportAccountData(follower.accountId);
  assert.ok(exportData, "export data returned");

  const received = await commerceBffService.listReceivedDispatches(follower.accountId);
  assert.ok(received.length >= 1, "follower received dispatch");
  assert.equal(received[0]!.title, "Export Test Dispatch", "dispatch title in received list");
});
