CREATE TABLE IF NOT EXISTS bff_governance_cases (
  id TEXT PRIMARY KEY,
  case_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  reporter_account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  related_drop_id TEXT,
  related_receipt_id TEXT,
  related_ownership_receipt_id TEXT,
  related_certificate_id TEXT,
  related_provenance_event_id TEXT,
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_bff_governance_cases_reporter ON bff_governance_cases(reporter_account_id);
CREATE INDEX IF NOT EXISTS idx_bff_governance_cases_status ON bff_governance_cases(status);
CREATE INDEX IF NOT EXISTS idx_bff_governance_cases_case_type ON bff_governance_cases(case_type);
CREATE INDEX IF NOT EXISTS idx_bff_governance_cases_subject ON bff_governance_cases(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_bff_governance_cases_drop ON bff_governance_cases(related_drop_id);
CREATE INDEX IF NOT EXISTS idx_bff_governance_cases_certificate ON bff_governance_cases(related_certificate_id);
