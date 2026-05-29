CREATE TABLE IF NOT EXISTS bff_studio_dispatches (
  id TEXT PRIMARY KEY,
  studio_handle TEXT NOT NULL,
  creator_account_id TEXT NOT NULL,
  audience_scope TEXT NOT NULL,
  related_drop_id TEXT,
  related_world_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_bff_studio_dispatches_studio ON bff_studio_dispatches(studio_handle);
CREATE INDEX IF NOT EXISTS idx_bff_studio_dispatches_creator ON bff_studio_dispatches(creator_account_id);
CREATE INDEX IF NOT EXISTS idx_bff_studio_dispatches_status ON bff_studio_dispatches(status);
CREATE INDEX IF NOT EXISTS idx_bff_studio_dispatches_created_at ON bff_studio_dispatches(created_at DESC);

CREATE TABLE IF NOT EXISTS bff_recognition_notes (
  id TEXT PRIMARY KEY,
  creator_account_id TEXT NOT NULL,
  studio_handle TEXT NOT NULL,
  collector_account_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  drop_id TEXT NOT NULL,
  note TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_recognition_notes_creator ON bff_recognition_notes(creator_account_id);
CREATE INDEX IF NOT EXISTS idx_bff_recognition_notes_collector ON bff_recognition_notes(collector_account_id);
CREATE INDEX IF NOT EXISTS idx_bff_recognition_notes_drop ON bff_recognition_notes(drop_id);

CREATE TABLE IF NOT EXISTS bff_studio_dispatch_recipients (
  id TEXT PRIMARY KEY,
  dispatch_id TEXT NOT NULL REFERENCES bff_studio_dispatches(id) ON DELETE CASCADE,
  recipient_account_id TEXT NOT NULL,
  delivered_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_dispatch_recipients_dispatch ON bff_studio_dispatch_recipients(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_bff_dispatch_recipients_account ON bff_studio_dispatch_recipients(recipient_account_id);
