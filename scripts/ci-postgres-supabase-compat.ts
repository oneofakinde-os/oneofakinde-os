import { Pool } from "pg";

// CI-ONLY. Provisions the minimal Supabase surface (roles, auth.uid(), a storage
// schema stub, and the realtime publication) on a plain Postgres container so the
// Supabase-specific migrations (0038-0041) apply. NEVER run this against production:
// the real Supabase database already provides all of this. It is invoked only by the
// `postgres-parity` CI job, before `db:migrate:bff`.
const COMPAT_SQL = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $func$ SELECT NULL::uuid $func$;

CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid DEFAULT gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $func$ SELECT string_to_array(name, '/') $func$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN CREATE PUBLICATION supabase_realtime; END IF;
END
$$;
`;

async function main(): Promise<void> {
  const connectionString =
    process.env.OOK_BFF_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("OOK_BFF_DATABASE_URL (or DATABASE_URL) is required for ci-postgres-supabase-compat");
  }
  const pool = new Pool({ connectionString });
  try {
    await pool.query(COMPAT_SQL);
    console.log(
      "ci supabase-compat applied: roles (anon/authenticated/service_role), auth.uid(), storage stubs, supabase_realtime publication"
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("ci supabase-compat failed");
  console.error(error);
  process.exit(1);
});
