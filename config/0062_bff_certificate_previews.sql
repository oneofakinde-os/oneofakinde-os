CREATE TABLE IF NOT EXISTS bff_certificate_previews (
  id                    TEXT        PRIMARY KEY,
  collector_account_id  TEXT        NOT NULL,
  drop_id               TEXT        NOT NULL,
  previewed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bff_certificate_previews_collector_drop_idx ON bff_certificate_previews (collector_account_id, drop_id);
CREATE INDEX IF NOT EXISTS bff_certificate_previews_drop_id_idx ON bff_certificate_previews (drop_id);
