CREATE TABLE IF NOT EXISTS bff_patron_tier_configs (
  id TEXT PRIMARY KEY,
  studio_handle TEXT NOT NULL,
  world_id TEXT NULL,
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  period_days INTEGER NOT NULL CHECK (period_days > 0),
  benefits_summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  updated_at TEXT NOT NULL,
  updated_by_handle TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bff_patron_tier_configs_scope
  ON bff_patron_tier_configs(studio_handle, COALESCE(world_id, ''));

CREATE INDEX IF NOT EXISTS idx_bff_patron_tier_configs_updated_at
  ON bff_patron_tier_configs(updated_at DESC);
