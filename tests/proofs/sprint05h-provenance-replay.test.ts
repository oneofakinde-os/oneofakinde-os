/**
 * Sprint 0.5H proof tests — Provenance Replay
 *
 * Verifies:
 * 1. getProvenancePath reconstructs the proof path for a collected drop
 * 2. Events are sorted by occurredAt
 * 3. Provenance events are append-only (two collectors produce two event sets)
 * 4. Source action is included on collect provenance events
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(prefix = "s05h-pr"): string {
  return path.join("/tmp", `ook-bff-${prefix}-${randomUUID()}.json`);
}

async function fullSetup(dbPath: string, prefix = "pr") {
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  const base = await commerceBffService.createSession({
    email: `${prefix}-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: `${prefix} Studio`,
    studioSynopsis: "provenance replay testing",
  });
  const creator = studio!.session;
  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `${prefix}-w-${randomUUID().slice(0, 6)}`,
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
  await commerceBffService.upsertRightsMetadataForDrop(drop!.id, {
    licenseType: "all_rights_reserved",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });
  await commerceBffService.upsertCreatorTerms(creator.accountId, drop!.id, {
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });
  return { creator, drop: drop! };
}

// ─── Test 1: proof path reconstruction ───────────────────────────────────────

test("proof: getProvenancePath reconstructs collect → ownership → certificate path", async (t) => {
  const dbPath = isolatedDbPath("t1");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await fullSetup(dbPath, "pr1");

  const collector = await commerceBffService.createSession({
    email: `pr1-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);
  await commerceBffService.collectDrop(collector.accountId, drop.id);

  const path_ = await commerceBffService.getProvenancePath(drop.id);
  const kinds = path_.map((e) => e.kind);

  assert.ok(kinds.includes("certificate_previewed"), "proof path must include certificate_previewed");
  assert.ok(kinds.includes("ownership_created"), "proof path must include ownership_created");
  assert.ok(kinds.includes("certificate_issued"), "proof path must include certificate_issued");
});

// ─── Test 2: events sorted by occurredAt ─────────────────────────────────────

test("proof: getProvenancePath returns events sorted by occurredAt ascending", async (t) => {
  const dbPath = isolatedDbPath("t2");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await fullSetup(dbPath, "pr2");

  const collector = await commerceBffService.createSession({
    email: `pr2-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);
  await commerceBffService.collectDrop(collector.accountId, drop.id);

  const events = await commerceBffService.getProvenancePath(drop.id);
  for (let i = 1; i < events.length; i++) {
    assert.ok(
      events[i - 1]!.occurredAt <= events[i]!.occurredAt,
      `provenance events must be sorted ascending by occurredAt at index ${i}`
    );
  }
});

// ─── Test 3: append-only — two collectors produce distinct event sets ─────────

test("proof: provenance events are append-only — two collectors produce two ownership events", async (t) => {
  const dbPath = isolatedDbPath("t3");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await fullSetup(dbPath, "pr3");

  const collectorA = await commerceBffService.createSession({
    email: `pr3-a-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const collectorB = await commerceBffService.createSession({
    email: `pr3-b-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  await commerceBffService.recordCertificatePreview(collectorA.accountId, drop.id);
  await commerceBffService.collectDrop(collectorA.accountId, drop.id);

  await commerceBffService.recordCertificatePreview(collectorB.accountId, drop.id);
  await commerceBffService.collectDrop(collectorB.accountId, drop.id);

  const events = await commerceBffService.getProvenancePath(drop.id);
  const ownershipCreated = events.filter((e) => e.kind === "ownership_created");
  assert.ok(
    ownershipCreated.length >= 2,
    `two collectors must produce two ownership_created events, got ${ownershipCreated.length}`
  );
});

// ─── Test 4: sourceAction is set on collect provenance events ─────────────────

test("proof: collect provenance events include sourceAction field", async (t) => {
  const dbPath = isolatedDbPath("t4");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await fullSetup(dbPath, "pr4");

  const collector = await commerceBffService.createSession({
    email: `pr4-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);
  await commerceBffService.collectDrop(collector.accountId, drop.id);

  const events = await commerceBffService.getProvenancePath(drop.id);
  const collectEvents = events.filter((e) =>
    ["ownership_created", "certificate_issued"].includes(e.kind)
  );
  assert.ok(collectEvents.length >= 2, "must have collect provenance events");

  for (const ev of collectEvents) {
    assert.ok(
      (ev as { sourceAction?: string }).sourceAction,
      `${ev.kind} must include sourceAction`
    );
  }
});
