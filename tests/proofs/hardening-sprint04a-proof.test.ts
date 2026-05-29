/**
 * Sprint 0.4A proof tests — Creator Terms Registry and Certificate Preview Gate
 *
 * Verifies:
 * 1. rights-before-publish gate: publish rejected without rights metadata
 * 2. terms-before-publish gate: publish rejected without creator terms
 * 3. rights + terms together unblock publish
 * 4. creator terms upsert persists and is retrievable
 * 5. certificate preview record is persisted with provenance event
 * 6. collectDrop is blocked without certificate preview
 * 7. collectDrop succeeds after certificate preview
 * 8. vault projection — private vault returns empty ownedDrops to non-owner
 * 9. vault projection — public vault returns ownedDrops to viewer
 * 10. resale dark gate — no resale/most-resold data on discovery surface
 * 11. provenance append-only — certificate_previewed event appended by recordCertificatePreview
 * 12. no aggregate value in vault projection (private-by-default)
 * 13. creator terms persist through file-backed read/write cycle
 * 14. certificate previews persist through file-backed read/write cycle
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(prefix = "04a"): string {
  return path.join("/tmp", `ook-bff-${prefix}-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop(dbPath: string, prefix = "04a") {
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  const creatorBase = await commerceBffService.createSession({
    email: `${prefix}-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(creatorBase.accountId, {
    studioTitle: `${prefix} Studio`,
    studioSynopsis: "sprint 0.4a testing",
  });
  const creator = studio!.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `${prefix}-world-${randomUUID().slice(0, 6)}`,
    synopsis: "sprint 0.4a testing",
    defaultDropVisibility: "public",
  });

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: `${prefix} Drop`,
    worldId: world!.id,
    synopsis: "sprint 0.4a testing",
    priceUsd: 2.99,
    visibility: "public",
  });

  return { creator, drop: drop! };
}

// ─── Test 1: rights-before-publish gate ──────────────────────────────────────

test("proof: publishDrop returns missing_rights when no rights metadata set", async (t) => {
  const dbPath = isolatedDbPath("t1");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "t1");

  const result = await commerceBffService.publishDrop(creator.accountId, drop.id);
  assert.equal(result.ok, false, "publish must fail without rights");
  assert.equal(
    (result as { ok: false; reason: string }).reason,
    "missing_rights",
    "reason must be missing_rights"
  );
});

// ─── Test 2: terms-before-publish gate ───────────────────────────────────────

test("proof: publishDrop returns missing_creator_terms when rights set but terms absent", async (t) => {
  const dbPath = isolatedDbPath("t2");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "t2");

  await commerceBffService.upsertRightsMetadataForDrop(drop.id, {
    licenseType: "all_rights_reserved",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });

  const result = await commerceBffService.publishDrop(creator.accountId, drop.id);
  assert.equal(result.ok, false, "publish must fail without creator terms");
  assert.equal(
    (result as { ok: false; reason: string }).reason,
    "missing_creator_terms",
    "reason must be missing_creator_terms"
  );
});

// ─── Test 3: rights + terms unlocks publish ───────────────────────────────────

test("proof: publishDrop succeeds when both rights metadata and creator terms are set", async (t) => {
  const dbPath = isolatedDbPath("t3");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "t3");

  await commerceBffService.upsertRightsMetadataForDrop(drop.id, {
    licenseType: "all_rights_reserved",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });

  await commerceBffService.upsertCreatorTerms(creator.accountId, drop.id, {
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });

  const result = await commerceBffService.publishDrop(creator.accountId, drop.id);
  assert.equal(result.ok, true, "publish must succeed when both gates are clear");
  assert.ok((result as { ok: true; drop: { id: string } }).drop?.id, "returned drop must have id");
});

// ─── Test 4: creator terms upsert and retrieval ───────────────────────────────

test("proof: upsertCreatorTerms persists record and getCreatorTerms retrieves it", async (t) => {
  const dbPath = isolatedDbPath("t4");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "t4");

  const terms = await commerceBffService.upsertCreatorTerms(creator.accountId, drop.id, {
    commercialUse: true,
    derivativesAllowed: false,
    attributionRequired: true,
    royaltyPct: 0.05,
    notes: "test notes",
    termsVersion: "2.0",
  });

  assert.ok(terms, "upsert must return a record");
  assert.equal(terms!.dropId, drop.id);
  assert.equal(terms!.commercialUse, true);
  assert.equal(terms!.derivativesAllowed, false);
  assert.equal(terms!.attributionRequired, true);
  assert.equal(terms!.royaltyPct, 0.05);
  assert.equal(terms!.notes, "test notes");
  assert.equal(terms!.termsVersion, "2.0");

  const retrieved = await commerceBffService.getCreatorTerms(drop.id);
  assert.ok(retrieved, "getCreatorTerms must return the record");
  assert.equal(retrieved!.id, terms!.id);
  assert.equal(retrieved!.commercialUse, true);
});

// ─── Test 5: certificate preview persists with provenance event ───────────────

test("proof: recordCertificatePreview persists preview record and appends provenance event", async (t) => {
  const dbPath = isolatedDbPath("t5");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "t5");

  const collector = await commerceBffService.createSession({
    email: `t5-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const preview = await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);
  assert.ok(preview, "recordCertificatePreview must return a record");
  assert.equal(preview!.collectorAccountId, collector.accountId);
  assert.equal(preview!.dropId, drop.id);
  assert.ok(preview!.previewedAt, "previewedAt must be set");
  assert.ok(preview!.id.startsWith("cpv_"), "id must use cpv_ prefix");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    provenanceEvents: Array<{ kind: string; dropId: string }>;
    certificatePreviews: Array<{ collectorAccountId: string; dropId: string }>;
  };

  const event = raw.provenanceEvents.find(
    (e) => e.kind === "certificate_previewed" && e.dropId === drop.id
  );
  assert.ok(event, "certificate_previewed provenance event must be written");

  const saved = raw.certificatePreviews.find(
    (cp) => cp.collectorAccountId === collector.accountId && cp.dropId === drop.id
  );
  assert.ok(saved, "certificate preview record must be persisted in db");
});

// ─── Test 6: collectDrop blocked without preview ──────────────────────────────

test("proof: collectDrop returns null when collector has not previewed certificate", async (t) => {
  const dbPath = isolatedDbPath("t6");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "t6");

  const collector = await commerceBffService.createSession({
    email: `t6-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const receipt = await commerceBffService.collectDrop(collector.accountId, drop.id);
  assert.equal(receipt, null, "collectDrop must return null without prior certificate preview");
});

// ─── Test 7: collectDrop succeeds after preview ───────────────────────────────

test("proof: collectDrop succeeds when collector has previewed certificate", async (t) => {
  const dbPath = isolatedDbPath("t7");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "t7");

  const collector = await commerceBffService.createSession({
    email: `t7-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);

  const receipt = await commerceBffService.collectDrop(collector.accountId, drop.id);
  assert.ok(receipt, "collectDrop must succeed after certificate preview");
  assert.equal(receipt!.accountId, collector.accountId);
});

// ─── Test 8: vault projection — private vault hides ownedDrops from non-owner ─

test("proof: private vault returns empty ownedDrops to non-owner viewer", async (t) => {
  const dbPath = isolatedDbPath("t8");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "t8");

  const collector = await commerceBffService.createSession({
    email: `t8-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);
  await commerceBffService.collectDrop(collector.accountId, drop.id);

  const outsider = await commerceBffService.createSession({
    email: `t8-outsider-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const vault = await commerceBffService.getVaultProjection(outsider.accountId, collector.accountId);
  assert.ok(vault, "vault projection must be returned even for private vaults");
  assert.equal(vault!.isPublic, false, "vault must be private by default");
  assert.equal(vault!.ownedDrops.length, 0, "private vault must not expose owned drops to outsider");
  assert.equal(vault!.totalCount, 0, "private vault must not expose count to outsider");
});

// ─── Test 9: vault projection — public vault visible to viewer ────────────────

test("proof: public vault exposes ownedDrops (without aggregate value) to viewer", async (t) => {
  const dbPath = isolatedDbPath("t9");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "t9");

  const collector = await commerceBffService.createSession({
    email: `t9-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.setVaultVisibility(collector.accountId, "public");
  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);
  await commerceBffService.collectDrop(collector.accountId, drop.id);

  const outsider = await commerceBffService.createSession({
    email: `t9-outsider-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const vault = await commerceBffService.getVaultProjection(outsider.accountId, collector.accountId);
  assert.ok(vault, "vault projection must be returned");
  assert.equal(vault!.isPublic, true, "vault must be public");
  assert.ok(vault!.ownedDrops.length >= 1, "public vault must expose owned drops");
  assert.equal(vault!.totalCount, vault!.ownedDrops.length);

  // Critical: no aggregate value fields must leak
  const keys = Object.keys(vault!);
  assert.ok(!keys.includes("totalValue"), "totalValue must not be in vault projection");
  assert.ok(!keys.includes("aggregateValue"), "aggregateValue must not be in vault projection");
  assert.ok(!keys.includes("resaleValue"), "resaleValue must not be in vault projection");
  assert.ok(!keys.includes("portfolioValue"), "portfolioValue must not be in vault projection");
});

// ─── Test 10: resale dark gate ────────────────────────────────────────────────

test("proof: discovery surface carries no resale velocity or most-resold signals", async (t) => {
  const dbPath = isolatedDbPath("t10");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  await bootstrapCreatorWithDrop(dbPath, "t10");

  const viewer = await commerceBffService.createSession({
    email: `t10-viewer-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const drops = await commerceBffService.listDrops(viewer.accountId);
  for (const drop of drops ?? []) {
    const d = drop as Record<string, unknown>;
    assert.ok(!("resaleCount" in d), "resaleCount must not appear on discovery drop");
    assert.ok(!("resaleVelocity" in d), "resaleVelocity must not appear on discovery drop");
    assert.ok(!("mostResold" in d), "mostResold must not appear on discovery drop");
    assert.ok(!("speculationSignalCount" in d), "speculationSignalCount must remain zero/absent");
  }
});

// ─── Test 11: provenance append-only ─────────────────────────────────────────

test("proof: provenance events are append-only — recordCertificatePreview adds not replaces", async (t) => {
  const dbPath = isolatedDbPath("t11");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "t11");

  const collectorA = await commerceBffService.createSession({
    email: `t11-a-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const collectorB = await commerceBffService.createSession({
    email: `t11-b-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.recordCertificatePreview(collectorA.accountId, drop.id);
  await commerceBffService.recordCertificatePreview(collectorB.accountId, drop.id);

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    provenanceEvents: Array<{ kind: string; dropId: string }>;
  };

  const previewEvents = raw.provenanceEvents.filter(
    (e) => e.kind === "certificate_previewed" && e.dropId === drop.id
  );
  assert.ok(previewEvents.length >= 2, "two distinct preview events must both be appended");
});

// ─── Test 12: no aggregate value in vault projection ─────────────────────────

test("proof: vault projection never exposes totalValue or aggregateValue — even for owner", async (t) => {
  const dbPath = isolatedDbPath("t12");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "t12");

  const collector = await commerceBffService.createSession({
    email: `t12-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);
  await commerceBffService.collectDrop(collector.accountId, drop.id);

  const vault = await commerceBffService.getVaultProjection(collector.accountId, collector.accountId);
  assert.ok(vault, "vault projection returned");
  const forbidden = ["totalValue", "aggregateValue", "resaleValue", "portfolioValue", "estimatedValue"];
  for (const field of forbidden) {
    assert.ok(!(field in (vault as Record<string, unknown>)), `${field} must not be exposed`);
  }
});

// ─── Test 13: creator terms survive file-backed read/write cycle ──────────────

test("proof: creator terms persist through file-backed read/write cycle", async (t) => {
  const dbPath = isolatedDbPath("t13");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "t13");

  await commerceBffService.upsertCreatorTerms(creator.accountId, drop.id, {
    commercialUse: true,
    derivativesAllowed: true,
    attributionRequired: false,
    termsVersion: "3.0",
  });

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    creatorTerms: Array<{ dropId: string; commercialUse: boolean; termsVersion: string }>;
  };
  const saved = raw.creatorTerms.find((ct) => ct.dropId === drop.id);
  assert.ok(saved, "creator terms must be persisted to file db");
  assert.equal(saved!.commercialUse, true);
  assert.equal(saved!.termsVersion, "3.0");
});

// ─── Test 14: certificate previews survive file-backed read/write cycle ───────

test("proof: certificate previews persist through file-backed read/write cycle", async (t) => {
  const dbPath = isolatedDbPath("t14");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "t14");

  const collector = await commerceBffService.createSession({
    email: `t14-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const preview = await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);
  assert.ok(preview, "preview record returned");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    certificatePreviews: Array<{ id: string; collectorAccountId: string; dropId: string }>;
  };
  const saved = raw.certificatePreviews.find((cp) => cp.id === preview!.id);
  assert.ok(saved, "certificate preview must be persisted to file db");
  assert.equal(saved!.collectorAccountId, collector.accountId);
  assert.equal(saved!.dropId, drop.id);
});
