CREATE TABLE IF NOT EXISTS bff_studio_follows (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  studio_handle TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (account_id, studio_handle)
);

CREATE INDEX IF NOT EXISTS idx_bff_studio_follows_studio
  ON bff_studio_follows(studio_handle);

CREATE INDEX IF NOT EXISTS idx_bff_studio_follows_account
  ON bff_studio_follows(account_id);
