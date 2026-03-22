CREATE TABLE IF NOT EXISTS bff_notification_entries (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_notification_entries_account_id_created
  ON bff_notification_entries(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bff_notification_entries_account_id_unread
  ON bff_notification_entries(account_id) WHERE read = FALSE;
