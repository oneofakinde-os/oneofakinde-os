import { gateway } from "@/lib/gateway";
import { commerceBffService } from "@/lib/bff/service";
import type { AccountRole, Session } from "@/lib/domain/contracts";
import { SESSION_COOKIE, normalizeReturnTo } from "@/lib/session";
import { isSupabaseAuthEnabled } from "@/lib/supabase/config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Try to resolve a session from Supabase Auth.
 * Returns null if Supabase is not configured or no valid user.
 */
async function getSupabaseSession(): Promise<Session | null> {
  if (!isSupabaseAuthEnabled()) {
    return null;
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    return commerceBffService.resolveSupabaseSession(user);
  } catch {
    return null;
  }
}

export async function getOptionalSession(): Promise<Session | null> {
  // 1. Try Supabase Auth first
  const supabaseSession = await getSupabaseSession();
  if (supabaseSession) {
    return supabaseSession;
  }

  // 2. Fall back to custom session token
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return gateway.getSessionByToken(token);
}

export async function requireSession(returnTo: string): Promise<Session> {
  const session = await getOptionalSession();

  if (session) {
    return session;
  }

  redirect(`/auth/sign-in?returnTo=${encodeURIComponent(normalizeReturnTo(returnTo))}`);
}

export async function requireSessionRoles(
  returnTo: string,
  allowedRoles: AccountRole[]
): Promise<Session> {
  const session = await requireSession(returnTo);
  const roleSet = new Set(session.roles);
  const hasAllowedRole = allowedRoles.some((role) => roleSet.has(role));

  if (hasAllowedRole) {
    return session;
  }

  redirect(
    `/auth/sign-in?error=role_required&returnTo=${encodeURIComponent(normalizeReturnTo(returnTo))}`
  );
}

/**
 * Fetch the unread notification count for a session.
 * Returns 0 on failure — never blocks page rendering.
 */
export async function getUnreadNotificationCount(accountId: string): Promise<number> {
  try {
    return await gateway.getNotificationUnreadCount(accountId);
  } catch {
    return 0;
  }
}
