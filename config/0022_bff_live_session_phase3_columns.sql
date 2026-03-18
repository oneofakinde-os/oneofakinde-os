ALTER TABLE bff_live_sessions
  ADD COLUMN IF NOT EXISTS session_type TEXT;

UPDATE bff_live_sessions
SET session_type = 'event'
WHERE session_type IS NULL;

ALTER TABLE bff_live_sessions
  ALTER COLUMN session_type SET DEFAULT 'event',
  ALTER COLUMN session_type SET NOT NULL;

ALTER TABLE bff_live_sessions
  ADD COLUMN IF NOT EXISTS audience_eligibility TEXT;

UPDATE bff_live_sessions
SET audience_eligibility = CASE
  WHEN eligibility_rule = 'membership_active' THEN 'membership'
  WHEN eligibility_rule = 'drop_owner' THEN 'invite'
  ELSE 'open'
END
WHERE audience_eligibility IS NULL;

ALTER TABLE bff_live_sessions
  ALTER COLUMN audience_eligibility SET DEFAULT 'open',
  ALTER COLUMN audience_eligibility SET NOT NULL;

ALTER TABLE bff_live_sessions
  ADD COLUMN IF NOT EXISTS spatial_audio BOOLEAN;

UPDATE bff_live_sessions
SET spatial_audio = FALSE
WHERE spatial_audio IS NULL;

ALTER TABLE bff_live_sessions
  ALTER COLUMN spatial_audio SET DEFAULT FALSE,
  ALTER COLUMN spatial_audio SET NOT NULL;

ALTER TABLE bff_live_sessions
  ADD COLUMN IF NOT EXISTS exclusive_drop_window_drop_id TEXT REFERENCES bff_catalog_drops(id) ON DELETE SET NULL;

ALTER TABLE bff_live_sessions
  ADD COLUMN IF NOT EXISTS exclusive_drop_window_delay INTEGER;

ALTER TABLE bff_live_sessions
  ADD COLUMN IF NOT EXISTS capacity INTEGER;

UPDATE bff_live_sessions
SET capacity = 200
WHERE capacity IS NULL;

ALTER TABLE bff_live_sessions
  ALTER COLUMN capacity SET DEFAULT 200,
  ALTER COLUMN capacity SET NOT NULL;
