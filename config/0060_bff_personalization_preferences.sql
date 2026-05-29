CREATE TABLE IF NOT EXISTS bff_personalization_preferences (
  account_id TEXT PRIMARY KEY,
  disable_taste_graph BOOLEAN NOT NULL DEFAULT false,
  updated_at TEXT NOT NULL
);
