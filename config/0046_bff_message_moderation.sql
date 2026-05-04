-- Super Matrix Wave 1.2 - private message report and moderation state.

ALTER TABLE bff_message_entries
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'visible'
    CHECK (visibility IN ('visible', 'hidden', 'restricted', 'deleted')),
  ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reported_at TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by_account_id TEXT REFERENCES bff_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bff_message_entries_moderation
  ON bff_message_entries(report_count, reported_at);
