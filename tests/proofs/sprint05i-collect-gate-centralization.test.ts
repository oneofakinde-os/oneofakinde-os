/**
 * Sprint 0.5I proof tests — Collect Gate Centralization
 *
 * Verifies:
 * 1.  validateOwnershipSettlementReadiness: missing_rights blocks all paths
 * 2.  validateOwnershipSettlementReadiness: missing_creator_terms blocks all paths
 * 3.  validateOwnershipSettlementReadiness: missing_certificate_preview blocks all paths
 * 4.  collectDrop uses the shared gate (same gate behavior, now via helper)
 * 5.  purchaseDropViaLiveSession fails when rights metadata is absent
 * 6.  purchaseDropViaLiveSession fails when creator terms are absent
 * 7.  purchaseDropViaLiveSession fails when certificate preview is absent
 * 8.  purchaseDropViaLiveSession succeeds when all three gates pass
 * 9.  completePendingPaymentById fails before ownership when cert preview absent
 * 10. No public app route calls purchaseDrop directly
 * 11. hot_resale and recent_high_resale cannot surface publicly
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";

function isolatedDbPath(prefix = "s05i"): string {
  return path.join("/tmp", `ook-bff-${prefix}-${randomUUID()}.json`);
}

async function bootstrapCreatorWithDrop(dbPath: string, prefix = "i") {
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_PAYMENTS_PROVIDER = "manual";

  const base = await commerceBffService.createSession({
    email: `${prefix}-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: `${prefix} Studio`,
    studioSynopsis: "sprint 0.5i testing",
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

async function addRightsAndTerms(
  creatorAccountId: string,
  dropId: string
): Promise<void> {
  await commerceBffService.upsertRightsMetadataForDrop(dropId, {
    licenseType: "all_rights_reserved",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });
  await commerceBffService.upsertCreatorTerms(creatorAccountId, dropId, {
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });
}

// ─── Test 1: shared gate — missing rights blocks ──────────────────────────────

test("proof: shared gate returns missing_rights when no rights metadata set", async (t) => {
  const dbPath = isolatedDbPath("t1");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "i1");
  const collector = await commerceBffService.createSession({
    email: `i1-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // No rights, no terms, no preview — gate must fail at first check (rights).
  const receipt = await commerceBffService.collectDrop(collector.accountId, drop.id);
  assert.equal(receipt, null, "collectDrop must return null when rights absent");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    auditEvents: Array<{ action: string; meta: string }>;
  };
  const failedEvent = raw.auditEvents.find(
    (e) => e.action === "ownership_settlement_failed" && JSON.parse(e.meta).reason === "missing_rights"
  );
  assert.ok(failedEvent, "ownership_settlement_failed audit event with missing_rights must be emitted");
});

// ─── Test 2: shared gate — missing creator terms blocks ───────────────────────

test("proof: shared gate returns missing_creator_terms when rights set but terms absent", async (t) => {
  const dbPath = isolatedDbPath("t2");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "i2");
  await commerceBffService.upsertRightsMetadataForDrop(drop.id, {
    licenseType: "all_rights_reserved",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });
  // No creator terms, no preview.

  const collector = await commerceBffService.createSession({
    email: `i2-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const receipt = await commerceBffService.collectDrop(collector.accountId, drop.id);
  assert.equal(receipt, null, "collectDrop must return null when creator terms absent");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    auditEvents: Array<{ action: string; meta: string }>;
  };
  const failedEvent = raw.auditEvents.find(
    (e) =>
      e.action === "ownership_settlement_failed" &&
      JSON.parse(e.meta).reason === "missing_creator_terms"
  );
  assert.ok(failedEvent, "ownership_settlement_failed with missing_creator_terms must be emitted");
});

// ─── Test 3: shared gate — missing certificate preview blocks ─────────────────

test("proof: shared gate returns missing_certificate_preview when rights+terms set but preview absent", async (t) => {
  const dbPath = isolatedDbPath("t3");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "i3");
  await addRightsAndTerms(creator.accountId, drop.id);
  // No certificate preview.

  const collector = await commerceBffService.createSession({
    email: `i3-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const receipt = await commerceBffService.collectDrop(collector.accountId, drop.id);
  assert.equal(receipt, null, "collectDrop must return null when cert preview absent");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    auditEvents: Array<{ action: string; meta: string }>;
  };
  const failedEvent = raw.auditEvents.find(
    (e) =>
      e.action === "ownership_settlement_failed" &&
      JSON.parse(e.meta).reason === "missing_certificate_preview"
  );
  assert.ok(
    failedEvent,
    "ownership_settlement_failed with missing_certificate_preview must be emitted"
  );
});

// ─── Test 4: collectDrop still works via shared gate ─────────────────────────

test("proof: collectDrop succeeds via shared gate when all three conditions pass", async (t) => {
  const dbPath = isolatedDbPath("t4");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "i4");
  await addRightsAndTerms(creator.accountId, drop.id);

  const collector = await commerceBffService.createSession({
    email: `i4-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);
  const receipt = await commerceBffService.collectDrop(collector.accountId, drop.id);
  assert.ok(receipt, "collectDrop must succeed when all three gates pass");
  assert.equal(receipt!.accountId, collector.accountId);
});

// ─── Test 5: purchaseDropViaLiveSession — missing rights blocks ───────────────

test("proof: purchaseDropViaLiveSession returns null when rights metadata absent", async (t) => {
  const dbPath = isolatedDbPath("t5");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "i5");
  const collector = await commerceBffService.createSession({
    email: `i5-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // No rights.
  const receipt = await commerceBffService.purchaseDropViaLiveSession(
    collector.accountId,
    drop.id,
    `ls_${randomUUID()}`
  );
  assert.equal(receipt, null, "purchaseDropViaLiveSession must return null when rights absent");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    auditEvents: Array<{ action: string; meta: string }>;
  };
  const failedEvent = raw.auditEvents.find(
    (e) =>
      e.action === "ownership_settlement_failed" &&
      JSON.parse(e.meta).reason === "missing_rights"
  );
  assert.ok(failedEvent, "ownership_settlement_failed with missing_rights must be emitted on live path");
});

// ─── Test 6: purchaseDropViaLiveSession — missing creator terms blocks ────────

test("proof: purchaseDropViaLiveSession returns null when creator terms absent", async (t) => {
  const dbPath = isolatedDbPath("t6");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { drop } = await bootstrapCreatorWithDrop(dbPath, "i6");
  await commerceBffService.upsertRightsMetadataForDrop(drop.id, {
    licenseType: "all_rights_reserved",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
  });
  // No creator terms.

  const collector = await commerceBffService.createSession({
    email: `i6-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const receipt = await commerceBffService.purchaseDropViaLiveSession(
    collector.accountId,
    drop.id,
    `ls_${randomUUID()}`
  );
  assert.equal(receipt, null, "purchaseDropViaLiveSession must return null when creator terms absent");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    auditEvents: Array<{ action: string; meta: string }>;
  };
  const failedEvent = raw.auditEvents.find(
    (e) =>
      e.action === "ownership_settlement_failed" &&
      JSON.parse(e.meta).reason === "missing_creator_terms"
  );
  assert.ok(
    failedEvent,
    "ownership_settlement_failed with missing_creator_terms must be emitted on live path"
  );
});

// ─── Test 7: purchaseDropViaLiveSession — missing cert preview blocks ─────────

test("proof: purchaseDropViaLiveSession returns null when certificate preview absent", async (t) => {
  const dbPath = isolatedDbPath("t7");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "i7");
  await addRightsAndTerms(creator.accountId, drop.id);
  // No certificate preview.

  const collector = await commerceBffService.createSession({
    email: `i7-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  const receipt = await commerceBffService.purchaseDropViaLiveSession(
    collector.accountId,
    drop.id,
    `ls_${randomUUID()}`
  );
  assert.equal(
    receipt,
    null,
    "purchaseDropViaLiveSession must return null when cert preview absent"
  );

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    auditEvents: Array<{ action: string; meta: string }>;
  };
  const failedEvent = raw.auditEvents.find(
    (e) =>
      e.action === "ownership_settlement_failed" &&
      JSON.parse(e.meta).reason === "missing_certificate_preview"
  );
  assert.ok(
    failedEvent,
    "ownership_settlement_failed with missing_certificate_preview must be emitted on live path"
  );
});

// ─── Test 8: purchaseDropViaLiveSession succeeds when all gates pass ──────────

test("proof: purchaseDropViaLiveSession succeeds when all three gates pass", async (t) => {
  const dbPath = isolatedDbPath("t8");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "i8");
  await addRightsAndTerms(creator.accountId, drop.id);

  const collector = await commerceBffService.createSession({
    email: `i8-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });
  await commerceBffService.recordCertificatePreview(collector.accountId, drop.id);

  // Drop has no release date (null) so canAccountCollectDropNow returns true
  // regardless of liveSessionId — the gate is what matters here.
  const receipt = await commerceBffService.purchaseDropViaLiveSession(
    collector.accountId,
    drop.id,
    `ls_${randomUUID()}`
  );
  assert.ok(receipt, "purchaseDropViaLiveSession must succeed when all three gates pass");
  assert.equal(receipt!.accountId, collector.accountId);
});

// ─── Test 9: completePendingPaymentById fails before ownership when no preview ─

test("proof: completePendingPayment fails before ownership issuance when cert preview absent", async (t) => {
  const dbPath = isolatedDbPath("t9");
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await bootstrapCreatorWithDrop(dbPath, "i9");
  await addRightsAndTerms(creator.accountId, drop.id);

  const collector = await commerceBffService.createSession({
    email: `i9-c-${randomUUID()}@oneofakinde.test`,
    role: "collector",
  });

  // Create a checkout session (pending payment) WITHOUT certificate preview.
  const checkout = await commerceBffService.createCheckoutSession({
    accountId: collector.accountId,
    dropId: drop.id,
    successUrl: "https://example.test/ok",
    cancelUrl: "https://example.test/cancel",
  });
  assert.ok(checkout, "checkout session must be created");
  assert.equal(checkout!.status, "pending", "checkout must be in pending state");

  const paymentId = (checkout as { status: "pending"; paymentId: string }).paymentId;
  assert.ok(paymentId, "payment ID must be present");

  // Complete the pending payment WITHOUT having done certificate preview.
  const receipt = await commerceBffService.completePendingPayment(paymentId);
  assert.equal(
    receipt,
    null,
    "completePendingPayment must return null when cert preview absent"
  );

  // Confirm no ownership was created.
  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ownerships: Array<{ accountId: string; dropId: string }>;
    auditEvents: Array<{ action: string; meta: string }>;
  };
  const ownership = raw.ownerships.find(
    (o) => o.accountId === collector.accountId && o.dropId === drop.id
  );
  assert.equal(ownership, undefined, "no ownership must be created when gate blocks payment completion");

  const failedEvent = raw.auditEvents.find(
    (e) =>
      e.action === "ownership_settlement_failed" &&
      JSON.parse(e.meta).reason === "missing_certificate_preview"
  );
  assert.ok(
    failedEvent,
    "ownership_settlement_failed audit event must be emitted for blocked payment completion"
  );
});

// ─── Test 10: no public route calls purchaseDrop directly ────────────────────

test("proof: no public app route exposes purchaseDrop directly", () => {
  let output = "";
  try {
    // Match only exact `purchaseDrop(` calls — not purchaseDropAction or purchaseDropViaLiveSession.
    output = execSync(
      `grep -r "purchaseDrop(" ${process.cwd()}/app --include="*.ts" --include="*.tsx" -l 2>/dev/null || true`,
      { encoding: "utf8" }
    );
  } catch {
    output = "";
  }

  const files = output.trim().split("\n").filter(Boolean);
  assert.equal(
    files.length,
    0,
    `purchaseDrop must not appear in any app/ route. Found in: ${files.join(", ")}`
  );
});

// ─── Test 11: hot_resale / recent_high_resale not surfaced in service or routes ─

test("proof: hot_resale is not surfaced in any production service method or app route", () => {
  // hot_resale may exist as a domain value but must never be output from
  // collectDrop, listDrops, getShowroom, vault, or any discovery method.
  // This check confirms it does not appear in service.ts or app/ routes.
  let inService = "";
  let inApp = "";
  try {
    inService = execSync(
      `grep -n "hot_resale" ${process.cwd()}/lib/bff/service.ts 2>/dev/null || true`,
      { encoding: "utf8" }
    );
    inApp = execSync(
      `grep -rn "hot_resale" ${process.cwd()}/app --include="*.ts" --include="*.tsx" 2>/dev/null || true`,
      { encoding: "utf8" }
    );
  } catch {
    inService = "";
    inApp = "";
  }
  assert.equal(inService.trim(), "", `hot_resale must not appear in service.ts: ${inService}`);
  assert.equal(inApp.trim(), "", `hot_resale must not appear in app/ routes: ${inApp}`);
});

test("proof: recent_high_resale is not surfaced in any production service method or app route", () => {
  let inService = "";
  let inApp = "";
  try {
    inService = execSync(
      `grep -n "recent_high_resale" ${process.cwd()}/lib/bff/service.ts 2>/dev/null || true`,
      { encoding: "utf8" }
    );
    inApp = execSync(
      `grep -rn "recent_high_resale" ${process.cwd()}/app --include="*.ts" --include="*.tsx" 2>/dev/null || true`,
      { encoding: "utf8" }
    );
  } catch {
    inService = "";
    inApp = "";
  }
  assert.equal(inService.trim(), "", `recent_high_resale must not appear in service.ts: ${inService}`);
  assert.equal(inApp.trim(), "", `recent_high_resale must not appear in app/ routes: ${inApp}`);
});
