"use server";

import { gateway } from "@/lib/gateway";
import { SESSION_COOKIE, SESSION_ROLES_COOKIE } from "@/lib/session";
import { isSupabaseAuthEnabled } from "@/lib/supabase/config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();

  // Sign out of Supabase (if configured)
  if (isSupabaseAuthEnabled()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Best-effort; cookie deletion below still logs the user out.
    }
  }

  // Clear legacy custom session (if present — covers legacy-only and migration cases)
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token && !token.startsWith("supa_")) {
    try {
      await gateway.clearSession(token);
    } catch {
      // Best-effort remote session cleanup.
    }
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(SESSION_ROLES_COOKIE);
  redirect("/auth/sign-in");
}
