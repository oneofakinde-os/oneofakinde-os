import { Pool } from "pg";
import {
  migratePostgresPersistence,
  withDatabase,
  getPersistenceBackend,
} from "../lib/bff/persistence";

const DIVIDER = "─".repeat(52);

function getConnectionString(): string {
  const url = process.env.OOK_BFF_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "\n✗ No database connection string found.\n" +
        "  Set one of the following environment variables:\n" +
        "    • OOK_BFF_DATABASE_URL\n" +
        "    • DATABASE_URL\n" +
        "\n  Example:\n" +
        '    export DATABASE_URL="postgresql://user:pass@localhost:5432/oneofakinde"\n'
    );
    process.exit(1);
  }
  return url;
}

async function step(label: string, fn: () => Promise<void>): Promise<void> {
  process.stdout.write(`  ${label} … `);
  try {
    await fn();
    console.log("ok");
  } catch (err) {
    console.log("FAILED");
    throw err;
  }
}

async function main(): Promise<void> {
  console.log(`\n${DIVIDER}`);
  console.log("  oneofakinde database bootstrap");
  console.log(`${DIVIDER}\n`);

  // ── 1. Check env ──────────────────────────────────────────────
  const connectionString = getConnectionString();
  const backend = getPersistenceBackend();
  console.log(`  persistence backend : ${backend}`);
  console.log(`  connection string   : ${connectionString.replace(/\/\/.*@/, "//<redacted>@")}\n`);

  // ── 2. Test connectivity ──────────────────────────────────────
  await step("testing postgres connectivity (SELECT 1)", async () => {
    const pool = new Pool({ connectionString });
    try {
      await pool.query("SELECT 1");
    } finally {
      await pool.end();
    }
  });

  // ── 3. Run migrations ────────────────────────────────────────
  await step("running schema migrations", async () => {
    await migratePostgresPersistence();
  });

  // ── 4. Seed demo data ────────────────────────────────────────
  await step("seeding demo data (withDatabase no-op)", async () => {
    await withDatabase((_db) => ({ result: null, persist: false }));
  });

  // ── 5. Verify table counts ───────────────────────────────────
  console.log("");
  const pool = new Pool({ connectionString });
  try {
    const tables = ["bff_catalog_drops", "bff_accounts", "bff_sessions"];
    const counts: Record<string, number> = {};

    for (const table of tables) {
      try {
        const res = await pool.query(`SELECT count(*)::int AS n FROM ${table}`);
        counts[table] = res.rows[0].n;
      } catch {
        counts[table] = -1; // table may not exist
      }
    }

    console.log("  table row counts:");
    for (const [table, count] of Object.entries(counts)) {
      const display = count >= 0 ? String(count) : "table not found";
      console.log(`    ${table.padEnd(24)} ${display}`);
    }
  } finally {
    await pool.end();
  }

  // ── 6. Summary ───────────────────────────────────────────────
  console.log(`\n${DIVIDER}`);
  console.log("  database bootstrap complete");
  console.log(`${DIVIDER}\n`);
}

main().catch((error) => {
  console.error("\ndatabase bootstrap failed:");
  console.error(error);
  process.exit(1);
});
