-- Townhall post saves
CREATE TABLE IF NOT EXISTS bff_townhall_post_saves (
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES bff_townhall_posts(id) ON DELETE CASCADE,
  saved_at TEXT NOT NULL,
  PRIMARY KEY (account_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_bff_townhall_post_saves_post
  ON bff_townhall_post_saves(post_id);

-- Townhall post follows
CREATE TABLE IF NOT EXISTS bff_townhall_post_follows (
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES bff_townhall_posts(id) ON DELETE CASCADE,
  followed_at TEXT NOT NULL,
  PRIMARY KEY (account_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_bff_townhall_post_follows_post
  ON bff_townhall_post_follows(post_id);

-- Townhall post shares
CREATE TABLE IF NOT EXISTS bff_townhall_post_shares (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES bff_townhall_posts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  shared_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_townhall_post_shares_post
  ON bff_townhall_post_shares(post_id);
