CREATE TABLE IF NOT EXISTS bff_world_conversation_messages (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL REFERENCES bff_catalog_worlds(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  report_count INTEGER NOT NULL DEFAULT 0,
  reported_at TEXT,
  moderated_at TEXT,
  moderated_by_account_id TEXT REFERENCES bff_accounts(id) ON DELETE SET NULL,
  appeal_requested_at TEXT,
  appeal_requested_by_account_id TEXT REFERENCES bff_accounts(id) ON DELETE SET NULL
);

ALTER TABLE bff_world_conversation_messages
  DROP CONSTRAINT IF EXISTS bff_world_conversation_messages_status_check;

ALTER TABLE bff_world_conversation_messages
  ADD CONSTRAINT bff_world_conversation_messages_status_check
  CHECK (status IN ('visible', 'hidden', 'restricted', 'deleted'));

CREATE INDEX IF NOT EXISTS idx_bff_world_conversation_world_created
  ON bff_world_conversation_messages(world_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bff_world_conversation_world_status
  ON bff_world_conversation_messages(world_id, status);

