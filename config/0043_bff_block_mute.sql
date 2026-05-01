-- Sprint 0.2 — Block + Mute (Master Engineer Plan v2)
--
-- Two one-way social-safety relationships:
--   bff_blocks  — blocker hides + restricts blocked account
--   bff_mutes   — muter hides only (no restriction)
--
-- Both tables cascade on account deletion so a deleted account is purged from
-- everyone's block/mute graph automatically. The PRIMARY KEY pair guarantees
-- idempotent insert: the BFF service uses ON CONFLICT DO NOTHING semantics.
--
-- Indexes on the second column accelerate "is X blocked by anyone?" lookups,
-- which the enforcement code uses when filtering comments, conversations,
-- and feed entries.

CREATE TABLE IF NOT EXISTS bff_blocks (
  blocker_account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  blocked_account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  created_at         TEXT NOT NULL,
  PRIMARY KEY (blocker_account_id, blocked_account_id)
);

CREATE TABLE IF NOT EXISTS bff_mutes (
  muter_account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  muted_account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  created_at       TEXT NOT NULL,
  PRIMARY KEY (muter_account_id, muted_account_id)
);

CREATE INDEX IF NOT EXISTS idx_bff_blocks_blocked
  ON bff_blocks(blocked_account_id);

CREATE INDEX IF NOT EXISTS idx_bff_mutes_muted
  ON bff_mutes(muted_account_id);
