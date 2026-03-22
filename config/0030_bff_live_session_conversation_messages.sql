CREATE TABLE IF NOT EXISTS bff_live_session_conversation_messages (
  id TEXT PRIMARY KEY,
  live_session_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  parent_message_id TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'visible',
  report_count INTEGER NOT NULL DEFAULT 0,
  reported_at TEXT,
  moderated_at TEXT,
  moderated_by_account_id TEXT,
  appeal_requested_at TEXT,
  appeal_requested_by_account_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_bff_live_session_convo_session
  ON bff_live_session_conversation_messages(live_session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_bff_live_session_convo_account
  ON bff_live_session_conversation_messages(account_id);
