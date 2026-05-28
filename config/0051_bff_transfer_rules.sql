CREATE TABLE IF NOT EXISTS bff_transfer_rules (
  id TEXT PRIMARY KEY,
  drop_id TEXT NOT NULL UNIQUE,
  transferable BOOLEAN NOT NULL DEFAULT false,
  gifting_allowed BOOLEAN NOT NULL DEFAULT false,
  resale_allowed BOOLEAN NOT NULL DEFAULT false,
  requires_creator_approval BOOLEAN NOT NULL DEFAULT false,
  hold_period_days INTEGER,
  royalty_pct NUMERIC(5, 4),
  audience_scope TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT chk_transfer_rules_hold_period CHECK (hold_period_days IS NULL OR hold_period_days >= 0),
  CONSTRAINT chk_transfer_rules_royalty_pct CHECK (royalty_pct IS NULL OR royalty_pct >= 0)
);

CREATE INDEX IF NOT EXISTS idx_bff_transfer_rules_drop_id ON bff_transfer_rules(drop_id);
