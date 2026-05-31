import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

// Postgres parity proofs. These exercise the settlement spine against REAL Postgres
// (the backend production uses), to prove the bff's Postgres code path — not just the
// developer file database — actually settles ownership, enforces the market law, and
// does not silently lose data in its truncate-all/reinsert-all write model.
//
// They run ONLY when a Postgres connection is configured (OOK_BFF_DATABASE_URL), i.e.
// in CI with a Postgres service. With no Postgres (local / file-mode runs) they SKIP,
// so the existing file-backed proofs are completely unaffected.
const POSTGRES_URL =
  process.env.OOK_BFF_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
const skip: string | undefined = POSTGRES_URL
  ? undefined
  : "no Postgres configured (OOK_BFF_DATABASE_URL) — file-mode skip";

if (POSTGRES_URL) {
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "postgres";
  delete process.env.OOK_BFF_DB_PATH;
  delete process.env.OOK_PAYMENTS_PROVIDER;
}

import { commerceBffService } from "../../lib/bff/service";

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

// Full happy-path settlement of a fresh drop (each service call is its own
// load -> mutate -> truncate-all+reinsert-all -> commit cycle).
async function settleFreshDrop(label: string): Promise<void> {
  const { creator, drop } = await makeCreatorWorldDrop(label);
  await commerceBffService.upsertRightsMetadataForDrop(drop.id, CONSERVATIVE_RIGHTS);
  await commerceBffService.upsertCreatorTerms(creator.accountId, drop.id, CONSERVATIVE_TERMS);
  const collector = await commerceBffService.createSession({
    email: `pg-${label}-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const receipt = await commerceBffService.purchaseDrop(collector.accountId, drop.id);
  assert.ok(receipt, `settlement produced a receipt on Postgres (${label})`);
}

// Raw row counts for every public bff_ table (separate connection from the bff pool).
async function bffTableCounts(): Promise<Record<string, number>> {
  const pool = new Pool({ connectionString: POSTGRES_URL });
  try {
    const tables = await pool.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'bff_%' ORDER BY tablename"
    );
    const counts: Record<string, number> = {};
    for (const { tablename } of tables.rows) {
      const r = await pool.query<{ c: number }>(`SELECT count(*)::int AS c FROM public.${tablename}`);
      counts[tablename] = r.rows[0].c;
    }
    return counts;
  } finally {
    await pool.end();
  }
}

test(
  "pg-parity: a drop carrying rights + terms settles on real Postgres",
  { skip },
  async () => {
    const { creator, drop } = await makeCreatorWorldDrop("ok");
    await commerceBffService.upsertRightsMetadataForDrop(drop.id, CONSERVATIVE_RIGHTS);
    await commerceBffService.upsertCreatorTerms(creator.accountId, drop.id, CONSERVATIVE_TERMS);

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

// Safety closure for the truncate-all + reinsert-all write model: a second write
// re-runs the full truncate+reinsert. If CASCADE truncates a table the persist does
// NOT re-insert, that table's rows from the first write vanish — caught here. This is
// the difference between "settled once" and "the write model does not silently lose data".
test(
  "pg-parity: the truncate+reinsert write model preserves data across writes (CASCADE closure)",
  { skip },
  async () => {
    await settleFreshDrop("survive-a");
    const before = await bffTableCounts();
    assert.ok(
      Object.values(before).some((c) => c > 0),
      "the first settlement populated at least some tables"
    );

    // A second full settlement — every service call truncates all tables and re-inserts.
    await settleFreshDrop("survive-b");
    const after = await bffTableCounts();

    const losses = Object.entries(before)
      .filter(([table, count]) => count > 0 && (after[table] ?? 0) < count)
      .map(([table, count]) => `${table}: ${count} -> ${after[table] ?? 0}`);

    assert.deepEqual(
      losses,
      [],
      `tables lost rows across a write — CASCADE truncated them without re-inserting: ${losses.join("; ")}`
    );
  }
);
