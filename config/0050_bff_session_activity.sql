-- Sprint 2B — AID-009: session inactivity timeout
-- Add last_activity_at column to bff_sessions for sliding window expiry.
ALTER TABLE bff_sessions
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
