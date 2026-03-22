-- Add avatar_url and bio columns to bff_accounts for profile personalization.

ALTER TABLE bff_accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE bff_accounts ADD COLUMN IF NOT EXISTS bio TEXT;
