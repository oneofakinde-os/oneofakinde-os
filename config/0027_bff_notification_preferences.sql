CREATE TABLE IF NOT EXISTS bff_notification_preferences (
  account_id TEXT PRIMARY KEY REFERENCES bff_accounts(id) ON DELETE CASCADE,
  channels JSONB NOT NULL DEFAULT '{"in_app": true, "email": false, "push": false}',
  muted_types TEXT[] NOT NULL DEFAULT '{}',
  digest_enabled BOOLEAN NOT NULL DEFAULT TRUE
);
