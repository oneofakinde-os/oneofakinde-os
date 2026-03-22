import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * Used in client components for auth state changes, realtime, etc.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
