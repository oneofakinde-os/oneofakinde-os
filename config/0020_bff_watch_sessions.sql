CREATE TABLE IF NOT EXISTS bff_watch_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at TEXT NOT NULL,
  last_heartbeat_at TEXT NOT NULL,
  ended_at TEXT,
  end_reason TEXT CHECK (end_reason IN ('completed', 'user_exit', 'network_error', 'stalled', 'error')),
  heartbeat_count INTEGER NOT NULL DEFAULT 0,
  total_watch_time_seconds NUMERIC(12,2) NOT NULL DEFAULT 0,
  completion_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  rebuffer_count INTEGER NOT NULL DEFAULT 0,
  quality_step_down_count INTEGER NOT NULL DEFAULT 0,
  last_quality_mode TEXT CHECK (last_quality_mode IN ('auto', 'high', 'medium', 'low')),
  last_quality_level TEXT CHECK (last_quality_level IN ('high', 'medium', 'low'))
);

CREATE INDEX IF NOT EXISTS idx_bff_watch_sessions_account_id
  ON bff_watch_sessions(account_id);

CREATE INDEX IF NOT EXISTS idx_bff_watch_sessions_drop_id
  ON bff_watch_sessions(drop_id);

CREATE INDEX IF NOT EXISTS idx_bff_watch_sessions_started_at
  ON bff_watch_sessions(started_at DESC);
