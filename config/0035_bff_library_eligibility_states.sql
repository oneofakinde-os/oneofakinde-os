CREATE TABLE IF NOT EXISTS bff_library_eligibility_states (
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (account_id, drop_id)
);
