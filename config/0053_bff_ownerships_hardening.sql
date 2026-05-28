ALTER TABLE bff_ownerships ADD COLUMN IF NOT EXISTS edition_number INTEGER;
ALTER TABLE bff_ownerships ADD COLUMN IF NOT EXISTS acquisition_type TEXT;
ALTER TABLE bff_ownerships ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

UPDATE bff_ownerships SET acquisition_type = 'collect' WHERE acquisition_type IS NULL;
