CREATE TABLE IF NOT EXISTS bff_drop_versions (
  id TEXT PRIMARY KEY,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  notes TEXT,
  created_by_handle TEXT NOT NULL,
  created_at TEXT NOT NULL,
  released_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_bff_drop_versions_drop
  ON bff_drop_versions(drop_id, created_at DESC);
