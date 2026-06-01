import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-pun-${randomUUID()}.json`);
}

test("proof: certificate flagged for review emits certificate_status_update notification to holder", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    delete process.env.OOK_MODERATOR_ACCOUNT_IDS;
    await fs.rm(dbPath, { force: true });
  });

  const base = await commerceBffService.createSession({
    email: `pun-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Proof Update Studio",
    studioSynopsis: "for proof update testing",
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `proof-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for proof update testing",
    defaultDropVisibility: "public",
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Proof Drop",
    worldId: world.id,
    synopsis: "for proof update testing",
    priceUsd: 1.99,
    visibility: "public",
  });
  assert.ok(drop, "drop created");
  await commerceBffService.upsertRightsMetadataForDrop(drop.id, {
    licenseType: "personal-use-only",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true
  });
  await commerceBffService.upsertCreatorTerms(creator.accountId, drop.id, {
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true
  });

  // Collector purchases to get a certificate
  const collectorSession = await commerceBffService.createSession({
    email: `pun-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const receipt = await commerceBffService.purchaseDrop(collectorSession.accountId, drop.id);
  assert.ok(receipt, "receipt created");

  // Get collector's certificate
  const cert = await commerceBffService.getCertificateByReceipt(collectorSession.accountId, receipt.id);
  assert.ok(cert, "certificate exists after purchase");

  // Admin flags it for review — should emit notification
  const adminSession = await commerceBffService.createSession({
    email: `pun-admin-${randomUUID()}@oneofakinde.test`,
    role: "creator",
  });
  process.env.OOK_MODERATOR_ACCOUNT_IDS = adminSession.accountId;
  await commerceBffService.flagCertificateForReview(adminSession.accountId, cert.id, "testing proof update notification");

  const feed = await commerceBffService.getNotificationFeed(collectorSession.accountId);
  const proofNotif = feed.entries.find((e) => e.type === "certificate_status_update");
  assert.ok(proofNotif, "holder must receive certificate_status_update notification when cert is flagged");
});

test("proof: provenance event added for collected drop emits proof_update to holder", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    delete process.env.OOK_MODERATOR_ACCOUNT_IDS;
    await fs.rm(dbPath, { force: true });
  });

  const base = await commerceBffService.createSession({
    email: `pun-creator2-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Provenance Studio",
    studioSynopsis: "for provenance testing",
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `prov-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for provenance testing",
    defaultDropVisibility: "public",
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Provenance Drop",
    worldId: world.id,
    synopsis: "for provenance testing",
    priceUsd: 1.99,
    visibility: "public",
  });
  assert.ok(drop, "drop created");
  await commerceBffService.upsertRightsMetadataForDrop(drop.id, {
    licenseType: "personal-use-only",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true
  });
  await commerceBffService.upsertCreatorTerms(creator.accountId, drop.id, {
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true
  });

  const collectorSession = await commerceBffService.createSession({
    email: `pun-collector2-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.purchaseDrop(collectorSession.accountId, drop.id);

  // Add a provenance event — holder should be notified
  await commerceBffService.addProvenanceEventForDrop(creator.accountId, drop.id, "certificate_previewed");

  const feed = await commerceBffService.getNotificationFeed(collectorSession.accountId);
  const proofNotif = feed.entries.find((e) => e.type === "proof_update");
  assert.ok(proofNotif, "holder must receive proof_update notification when provenance event is added");
});

test("proof: proof update notifications are viewer-scoped and do not leak PII", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    delete process.env.OOK_MODERATOR_ACCOUNT_IDS;
    await fs.rm(dbPath, { force: true });
  });

  const base = await commerceBffService.createSession({
    email: `pun-creator3-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "PII Test Studio",
    studioSynopsis: "for pii testing",
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `pii-world-${randomUUID().slice(0, 6)}`,
    synopsis: "for pii testing",
    defaultDropVisibility: "public",
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "PII Drop",
    worldId: world.id,
    synopsis: "for pii testing",
    priceUsd: 1.99,
    visibility: "public",
  });
  assert.ok(drop, "drop created");
  await commerceBffService.upsertRightsMetadataForDrop(drop.id, {
    licenseType: "personal-use-only",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true
  });
  await commerceBffService.upsertCreatorTerms(creator.accountId, drop.id, {
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true
  });

  const holderA = await commerceBffService.createSession({
    email: `pun-holdera-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const holderB = await commerceBffService.createSession({
    email: `pun-holderb-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.purchaseDrop(holderA.accountId, drop.id);
  await commerceBffService.purchaseDrop(holderB.accountId, drop.id);

  await commerceBffService.addProvenanceEventForDrop(creator.accountId, drop.id, "certificate_previewed");

  // Each holder gets their own notification — neither sees the other's email/identity
  const feedA = await commerceBffService.getNotificationFeed(holderA.accountId);
  const notifA = feedA.entries.find((e) => e.type === "proof_update");
  assert.ok(notifA, "holderA must receive proof_update");

  const feedB = await commerceBffService.getNotificationFeed(holderB.accountId);
  const notifB = feedB.entries.find((e) => e.type === "proof_update");
  assert.ok(notifB, "holderB must receive proof_update");

  // Notifications must not include any other holder's accountId or email
  const bodyA = JSON.stringify(notifA);
  assert.ok(!bodyA.includes(holderB.accountId), "holderA notification must not contain holderB accountId");

  const bodyB = JSON.stringify(notifB);
  assert.ok(!bodyB.includes(holderA.accountId), "holderB notification must not contain holderA accountId");
});
