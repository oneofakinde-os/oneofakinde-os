CREATE TABLE IF NOT EXISTS bff_rights_metadata (
  id TEXT PRIMARY KEY,
  drop_id TEXT NOT NULL UNIQUE,
  license_type TEXT NOT NULL,
  commercial_use BOOLEAN NOT NULL DEFAULT false,
  derivatives_allowed BOOLEAN NOT NULL DEFAULT false,
  attribution_required BOOLEAN NOT NULL DEFAULT true,
  royalty_pct NUMERIC(5, 4),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_rights_metadata_drop_id ON bff_rights_metadata(drop_id);
