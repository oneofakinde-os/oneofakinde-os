CREATE TABLE IF NOT EXISTS bff_live_session_attendees (
  id TEXT PRIMARY KEY,
  live_session_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_live_session_attendees_session
  ON bff_live_session_attendees(live_session_id);

CREATE INDEX IF NOT EXISTS idx_bff_live_session_attendees_account
  ON bff_live_session_attendees(account_id);
