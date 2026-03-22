CREATE TABLE IF NOT EXISTS bff_workshop_pro_profiles (
  studio_handle TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  cycle_anchor_at TEXT NOT NULL,
  past_due_at TEXT,
  grace_ends_at TEXT,
  locked_at TEXT,
  updated_at TEXT NOT NULL
);
