import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

import { commerceBffService } from "../../lib/bff/service";

// A4 — collectWorldBundle settlement gate.
//
// collectWorldBundle is a PAID exchange that confers a collector access to a
// world's constituent drops, but it historically minted a WorldCollectOwnership
// record WITHOUT routing through the market-law settlement gate. So a world
// bundle could be sold even when its drops carried no creator rights/terms —
// the exchange outrunning the creator's terms.
//
// These proofs pin the gate added in collectWorldBundle:
//   1. a bundle whose drop is term-less is REFUSED — no world-ownership minted,
//      and an audit event attributes the refusal to this gate (which also proves
//      the gate iterated the bundle's included drops, i.e. it is not a no-op);
//   2. the same bundle SETTLES once the creator's rights + terms are set.
//
// The gate enforces the rights + creator-terms floor (the same floor
// issueOwnershipAndReceipt enforces before any mint); a per-drop certificate
// preview is intentionally NOT required, because the bundle flow never generates
// one and requiring it would block every bundle.

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-world-bundle-gate-${randomUUID()}.json`);
}

const CONSERVATIVE_RIGHTS = {
  licenseType: "personal-use-only",
  commercialUse: false,
  derivativesAllowed: false,
  attributionRequired: true
};
const CONSERVATIVE_TERMS = {
  commercialUse: false,
  derivativesAllowed: false,
  attributionRequired: true
};

// A creator who OWNS a world containing a single, deliberately TERM-LESS drop.
// The world has no explicit collectBundles, so the service synthesizes the
// default bundles (current_only is public-eligible) over the world's drops.
async function makeCreatorOwnedWorldWithTermlessDrop() {
  const base = await commerceBffService.createSession({
    email: `wbundle-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "World Bundle Gate Studio",
    studioSynopsis: "world-bundle settlement gate proof"
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `wbundle-world-${randomUUID().slice(0, 6)}`,
    synopsis: "world-bundle settlement gate proof"
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Ungated World Chapter",
    worldId: world!.id,
    synopsis: "a paid bundle drop that has no creator rights/terms yet",
    priceUsd: 4.5,
    visibility: "public"
  });
  assert.ok(drop, "drop created");
  return { creator, world: world!, drop: drop! };
}

test("proof: collectWorldBundle refuses a bundle whose drop lacks the creator's rights/terms (no world-ownership minted)", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { world, drop } = await makeCreatorOwnedWorldWithTermlessDrop();
  const collector = await commerceBffService.createSession({
    email: `wbundle-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const collected = await commerceBffService.collectWorldBundle({
    accountId: collector.accountId,
    worldId: world.id,
    bundleType: "current_only"
  });
  assert.equal(collected, null, "a bundle whose drop is term-less must not settle");

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    worldCollectOwnerships: Array<{ accountId: string; worldId: string }>;
    auditEvents: Array<{ action: string; subjectId: string | null; meta: string }>;
  };

  // No world-ownership may have been minted.
  assert.ok(
    !raw.worldCollectOwnerships.some(
      (o) => o.accountId === collector.accountId && o.worldId === world.id
    ),
    "no world-collect ownership record may exist for a term-less bundle"
  );

  // The refusal must come from THIS gate, not the eligibility pre-check (which
  // writes no audit event). The settlement gate records an ownership_settlement_failed
  // event naming the exact failing drop + surface — proving it iterated the
  // bundle's included drops and is not a vacuous no-op.
  const failure = raw.auditEvents.find(
    (e) => e.action === "ownership_settlement_failed" && e.subjectId === world.id
  );
  assert.ok(failure, "the gate must record an ownership_settlement_failed audit event");
  const meta = JSON.parse(failure!.meta) as { reason?: string; dropId?: string; surface?: string };
  assert.equal(
    meta.surface,
    "collect_world_bundle",
    "audit must attribute the refusal to the world-bundle gate"
  );
  assert.equal(meta.dropId, drop.id, "audit must name the exact term-less drop that failed the gate");
  assert.ok(
    meta.reason === "missing_rights" || meta.reason === "missing_creator_terms",
    `gate reason must be a missing rights/creator-terms floor (got ${meta.reason})`
  );
});

test("proof: once the creator's rights + terms are set, the same world bundle settles", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  process.env.OOK_PAYMENTS_PROVIDER = "manual";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    delete process.env.OOK_PAYMENTS_PROVIDER;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, world, drop } = await makeCreatorOwnedWorldWithTermlessDrop();
  await commerceBffService.upsertRightsMetadataForDrop(drop.id, CONSERVATIVE_RIGHTS);
  await commerceBffService.upsertCreatorTerms(creator.accountId, drop.id, CONSERVATIVE_TERMS);

  const collector = await commerceBffService.createSession({
    email: `wbundle-collector2-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const collected = await commerceBffService.collectWorldBundle({
    accountId: collector.accountId,
    worldId: world.id,
    bundleType: "current_only"
  });
  assert.ok(collected, "a world bundle whose drops carry rights + terms settles");
  assert.equal(collected!.worldId, world.id);

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    worldCollectOwnerships: Array<{ accountId: string; worldId: string; status: string }>;
  };
  assert.ok(
    raw.worldCollectOwnerships.some(
      (o) =>
        o.accountId === collector.accountId && o.worldId === world.id && o.status === "active"
    ),
    "an active world-collect ownership record must exist after a gated settle"
  );
});
