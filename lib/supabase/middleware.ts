import type { AccountRole } from "@/lib/domain/contracts";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export type SupabaseMiddlewareResult = {
  response: NextResponse;
  /** True when a valid Supabase user was resolved. */
  hasSession: boolean;
  /** Roles extracted from Supabase user_metadata (if any). */
  sessionRoles: AccountRole[];
};

/**
 * Refreshes the Supabase session in middleware so that server components
 * always have a fresh token.  Returns the (possibly cookie-updated) response
 * along with session state for route-policy evaluation.
 *
 * If Supabase env vars are not configured this is a no-op that returns
 * hasSession: false.
 */
export async function refreshSupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<SupabaseMiddlewareResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { response, hasSession: false, sessionRoles: [] };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      }
    }
  });

  // Refresh session — this updates cookies if the access token was expired.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { response, hasSession: false, sessionRoles: [] };
  }

  const rawRole = user.user_metadata?.role;
  const role: AccountRole = rawRole === "creator" ? "creator" : "collector";

  return { response, hasSession: true, sessionRoles: [role] };
}
