ALTER TABLE bff_accounts ADD COLUMN IF NOT EXISTS vault_visibility TEXT NOT NULL DEFAULT 'private';
