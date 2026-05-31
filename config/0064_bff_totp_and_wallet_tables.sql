-- Tables the bff persistence layer reads but no migration ever created:
-- bff_totp_enrollments (2FA TOTP) and bff_wallet_connections (wallet connect).
-- The file backend needs no schema, so this gap was invisible until the Postgres
-- parity proof loaded them ("relation bff_totp_enrollments does not exist").
-- Columns mirror the read shapes in lib/bff/persistence.ts. Timestamps are stored as
-- ISO text to match the rest of the bff schema. This completes the Postgres schema for
-- production, not just CI.

CREATE TABLE IF NOT EXISTS bff_totp_enrollments (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  status text NOT NULL,
  secret text NOT NULL,
  totp_uri text,
  recovery_codes text[] NOT NULL DEFAULT '{}',
  verified_at text,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bff_totp_enrollments_account_id
  ON bff_totp_enrollments(account_id);

CREATE TABLE IF NOT EXISTS bff_wallet_connections (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  address text NOT NULL,
  chain text NOT NULL,
  label text,
  status text NOT NULL,
  challenge text,
  verified_at text,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bff_wallet_connections_account_id
  ON bff_wallet_connections(account_id);
