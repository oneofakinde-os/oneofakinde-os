-- Extend notification preferences with quiet hours, digest mode,
-- frequency cap, and email category columns referenced by the BFF
-- persistence layer. Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- for idempotency (roll-forward policy).

ALTER TABLE bff_notification_preferences
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quiet_hours_from_hour INTEGER NOT NULL DEFAULT 22,
  ADD COLUMN IF NOT EXISTS quiet_hours_from_minute INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiet_hours_to_hour INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS quiet_hours_to_minute INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quiet_hours_timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS digest_mode TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS frequency_cap INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS email_categories JSONB NOT NULL DEFAULT '{}';
