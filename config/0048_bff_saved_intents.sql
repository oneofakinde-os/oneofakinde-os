CREATE TABLE IF NOT EXISTS bff_saved_intents (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  saved_at TEXT NOT NULL,
  UNIQUE (account_id, drop_id)
);

CREATE INDEX IF NOT EXISTS idx_bff_saved_intents_account_id ON bff_saved_intents(account_id);
CREATE INDEX IF NOT EXISTS idx_bff_saved_intents_drop_id ON bff_saved_intents(drop_id);
