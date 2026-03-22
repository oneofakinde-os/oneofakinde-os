CREATE TABLE IF NOT EXISTS bff_live_session_artifacts (
  id TEXT PRIMARY KEY,
  live_session_id TEXT NOT NULL,
  studio_handle TEXT NOT NULL,
  world_id TEXT,
  source_drop_id TEXT,
  artifact_kind TEXT NOT NULL,
  title TEXT NOT NULL,
  synopsis TEXT NOT NULL,
  status TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  approved_at TEXT,
  catalog_drop_id TEXT,
  approved_by_handle TEXT
);

CREATE INDEX IF NOT EXISTS idx_bff_live_session_artifacts_session
  ON bff_live_session_artifacts(live_session_id);
