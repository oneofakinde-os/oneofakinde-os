ALTER TABLE bff_live_sessions
  DROP CONSTRAINT IF EXISTS bff_live_sessions_session_type_check;

ALTER TABLE bff_live_sessions
  ADD CONSTRAINT bff_live_sessions_session_type_check
  CHECK (session_type IN ('opening', 'event', 'studio_session'));

ALTER TABLE bff_live_sessions
  DROP CONSTRAINT IF EXISTS bff_live_sessions_audience_eligibility_check;

ALTER TABLE bff_live_sessions
  ADD CONSTRAINT bff_live_sessions_audience_eligibility_check
  CHECK (audience_eligibility IN ('open', 'membership', 'patron', 'invite'));

ALTER TABLE bff_live_sessions
  DROP CONSTRAINT IF EXISTS bff_live_sessions_exclusive_drop_window_delay_check;

ALTER TABLE bff_live_sessions
  ADD CONSTRAINT bff_live_sessions_exclusive_drop_window_delay_check
  CHECK (exclusive_drop_window_delay IS NULL OR exclusive_drop_window_delay >= 1440);

ALTER TABLE bff_live_sessions
  DROP CONSTRAINT IF EXISTS bff_live_sessions_capacity_check;

ALTER TABLE bff_live_sessions
  ADD CONSTRAINT bff_live_sessions_capacity_check
  CHECK (capacity > 0);
