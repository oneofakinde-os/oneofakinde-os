-- Extend certificate status vocabulary to support review lifecycle.
-- The application layer enforces: verified → under_review → (verified | revoked).
-- No DB-level CHECK constraint so that pre-0057 rows remain valid on upgrade.
COMMENT ON COLUMN bff_certificates.status IS
  'verified | under_review | revoked — managed by governance case workflow';
