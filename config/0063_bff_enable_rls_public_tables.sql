-- 0063_bff_enable_rls_public_tables.sql
--
-- Security hardening surfaced by running the schema on real Supabase Postgres
-- (advisor lint 0013_rls_disabled_in_public, ERROR). Enable Row Level Security on
-- the public BFF tables that were missing it, so Supabase's auto-generated
-- (PostgREST / anon) data API cannot read or write them directly — a path that
-- would otherwise BYPASS the application's market-law settlement gates.
--
-- This matches the deny-all-via-PostgREST posture already used by the rest of the
-- BFF schema (RLS enabled, no policies). The application connects as the table
-- owner via DATABASE_URL and is NOT subject to RLS (no FORCE ROW LEVEL SECURITY),
-- so server-side access is unaffected; only the unused public data API is locked.
-- ENABLE ROW LEVEL SECURITY is idempotent, so this migration is safe to re-run.

ALTER TABLE IF EXISTS public.bff_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_saved_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_provenance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_rights_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_transfer_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_governance_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_recognition_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_studio_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_studio_dispatch_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_personalization_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_creator_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_certificate_previews ENABLE ROW LEVEL SECURITY;
