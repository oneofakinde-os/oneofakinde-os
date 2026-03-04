ALTER TABLE bff_payments
  ADD COLUMN IF NOT EXISTS quote_json JSONB;

ALTER TABLE bff_receipts
  ADD COLUMN IF NOT EXISTS subtotal_usd NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS processing_usd NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS commission_usd NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS payout_usd NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS quote_engine_version TEXT,
  ADD COLUMN IF NOT EXISTS ledger_transaction_id TEXT;

CREATE TABLE IF NOT EXISTS bff_ledger_transactions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('collect', 'refund', 'membership', 'patron')),
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT REFERENCES bff_catalog_drops(id) ON DELETE SET NULL,
  payment_id TEXT REFERENCES bff_payments(id) ON DELETE SET NULL,
  receipt_id TEXT REFERENCES bff_receipts(id) ON DELETE SET NULL,
  currency TEXT NOT NULL,
  subtotal_usd NUMERIC(12, 2) NOT NULL,
  processing_usd NUMERIC(12, 2) NOT NULL,
  total_usd NUMERIC(12, 2) NOT NULL,
  commission_usd NUMERIC(12, 2) NOT NULL,
  payout_usd NUMERIC(12, 2) NOT NULL,
  reversal_of_transaction_id TEXT REFERENCES bff_ledger_transactions(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_ledger_line_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES bff_ledger_transactions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('public', 'participant_private', 'internal')),
  amount_usd NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  recipient_account_id TEXT REFERENCES bff_accounts(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_ledger_transactions_account_id
  ON bff_ledger_transactions(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bff_ledger_transactions_receipt_id
  ON bff_ledger_transactions(receipt_id);
CREATE INDEX IF NOT EXISTS idx_bff_ledger_line_items_transaction_id
  ON bff_ledger_line_items(transaction_id);
