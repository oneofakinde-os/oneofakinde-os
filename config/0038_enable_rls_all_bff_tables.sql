-- Enable Row Level Security on all BFF tables.
--
-- The app connects server-side via the `postgres` role which bypasses RLS,
-- so this migration does NOT break existing functionality.  It locks out
-- direct client-side access (anon / authenticated roles) until explicit
-- policies are added per-table.
--
-- Public catalog tables get a read-only policy for the anon role so the
-- storefront can be browsed without authentication.

-- ─── Enable RLS on every BFF table ──────────────────────────────────────

ALTER TABLE bff_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_catalog_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_catalog_worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_catalog_studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_ownerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_saved_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_receipt_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_watch_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_watch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_membership_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_patrons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_patron_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_patron_tier_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_live_session_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_live_session_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_live_session_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_townhall_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_townhall_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_townhall_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_townhall_post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_townhall_post_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_townhall_post_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_townhall_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_townhall_telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_world_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_collect_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_collect_enforcement_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_world_collect_ownerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_world_release_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_ledger_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_notification_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_drop_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_authorized_derivatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_studio_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_library_eligibility_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE bff_workshop_pro_profiles ENABLE ROW LEVEL SECURITY;

-- ─── Public catalog: anon can browse drops, worlds, studios ─────────────

CREATE POLICY catalog_drops_anon_read ON bff_catalog_drops
  FOR SELECT TO anon USING (true);

CREATE POLICY catalog_worlds_anon_read ON bff_catalog_worlds
  FOR SELECT TO anon USING (true);

CREATE POLICY catalog_studios_anon_read ON bff_catalog_studios
  FOR SELECT TO anon USING (true);

-- ─── Public social: anon can read townhall content ──────────────────────

CREATE POLICY townhall_likes_anon_read ON bff_townhall_likes
  FOR SELECT TO anon USING (true);

CREATE POLICY townhall_comments_anon_read ON bff_townhall_comments
  FOR SELECT TO anon USING (true);

CREATE POLICY townhall_posts_anon_read ON bff_townhall_posts
  FOR SELECT TO anon USING (true);

CREATE POLICY townhall_shares_anon_read ON bff_townhall_shares
  FOR SELECT TO anon USING (true);

-- ─── Public discovery: anon can read live session listings ──────────────

CREATE POLICY live_sessions_anon_read ON bff_live_sessions
  FOR SELECT TO anon USING (true);

-- ─── Authenticated user: read own data ──────────────────────────────────
-- These policies use auth.uid() which maps to Supabase Auth user IDs.
-- Until Supabase Auth is integrated these are inert but ready.

CREATE POLICY accounts_own_read ON bff_accounts
  FOR SELECT TO authenticated USING (id = auth.uid()::text);

CREATE POLICY sessions_own_read ON bff_sessions
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY ownerships_own_read ON bff_ownerships
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY saved_drops_own_read ON bff_saved_drops
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY receipts_own_read ON bff_receipts
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY certificates_own_read ON bff_certificates
  FOR SELECT TO authenticated USING (owner_account_id = auth.uid()::text);

CREATE POLICY receipt_badges_own_read ON bff_receipt_badges
  FOR SELECT TO authenticated USING (owner_account_id = auth.uid()::text);

CREATE POLICY payments_own_read ON bff_payments
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY watch_grants_own_read ON bff_watch_access_grants
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY watch_sessions_own_read ON bff_watch_sessions
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY membership_own_read ON bff_membership_entitlements
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY patrons_own_read ON bff_patrons
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY patron_commitments_own_read ON bff_patron_commitments
  FOR SELECT TO authenticated
  USING (patron_id IN (
    SELECT id FROM bff_patrons WHERE account_id = auth.uid()::text
  ));

CREATE POLICY notification_entries_own_read ON bff_notification_entries
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY notification_prefs_own_read ON bff_notification_preferences
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY library_eligibility_own_read ON bff_library_eligibility_states
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY studio_follows_own_read ON bff_studio_follows
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY collect_offers_own_read ON bff_collect_offers
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

CREATE POLICY world_collect_own_read ON bff_world_collect_ownerships
  FOR SELECT TO authenticated USING (account_id = auth.uid()::text);

-- ─── Authenticated: also read public catalog + social ───────────────────

CREATE POLICY catalog_drops_auth_read ON bff_catalog_drops
  FOR SELECT TO authenticated USING (true);

CREATE POLICY catalog_worlds_auth_read ON bff_catalog_worlds
  FOR SELECT TO authenticated USING (true);

CREATE POLICY catalog_studios_auth_read ON bff_catalog_studios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY townhall_likes_auth_read ON bff_townhall_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY townhall_comments_auth_read ON bff_townhall_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY townhall_posts_auth_read ON bff_townhall_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY townhall_shares_auth_read ON bff_townhall_shares
  FOR SELECT TO authenticated USING (true);

CREATE POLICY live_sessions_auth_read ON bff_live_sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY drop_versions_auth_read ON bff_drop_versions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY authorized_derivatives_auth_read ON bff_authorized_derivatives
  FOR SELECT TO authenticated USING (true);

CREATE POLICY patron_tier_configs_auth_read ON bff_patron_tier_configs
  FOR SELECT TO authenticated USING (true);
