CREATE TABLE IF NOT EXISTS bff_townhall_posts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'restricted', 'deleted')),
  report_count INTEGER NOT NULL DEFAULT 0,
  reported_at TEXT,
  moderated_at TEXT,
  moderated_by_account_id TEXT,
  appeal_requested_at TEXT,
  appeal_requested_by_account_id TEXT,
  linked_object_kind TEXT CHECK (
    linked_object_kind IS NULL OR linked_object_kind IN ('drop', 'world', 'studio')
  ),
  linked_object_id TEXT,
  linked_object_label TEXT,
  linked_object_href TEXT
);

CREATE INDEX IF NOT EXISTS idx_bff_townhall_posts_created_at
  ON bff_townhall_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bff_townhall_posts_account_id
  ON bff_townhall_posts(account_id);

CREATE INDEX IF NOT EXISTS idx_bff_townhall_posts_status
  ON bff_townhall_posts(status);
