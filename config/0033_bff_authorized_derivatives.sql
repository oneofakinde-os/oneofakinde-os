CREATE TABLE IF NOT EXISTS bff_authorized_derivatives (
  id TEXT PRIMARY KEY,
  source_drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  derivative_drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  attribution TEXT NOT NULL,
  revenue_splits JSONB NOT NULL DEFAULT '[]',
  authorized_by_handle TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_authorized_derivatives_source
  ON bff_authorized_derivatives(source_drop_id);

CREATE INDEX IF NOT EXISTS idx_bff_authorized_derivatives_derivative
  ON bff_authorized_derivatives(derivative_drop_id);
