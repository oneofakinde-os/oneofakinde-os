CREATE TABLE IF NOT EXISTS bff_creator_terms (
  id                   TEXT        PRIMARY KEY,
  creator_account_id   TEXT        NOT NULL,
  drop_id              TEXT        NOT NULL,
  terms_version        TEXT        NOT NULL DEFAULT '1.0',
  commercial_use       BOOLEAN     NOT NULL DEFAULT FALSE,
  derivatives_allowed  BOOLEAN     NOT NULL DEFAULT FALSE,
  attribution_required BOOLEAN     NOT NULL DEFAULT TRUE,
  royalty_pct          NUMERIC(5,4),
  notes                TEXT,
  accepted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bff_creator_terms_drop_id_idx ON bff_creator_terms (drop_id);
CREATE INDEX IF NOT EXISTS bff_creator_terms_creator_account_id_idx ON bff_creator_terms (creator_account_id);
