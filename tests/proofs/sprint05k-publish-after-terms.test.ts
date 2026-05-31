import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

import { commerceBffService } from "../../lib/bff/service";

// In-flow "set your terms" step — service-level contract.
//
// The terms-UI commit action (app/(creator)/create/drop/[drop_id]/terms) runs
// exactly this sequence: a freshly created, term-less drop CANNOT be published;
// once the creator's rights + terms are set (the conservative default deal), the
// same drop publishes and is stamped live. This pins the contract the UI relies
// on, so a regression in the publish gate or the upserts is caught here.

function isolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-publish-after-terms-${randomUUID()}.json`);
}

async function makeCreatorWorldDrop() {
  const base = await commerceBffService.createSession({
    email: `terms-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: "Terms Step Studio",
    studioSynopsis: "publish-after-terms proof"
  });
  assert.ok(studio, "studio created");
  const creator = studio.session;

  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `terms-world-${randomUUID().slice(0, 6)}`,
    synopsis: "publish-after-terms proof"
  });
  assert.ok(world, "world created");

  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: "Terms Step Drop",
    worldId: world!.id,
    synopsis: "publish-after-terms proof",
    priceUsd: 5,
    visibility: "public"
  });
  assert.ok(drop, "drop created");
  return { creator, drop: drop! };
}

test("proof: a term-less drop cannot publish, but publishes after the creator confirms the default deal", async (t) => {
  const dbPath = isolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";
  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const { creator, drop } = await makeCreatorWorldDrop();

  // Born term-less → publish is refused, naming the missing piece.
  const before = await commerceBffService.publishDrop(creator.accountId, drop.id);
  assert.equal(before.ok, false, "a term-less drop must not publish");
  if (!before.ok) {
    assert.ok(
      before.reason === "missing_rights" || before.reason === "missing_creator_terms",
      `publish must be refused for a missing rights/terms reason (got ${before.reason})`
    );
  }

  // The exact sequence the terms-UI commit action performs (conservative default deal).
  const terms = await commerceBffService.upsertCreatorTerms(creator.accountId, drop.id, {
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
    royaltyPct: null,
    termsVersion: "1.0"
  });
  assert.ok(terms, "creator terms saved");

  await commerceBffService.upsertRightsMetadataForDrop(drop.id, {
    licenseType: "personal-use-only",
    commercialUse: false,
    derivativesAllowed: false,
    attributionRequired: true,
    royaltyPct: null,
    notes: null
  });

  // Now it publishes and is stamped live.
  const after = await commerceBffService.publishDrop(creator.accountId, drop.id);
  assert.ok(after.ok, "a drop carrying rights + terms publishes");
  if (after.ok) {
    assert.ok(after.drop.releaseAt, "publish stamps releaseAt (the drop is now live)");
  }
});
