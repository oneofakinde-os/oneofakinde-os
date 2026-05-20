-- Sprint 2A — durable drop drafts.
-- Uses IF NOT EXISTS for idempotency (roll-forward policy).

CREATE TABLE IF NOT EXISTS bff_drafts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  studio_handle TEXT NOT NULL,
  title TEXT,
  synopsis TEXT,
  world_id TEXT,
  pricing_type TEXT,
  price_usd NUMERIC,
  alt_text TEXT,
  caption_url TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sprint 2A — soft-delete + scheduled release columns on drops.
ALTER TABLE bff_catalog_drops
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Sprint 2A — active role on sessions.
ALTER TABLE bff_sessions
  ADD COLUMN IF NOT EXISTS active_role TEXT;
