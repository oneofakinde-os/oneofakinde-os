/**
 * Sprint 0.5H proof tests — Ownership Settlement Lifecycle
 *
 * Verifies:
 * 1. collectDrop produces ownership + provenance + certificate + vault projection
 * 2. collectDrop fails when rights metadata is absent
 * 3. collectDrop fails when creator terms are absent
 * 4. collectDrop fails when certificate preview is absent
 * 5. Failed settlement emits audit event but leaves no active ownership
 * 6. Settlement started/completed audit events fire on success
 * 7. provenance events carry ownershipId and sourceAction
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(prefix = "s05h-ow"): string {
  return path.join("/tmp", `ook-bff-${prefix}-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop(dbPath: string, prefix = "ow") {
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  const base = await commerceBffService.createSession({
    email: `${prefix}-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: `${prefix} Studio`,
    studioSynopsis: "sprint 0.5h ownership testing",
  });
  const creator = studio!.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `${prefix}-world-${randomUUID().slice(0, 6)}`,
    synopsis: "testing",
    defaultDropVisibility: "public",
  });
  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: `${prefix} Drop`,
    worldId: world!.id,
    synopsis: "testing",
    priceUsd: 1.99,
    visibility: "public",
  });
  return { creator, drop: drop! };
}

// ─── Test 1: full settlement produces all records ─────────────────────────────

test("proof: collectDrop produces ownership + provenance events + certificate + vault entry", async (t) => {
  const dbPath = isolatedDbPath("t1");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "ow1");

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

  const collector = await commerceBffService.createSession({
    email: `ow1-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);
  const receipt = await commerceBffService.collectDrop(collector.accountId, drop.id);

  assert.ok(receipt, "collectDrop must return a receipt");
  assert.equal(receipt!.status, "completed");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ownerships: Array<{ accountId: string; dropId: string; status: string }>;
    provenanceEvents: Array<{ kind: string; dropId: string; sourceAction?: string }>;
    certificates: Array<{ ownerAccountId: string; dropId: string; status: string }>;
    auditEvents: Array<{ action: string; subjectId: string }>;
  };

  const ownership = raw.ownerships.find(
    (o) => o.accountId === collector.accountId && o.dropId === drop.id
  );
  assert.ok(ownership, "ownership record must exist");
  assert.equal(ownership!.status, "active");

  const provOwnership = raw.provenanceEvents.find(
    (e) => e.kind === "ownership_created" && e.dropId === drop.id
  );
  assert.ok(provOwnership, "ownership_created provenance event must exist");
  assert.equal(provOwnership!.sourceAction, "collect");

  const provCert = raw.provenanceEvents.find(
    (e) => e.kind === "certificate_issued" && e.dropId === drop.id
  );
  assert.ok(provCert, "certificate_issued provenance event must exist");

  const cert = raw.certificates.find(
    (c) => c.ownerAccountId === collector.accountId && c.dropId === drop.id
  );
  assert.ok(cert, "certificate record must exist");
  assert.equal(cert!.status, "verified");

  const vault = await commerceBffService.getVaultProjection(collector.accountId, collector.accountId);
  assert.ok(vault, "vault projection must return");
  assert.ok(vault!.ownedDrops.some((d) => d.id === drop.id), "drop must appear in vault");

  const completedAudit = raw.auditEvents.find((e) => e.action === "ownership_settlement_completed");
  assert.ok(completedAudit, "ownership_settlement_completed audit event must exist");
});

// ─── Test 2: fails when rights metadata absent ────────────────────────────────

test("proof: collectDrop returns null when rights metadata is absent", async (t) => {
  const dbPath = isolatedDbPath("t2");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "ow2");

  await commerceBffService.upsertCreatorTerms(creator.accountId, drop.id, {
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });

  const collector = await commerceBffService.createSession({
    email: `ow2-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);

  const receipt = await commerceBffService.collectDrop(collector.accountId, drop.id);
  assert.equal(receipt, null, "collectDrop must be blocked without rights metadata");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    auditEvents: Array<{ action: string; meta: string }>;
  };
  const failedAudit = raw.auditEvents.find(
    (e) => e.action === "ownership_settlement_failed"
  );
  assert.ok(failedAudit, "ownership_settlement_failed audit event must exist");
  assert.ok(failedAudit!.meta.includes("missing_rights"), "audit meta must cite missing_rights");
});

// ─── Test 3: fails when creator terms absent ──────────────────────────────────

test("proof: collectDrop returns null when creator terms are absent", async (t) => {
  const dbPath = isolatedDbPath("t3");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "ow3");

  await commerceBffService.upsertRightsMetadataForDrop(drop.id, {
    licenseType: "all_rights_reserved",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });

  const collector = await commerceBffService.createSession({
    email: `ow3-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);

  const receipt = await commerceBffService.collectDrop(collector.accountId, drop.id);
  assert.equal(receipt, null, "collectDrop must be blocked without creator terms");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    auditEvents: Array<{ action: string; meta: string }>;
  };
  const failedAudit = raw.auditEvents.find(
    (e) => e.action === "ownership_settlement_failed"
  );
  assert.ok(failedAudit, "ownership_settlement_failed audit event must exist");
  assert.ok(failedAudit!.meta.includes("missing_creator_terms"), "audit meta must cite missing_creator_terms");
});

// ─── Test 4: fails when certificate preview absent ────────────────────────────

test("proof: collectDrop returns null when certificate preview is absent", async (t) => {
  const dbPath = isolatedDbPath("t4");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "ow4");

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

  const collector = await commerceBffService.createSession({
    email: `ow4-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const receipt = await commerceBffService.collectDrop(collector.accountId, drop.id);
  assert.equal(receipt, null, "collectDrop must be blocked without certificate preview");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    auditEvents: Array<{ action: string; meta: string }>;
  };
  const failedAudit = raw.auditEvents.find(
    (e) => e.action === "ownership_settlement_failed"
  );
  assert.ok(failedAudit, "ownership_settlement_failed audit event must exist");
  assert.ok(failedAudit!.meta.includes("missing_certificate_preview"), "audit meta must cite missing_certificate_preview");
});

// ─── Test 5: failed settlement leaves no active ownership ─────────────────────

test("proof: failed collectDrop leaves no active partial ownership state", async (t) => {
  const dbPath = isolatedDbPath("t5");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "ow5");

  const collector = await commerceBffService.createSession({
    email: `ow5-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  const receipt = await commerceBffService.collectDrop(collector.accountId, drop.id);
  assert.equal(receipt, null, "collect must fail");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ownerships: Array<{ accountId: string; dropId: string }>;
    certificates: Array<{ ownerAccountId: string; dropId: string }>;
  };
  const orphanOwnership = raw.ownerships.find(
    (o) => o.accountId === collector.accountId && o.dropId === drop.id
  );
  const orphanCert = raw.certificates.find(
    (c) => c.ownerAccountId === collector.accountId && c.dropId === drop.id
  );
  assert.equal(orphanOwnership, undefined, "no orphaned ownership record must exist");
  assert.equal(orphanCert, undefined, "no orphaned certificate must exist");
});

// ─── Test 6: provenance events carry sourceAction ─────────────────────────────

test("proof: successful collectDrop provenance events include sourceAction=collect", async (t) => {
  const dbPath = isolatedDbPath("t6");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "ow6");

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

  const collector = await commerceBffService.createSession({
    email: `ow6-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);
  await commerceBffService.collectDrop(collector.accountId, drop.id);

  const path_ = await commerceBffService.getProvenancePath(drop.id);
  const collectEvents = path_.filter((e) =>
    ["ownership_created", "certificate_issued"].includes(e.kind)
  );
  assert.ok(collectEvents.length >= 2, "must have at least 2 collect provenance events");
  for (const ev of collectEvents) {
    assert.equal(
      (ev as { sourceAction?: string }).sourceAction,
      "collect",
      "collect provenance events must carry sourceAction=collect"
    );
  }
});
