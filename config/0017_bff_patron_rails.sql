CREATE TABLE IF NOT EXISTS bff_patrons (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  studio_handle TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'lapsed')),
  committed_at TEXT NOT NULL,
  lapsed_at TEXT,
  UNIQUE (account_id, studio_handle)
);

CREATE INDEX IF NOT EXISTS idx_bff_patrons_studio_handle
  ON bff_patrons(studio_handle);
CREATE INDEX IF NOT EXISTS idx_bff_patrons_status
  ON bff_patrons(status);

CREATE TABLE IF NOT EXISTS bff_patron_commitments (
  id TEXT PRIMARY KEY,
  patron_id TEXT NOT NULL REFERENCES bff_patrons(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  ledger_transaction_id TEXT NOT NULL REFERENCES bff_ledger_transactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bff_patron_commitments_patron_id
  ON bff_patron_commitments(patron_id, period_start DESC);
