// CI guardrail (class fix) — fail if ANY public table has row-level security disabled.
//
// A public table without RLS is reachable through Supabase's PostgREST / anon data API,
// bypassing the application's market-law settlement gates. config/0063 and config/0065
// closed specific instances of this; THIS check makes the guarantee mechanical so it cannot
// silently re-open. It would have failed config/0064 (which added the TOTP-secret and wallet
// tables without RLS) automatically, and it catches every future table that ships without
// RLS — the same discipline as making a guardrail mechanical rather than depending on someone
// happening to look. Runs in the postgres-parity CI job after all migrations are applied.
import { Pool } from "pg";

// Public tables that legitimately need no RLS (e.g. an infra/migration-tracker table).
// Empty today: every public table is a bff_ data table behind the app's owner role and must
// have RLS so PostgREST cannot read it. Add here, with a reason, only if that ever changes.
const ALLOWLIST = new Set<string>([]);

async function main(): Promise<void> {
  const connectionString =
    process.env.OOK_BFF_DATABASE_URL?.trim() ?? process.env.DATABASE_URL?.trim() ?? "";
  if (!connectionString) {
    console.error("ci-assert-public-tables-have-rls: OOK_BFF_DATABASE_URL/DATABASE_URL is required");
    process.exit(2);
  }

  const pool = new Pool({ connectionString });
  try {
    const { rows } = await pool.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false ORDER BY tablename"
    );
    const offenders = rows.map((row) => row.tablename).filter((name) => !ALLOWLIST.has(name));
    if (offenders.length > 0) {
      console.error(
        `RLS guard FAILED: ${offenders.length} public table(s) WITHOUT row-level security — ` +
          "readable via Supabase PostgREST, bypassing the app's market-law gates:"
      );
      for (const name of offenders) {
        console.error(`  - ${name}`);
      }
      console.error(
        "Fix: add a forward migration enabling RLS on these (see config/0063, config/0065)."
      );
      process.exit(1);
    }
    console.log(
      `RLS guard OK: all ${rows.length === 0 ? "" : "remaining "}public tables have row-level security enabled.`
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("ci-assert-public-tables-have-rls: unexpected error", error);
  process.exit(2);
});
