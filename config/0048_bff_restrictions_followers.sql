-- Sprint 1 — shadow-restrict + private-studio follower requests.
-- Uses IF NOT EXISTS for idempotency (roll-forward policy).

CREATE TABLE IF NOT EXISTS bff_restrictions (
  restrictor_account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  restricted_account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (restrictor_account_id, restricted_account_id)
);

CREATE TABLE IF NOT EXISTS bff_follower_requests (
  requester_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  target_studio_handle TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  PRIMARY KEY (requester_id, target_studio_handle)
);
