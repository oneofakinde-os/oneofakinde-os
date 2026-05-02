-- Sprint 0.1 — Account Deletion + Data Export (Master Engineer Plan v2)
--
-- Adds three GDPR-lifecycle timestamps to bff_accounts:
--   deletion_requested_at — set when the user requests soft-delete; starts
--                           the 30-day grace clock. Cleared on cancel.
--   deleted_at            — set by executeAccountDeletion after grace expires.
--   anonymized_at         — set together with deleted_at; signals that
--                           email + handle have been scrubbed and UGC
--                           anonymized to '[deleted]'.
--
-- A partial index on deletion_requested_at accelerates the scheduled-job
-- query that scans for accounts whose grace period has expired.
--
-- The plan numbered this 0022 but the codebase has drifted — block/mute is
-- 0043 and this is 0044. The plan's migration index is descriptive; the
-- codebase is authority. (Documented in DECISIONS.md under Sprint 0.2.)

ALTER TABLE bff_accounts
  ADD COLUMN IF NOT EXISTS deletion_requested_at TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at            TEXT,
  ADD COLUMN IF NOT EXISTS anonymized_at         TEXT;

CREATE INDEX IF NOT EXISTS idx_bff_accounts_deletion_requested
  ON bff_accounts(deletion_requested_at)
  WHERE deletion_requested_at IS NOT NULL;
