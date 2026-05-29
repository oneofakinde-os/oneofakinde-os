import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-cr-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop() {
  const base = await commerceBffService.createSession({
    email: `cr-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Recognition Studio",
    studioSynopsis: "for recognition testing",
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `recog-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for recognition testing",
    defaultDropVisibility: "public",
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Recognition Drop",
    worldId: world.id,
    synopsis: "for recognition testing",
    priceUsd: 2.99,
    visibility: "public",
  });
  assert.ok(drop, "drop created");
  return { creator, drop };
}

test("proof: creator can leave a recognition note for a collector", async (t) => {
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
    email: `cr-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const receipt = await commerceBffService.purchaseDrop(collector.accountId, drop.id);
  assert.ok(receipt, "receipt created");

  const note = await commerceBffService.createRecognitionNote(creator.accountId, {
    receiptId: receipt.id,
    note: "Thank you for collecting this piece. It means a great deal.",
    isPublic: false,
  });
  assert.ok(note, "recognition note created");
  assert.equal(note.creatorAccountId, creator.accountId);
  assert.equal(note.collectorAccountId, collector.accountId);
  assert.equal(note.isPublic, false, "note is private by default");
  assert.equal(note.receiptId, receipt.id);
});

test("proof: recognition note with prohibited language is rejected", async (t) => {
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
    email: `cr-collector2-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const receipt = await commerceBffService.purchaseDrop(collector.accountId, drop.id);
  assert.ok(receipt, "receipt created");

  // Each of these should be blocked by validateRecognitionNoteText
  const prohibited = [
    "Great investment opportunity here.",
    "You can resale this for a profit.",
    "This will flip at higher value.",
    "Market cap is increasing.",
  ];

  for (const badNote of prohibited) {
    const result = await commerceBffService.createRecognitionNote(creator.accountId, {
      receiptId: receipt.id,
      note: badNote,
    });
    assert.equal(result, null, `prohibited recognition note must be rejected: "${badNote}"`);
  }
});

test("proof: non-creator cannot leave a recognition note", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop();

  const collectorA = await commerceBffService.createSession({
    email: `cr-collectora-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const receipt = await commerceBffService.purchaseDrop(collectorA.accountId, drop.id);
  assert.ok(receipt, "receipt created");

  const collectorB = await commerceBffService.createSession({
    email: `cr-collectorb-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // collectorB tries to leave a recognition note — should fail (not a creator)
  const result = await commerceBffService.createRecognitionNote(collectorB.accountId, {
    receiptId: receipt.id,
    note: "Great piece you collected.",
  });
  assert.equal(result, null, "non-creator must not be able to leave a recognition note");
});

test("proof: recognition note emits creator_recognition notification and respects mute", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop();

  // Notified collector
  const collectorA = await commerceBffService.createSession({
    email: `cr-notified-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const receiptA = await commerceBffService.purchaseDrop(collectorA.accountId, drop.id);
  assert.ok(receiptA, "receiptA created");

  await commerceBffService.createRecognitionNote(creator.accountId, {
    receiptId: receiptA.id,
    note: "Grateful you collected this early work.",
  });

  const feedA = await commerceBffService.getNotificationFeed(collectorA.accountId);
  const notifA = feedA.entries.some((e) => e.type === "creator_recognition");
  assert.ok(notifA, "collector must receive creator_recognition notification");

  // Muted collector
  const collectorB = await commerceBffService.createSession({
    email: `cr-muted-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const receiptB = await commerceBffService.purchaseDrop(collectorB.accountId, drop.id);
  assert.ok(receiptB, "receiptB created");

  await commerceBffService.updateNotificationPreferences(collectorB.accountId, {
    mutedTypes: ["creator_recognition"],
  });

  await commerceBffService.createRecognitionNote(creator.accountId, {
    receiptId: receiptB.id,
    note: "This piece is part of a meaningful series.",
  });

  const feedB = await commerceBffService.getNotificationFeed(collectorB.accountId);
  const notifB = feedB.entries.some((e) => e.type === "creator_recognition");
  assert.equal(notifB, false, "muted collector must not receive creator_recognition notification");
});
