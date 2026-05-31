import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Postgres parity proofs. These exercise the settlement spine against REAL Postgres
// (the backend production uses), to prove the bff's Postgres code path — not just the
// developer file database — actually settles ownership and enforces the market law.
//
// They run ONLY when a Postgres connection is configured (OOK_BFF_DATABASE_URL),
// i.e. in CI with a Postgres service. With no Postgres (local / file-mode runs) they
// SKIP, so the existing 1,008 file-backed proofs are completely unaffected.
const POSTGRES_URL =
  process.env.OOK_BFF_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
const skip: string | undefined = POSTGRES_URL
  ? undefined
  : "no Postgres configured (OOK_BFF_DATABASE_URL) — file-mode skip";

if (POSTGRES_URL) {
  // Force the service onto Postgres for this (isolated) test process.
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "postgres";
  delete process.env.OOK_BFF_DB_PATH;
  delete process.env.OOK_PAYMENTS_PROVIDER; // use the default manual settlement path
}

// Imported after the env is prepared; the backend is resolved per service call.
import { commerceBffService } from "../../lib/bff/service";

async function makeCreatorWorldDrop(label: string) {
  const base = await commerceBffService.createSession({
    email: `pg-${label}-creator-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const studio = await commerceBffService.setupCreatorStudio(base.accountId, {
    studioTitle: `PG Parity ${label}`,
    studioSynopsis: "postgres settlement parity"
  });
  assert.ok(studio, "studio created on postgres");
  const creator = studio.session;
  const world = await commerceBffService.createWorld(creator.accountId, {
    title: `pg-${label}-world-${randomUUID().slice(0, 8)}`,
    synopsis: "postgres settlement parity"
  });
  assert.ok(world, "world created on postgres");
  const drop = await commerceBffService.createDrop(creator.accountId, {
    title: `pg-${label}-drop-${randomUUID().slice(0, 8)}`,
    worldId: world.id,
    synopsis: "postgres settlement parity",
    priceUsd: 4.0,
    visibility: "public"
  });
  assert.ok(drop, "drop created on postgres");
  return { creator, drop };
}

test(
  "pg-parity: a drop carrying rights + terms settles on real Postgres",
  { skip },
  async () => {
    const { creator, drop } = await makeCreatorWorldDrop("ok");
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

    const collector = await commerceBffService.createSession({
      email: `pg-collector-${randomUUID()}@oneofakinde.test`,
      role: "collector"
    });
    const receipt = await commerceBffService.purchaseDrop(collector.accountId, drop.id);
    assert.ok(receipt, "settlement produced a receipt on Postgres");
    assert.equal(receipt!.status, "completed", "settlement completes on Postgres");
  }
);

test(
  "pg-parity: the settlement backstop refuses a term-less drop on real Postgres",
  { skip },
  async () => {
    // createDrop attaches no rights/terms, so this drop is term-less.
    const { drop } = await makeCreatorWorldDrop("termless");
    const collector = await commerceBffService.createSession({
      email: `pg-collector2-${randomUUID()}@oneofakinde.test`,
      role: "collector"
    });

    let threw = false;
    let result: unknown = "unset";
    try {
      result = await commerceBffService.purchaseDrop(collector.accountId, drop.id);
    } catch (error) {
      threw = true;
      assert.match(
        String(error),
        /settlement backstop|rights metadata and creator terms/i,
        "the market-law backstop fires on Postgres"
      );
    }
    assert.ok(threw || result === null, "a term-less drop must not settle on Postgres");
  }
);
