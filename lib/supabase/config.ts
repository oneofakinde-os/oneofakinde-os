/**
 * Returns true when Supabase Auth is fully configured.
 * When false, the app falls back to the legacy custom session system.
 */
export function isSupabaseAuthEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}
