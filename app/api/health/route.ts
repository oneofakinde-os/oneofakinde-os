import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getPersistenceBackend } from "@/lib/bff/persistence";

export const dynamic = "force-dynamic";

interface HealthResponse {
  status: "ok" | "degraded" | "error";
  backend: "file" | "postgres";
  database: {
    connected: boolean;
    migrationCount?: number;
    error?: string;
  };
  supabase: { configured: boolean };
  stripe: { configured: boolean };
  timestamp: string;
  version: string;
}

async function checkDatabase(
  backend: string
): Promise<HealthResponse["database"]> {
  if (backend !== "postgres") {
    return { connected: false, error: "backend is file-based, skipping" };
  }

  const connectionString =
    process.env.OOK_BFF_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    return { connected: false, error: "no connection string configured" };
  }

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 3000 });
  try {
    const res = await pool.query(
      "SELECT count(*)::int AS n FROM ook_bff_schema_migrations"
    );
    return { connected: true, migrationCount: res.rows[0].n };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: false, error: message };
  } finally {
    await pool.end();
  }
}

export async function GET() {
  const backend = getPersistenceBackend();

  const supabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  const database = await checkDatabase(backend);

  let version = "dev";
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require("../../../package.json");
    version = pkg.version ?? "dev";
  } catch {
    // package.json not available at runtime — fine
  }

  let status: HealthResponse["status"] = "ok";
  if (backend === "postgres" && !database.connected) {
    status = "error";
  } else if (!supabaseConfigured || !stripeConfigured) {
    status = "degraded";
  }

  const body: HealthResponse = {
    status,
    backend: backend as "file" | "postgres",
    database,
    supabase: { configured: supabaseConfigured },
    stripe: { configured: stripeConfigured },
    timestamp: new Date().toISOString(),
    version,
  };

  return NextResponse.json(body);
}
