ALTER TABLE bff_patron_tier_configs
  ADD COLUMN IF NOT EXISTS commitment_cadence TEXT NOT NULL DEFAULT 'monthly';

ALTER TABLE bff_patron_tier_configs
  ADD COLUMN IF NOT EXISTS early_access_window_hours INTEGER NOT NULL DEFAULT 48;

UPDATE bff_patron_tier_configs
SET commitment_cadence = CASE
  WHEN period_days <= 7 THEN 'weekly'
  WHEN period_days >= 90 THEN 'quarterly'
  ELSE 'monthly'
END
WHERE commitment_cadence NOT IN ('weekly', 'monthly', 'quarterly');

UPDATE bff_patron_tier_configs
SET early_access_window_hours = 48
WHERE early_access_window_hours <= 0 OR early_access_window_hours > 168;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bff_patron_tier_configs_commitment_cadence_check'
  ) THEN
    ALTER TABLE bff_patron_tier_configs
      ADD CONSTRAINT bff_patron_tier_configs_commitment_cadence_check
      CHECK (commitment_cadence IN ('weekly', 'monthly', 'quarterly'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bff_patron_tier_configs_early_access_window_hours_check'
  ) THEN
    ALTER TABLE bff_patron_tier_configs
      ADD CONSTRAINT bff_patron_tier_configs_early_access_window_hours_check
      CHECK (early_access_window_hours > 0 AND early_access_window_hours <= 168);
  END IF;
END $$;
