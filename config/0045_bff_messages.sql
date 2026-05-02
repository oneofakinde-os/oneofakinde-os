-- Super Matrix Wave 1.1 - durable direct/group messaging foundation.
--
-- The BFF server is the only writer. RLS is enabled here to keep direct client
-- access closed until a dedicated policy pass is needed.

CREATE TABLE IF NOT EXISTS bff_message_threads (
  id                    TEXT PRIMARY KEY,
  kind                  TEXT NOT NULL CHECK (kind IN ('direct', 'group')),
  title                 TEXT,
  created_by_account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  last_message_at       TEXT
);

CREATE TABLE IF NOT EXISTS bff_message_participants (
  thread_id    TEXT NOT NULL REFERENCES bff_message_threads(id) ON DELETE CASCADE,
  account_id   TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  status       TEXT NOT NULL CHECK (status IN ('active', 'requested', 'declined')),
  joined_at    TEXT NOT NULL,
  last_read_at TEXT,
  PRIMARY KEY (thread_id, account_id)
);

CREATE TABLE IF NOT EXISTS bff_message_entries (
  id         TEXT PRIMARY KEY,
  thread_id  TEXT NOT NULL REFERENCES bff_message_threads(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'visible' CHECK (visibility IN ('visible', 'hidden', 'restricted', 'deleted')),
  report_count INTEGER NOT NULL DEFAULT 0,
  reported_at TEXT,
  moderated_at TEXT,
  moderated_by_account_id TEXT REFERENCES bff_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_message_participants_account
  ON bff_message_participants(account_id, status);

CREATE INDEX IF NOT EXISTS idx_bff_message_entries_thread
  ON bff_message_entries(thread_id, created_at);

ALTER TABLE bff_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_message_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_message_entries ENABLE ROW LEVEL SECURITY;
