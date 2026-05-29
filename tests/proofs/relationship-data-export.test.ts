import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-rde-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop() {
  const base = await commerceBffService.createSession({
    email: `rde-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Export Test Studio",
    studioSynopsis: "for export testing",
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `exp-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for export testing",
    defaultDropVisibility: "public",
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Export Drop",
    worldId: world.id,
    synopsis: "for export testing",
    priceUsd: 1.99,
    visibility: "public",
  });
  assert.ok(drop, "drop created");
  return { creator, drop };
}

test("proof: exportAccountData includes studioDispatches created by creator", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator } = await bootstrapCreatorWithDrop();

  await commerceBffService.createStudioDispatch(creator.accountId, {
    audienceScope: "followers",
    title: "Export test dispatch",
    body: "This dispatch should appear in the export.",
  });

  const exported = await commerceBffService.exportAccountData(creator.accountId);
  assert.ok(exported, "export returned");
  assert.ok(Array.isArray(exported.studioDispatches), "studioDispatches is array");
  assert.ok(exported.studioDispatches.length > 0, "studioDispatches includes created dispatch");
  assert.equal(
    exported.studioDispatches[0].studioHandle,
    creator.handle,
    "exported dispatch belongs to creator's studio"
  );
});

test("proof: exportAccountData includes recognitionNotes for creator", async (t) => {
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
    email: `rde-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const receipt = await commerceBffService.purchaseDrop(collector.accountId, drop.id);
  assert.ok(receipt, "receipt created");

  await commerceBffService.createRecognitionNote(creator.accountId, {
    receiptId: receipt.id,
    note: "Grateful you collected this early piece.",
  });

  const creatorExport = await commerceBffService.exportAccountData(creator.accountId);
  assert.ok(creatorExport, "creator export returned");
  assert.ok(Array.isArray(creatorExport.recognitionNotes), "recognitionNotes is array");
  assert.ok(creatorExport.recognitionNotes.length > 0, "creator export includes recognition notes");
  assert.equal(creatorExport.recognitionNotes[0].creatorAccountId, creator.accountId);

  // Collector export also includes the note they received
  const collectorExport = await commerceBffService.exportAccountData(collector.accountId);
  assert.ok(collectorExport, "collector export returned");
  assert.ok(Array.isArray(collectorExport.recognitionNotes), "recognitionNotes is array in collector export");
  assert.ok(collectorExport.recognitionNotes.length > 0, "collector export includes recognition notes");
  assert.equal(collectorExport.recognitionNotes[0].collectorAccountId, collector.accountId);
});

test("proof: exportAccountData includes notificationPreferences with mutedTypes", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `rde-prefs-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.updateNotificationPreferences(session.accountId, {
    mutedTypes: ["studio_dispatch", "proof_update"],
  });

  const exported = await commerceBffService.exportAccountData(session.accountId);
  assert.ok(exported, "export returned");
  assert.ok(exported.notificationPreferences, "notificationPreferences present in export");
  assert.equal(exported.notificationPreferences.accountId, session.accountId);
  assert.ok(
    exported.notificationPreferences.mutedTypes.includes("studio_dispatch"),
    "export must include muted studio_dispatch"
  );
  assert.ok(
    exported.notificationPreferences.mutedTypes.includes("proof_update"),
    "export must include muted proof_update"
  );
});
