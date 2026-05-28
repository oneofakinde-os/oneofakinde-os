CREATE TABLE IF NOT EXISTS bff_saved_intents (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  status TEXT NOT NULL,
  creator_visible_aggregate BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL,
  removed_at TEXT,
  UNIQUE (account_id, drop_id, signal_type)
);

CREATE TABLE IF NOT EXISTS bff_rights_metadata (
  drop_id TEXT PRIMARY KEY REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  schema_version TEXT NOT NULL,
  rights_holder_handle TEXT NOT NULL,
  license_summary TEXT NOT NULL,
  permitted_uses JSONB NOT NULL DEFAULT '[]',
  attribution_required BOOLEAN NOT NULL DEFAULT TRUE,
  commercial_use_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  remix_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  ai_training_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  governing_jurisdiction TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_creator_terms (
  drop_id TEXT PRIMARY KEY REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  schema_version TEXT NOT NULL,
  creator_handle TEXT NOT NULL,
  terms_summary TEXT NOT NULL,
  edition_policy TEXT NOT NULL,
  proof_required_before_collect BOOLEAN NOT NULL DEFAULT TRUE,
  transfer_rules JSONB NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_ownership_records (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  drop_id TEXT REFERENCES bff_catalog_drops(id) ON DELETE SET NULL,
  certificate_id TEXT,
  receipt_id TEXT,
  status TEXT NOT NULL,
  acquisition_method TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revoked_at TEXT,
  transferred_at TEXT,
  transferred_to_account_id TEXT REFERENCES bff_accounts(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS bff_provenance_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  actor_account_id TEXT REFERENCES bff_accounts(id) ON DELETE SET NULL,
  studio_handle TEXT,
  ownership_id TEXT,
  certificate_id TEXT,
  media_asset_id TEXT,
  receipt_id TEXT,
  previous_event_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_certificate_previews (
  id TEXT PRIMARY KEY,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  collector_account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  rights_summary TEXT NOT NULL,
  creator_terms_summary TEXT NOT NULL,
  previewed_at TEXT NOT NULL
);

ALTER TABLE bff_certificates
  ADD COLUMN IF NOT EXISTS previewed_at TEXT,
  ADD COLUMN IF NOT EXISTS rights_summary TEXT,
  ADD COLUMN IF NOT EXISTS creator_terms_summary TEXT;

CREATE TABLE IF NOT EXISTS bff_collector_vaults (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE REFERENCES bff_accounts(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'private',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_policy_gate_events (
  id TEXT PRIMARY KEY,
  gate_name TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_saved_intents_account ON bff_saved_intents(account_id, status);
CREATE INDEX IF NOT EXISTS idx_bff_saved_intents_drop ON bff_saved_intents(drop_id, status);
CREATE INDEX IF NOT EXISTS idx_bff_ownership_records_account ON bff_ownership_records(account_id, status);
CREATE INDEX IF NOT EXISTS idx_bff_ownership_records_drop ON bff_ownership_records(drop_id, status);
CREATE INDEX IF NOT EXISTS idx_bff_provenance_events_subject ON bff_provenance_events(subject_type, subject_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_bff_provenance_events_previous ON bff_provenance_events(previous_event_id);
CREATE INDEX IF NOT EXISTS idx_bff_certificate_previews_drop_account ON bff_certificate_previews(drop_id, collector_account_id);
CREATE INDEX IF NOT EXISTS idx_bff_policy_gate_events_gate ON bff_policy_gate_events(gate_name, created_at);
