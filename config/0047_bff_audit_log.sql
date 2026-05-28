CREATE TABLE IF NOT EXISTS bff_audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_audit_log_actor_id ON bff_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_bff_audit_log_target ON bff_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_bff_audit_log_action ON bff_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_bff_audit_log_created_at ON bff_audit_log(created_at);
