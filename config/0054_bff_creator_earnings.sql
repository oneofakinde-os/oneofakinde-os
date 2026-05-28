CREATE TABLE IF NOT EXISTS bff_creator_earnings (
  id TEXT PRIMARY KEY,
  studio_handle TEXT NOT NULL,
  drop_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL UNIQUE,
  ledger_transaction_id TEXT NOT NULL,
  gross_amount_usd NUMERIC(12, 2) NOT NULL,
  platform_fee_usd NUMERIC(12, 2) NOT NULL,
  net_amount_usd NUMERIC(12, 2) NOT NULL,
  payout_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_creator_earnings_studio_handle ON bff_creator_earnings(studio_handle);
CREATE INDEX IF NOT EXISTS idx_bff_creator_earnings_drop_id ON bff_creator_earnings(drop_id);
CREATE INDEX IF NOT EXISTS idx_bff_creator_earnings_receipt_id ON bff_creator_earnings(receipt_id);
CREATE INDEX IF NOT EXISTS idx_bff_creator_earnings_payout_status ON bff_creator_earnings(payout_status);
