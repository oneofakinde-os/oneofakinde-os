CREATE TABLE IF NOT EXISTS bff_audit_events (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor_account_id TEXT,
  subject_type TEXT,
  subject_id TEXT,
  meta TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_audit_events_action ON bff_audit_events(action);
CREATE INDEX IF NOT EXISTS idx_bff_audit_events_actor ON bff_audit_events(actor_account_id);
CREATE INDEX IF NOT EXISTS idx_bff_audit_events_subject ON bff_audit_events(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_bff_audit_events_created_at ON bff_audit_events(created_at DESC);
