-- append-only provenance ledger; application must not issue UPDATE or DELETE against this table
CREATE TABLE IF NOT EXISTS bff_provenance_events (
  id TEXT PRIMARY KEY,
  drop_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  actor_handle TEXT NOT NULL,
  certificate_id TEXT,
  receipt_id TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_provenance_events_drop_id ON bff_provenance_events(drop_id);
CREATE INDEX IF NOT EXISTS idx_bff_provenance_events_occurred_at ON bff_provenance_events(occurred_at);
