-- bff_totp_enrollments (TOTP secrets, totp_uri, recovery codes) and bff_wallet_connections
-- (wallet data) were created in 0064 WITHOUT row-level security, re-opening the exact
-- PostgREST / anon data-API exposure that 0063 closed for 15 other public bff tables — and
-- the serious end of the spectrum, since these hold 2FA secrets (a path to defeating 2FA).
--
-- Enable RLS (no policies = deny-all via PostgREST; the app connects as the table owner via
-- DATABASE_URL and is not subject to RLS, matching 0063). Forward-only migration — 0064 is
-- already applied on CI and a test DB, so it stays immutable; 0065 closes the gap going forward.
ALTER TABLE IF EXISTS public.bff_totp_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bff_wallet_connections ENABLE ROW LEVEL SECURITY;
