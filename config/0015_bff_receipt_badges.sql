CREATE TABLE IF NOT EXISTS bff_receipt_badges (
  id TEXT PRIMARY KEY,
  drop_title TEXT NOT NULL,
  world_title TEXT,
  collect_date TEXT NOT NULL,
  edition_position TEXT,
  collector_handle TEXT NOT NULL,
  created_at TEXT NOT NULL,
  receipt_id TEXT NOT NULL UNIQUE REFERENCES bff_receipts(id) ON DELETE CASCADE,
  owner_account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bff_receipt_badges_created_at ON bff_receipt_badges(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bff_receipt_badges_owner_account_id ON bff_receipt_badges(owner_account_id);
