"use server";

import type { AccountRole } from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";
import { checkRateLimit, AUTH_RATE_LIMIT } from "@/lib/security/rate-limit";
import { normalizeReturnTo, serializeSessionRoles, SESSION_COOKIE, SESSION_ROLES_COOKIE } from "@/lib/session";
import { isSupabaseAuthEnabled } from "@/lib/supabase/config";
import { cookies, headers } from "next/headers";
import type { Route } from "next";
import { redirect } from "next/navigation";

function normalizeRole(value: FormDataEntryValue | null): AccountRole {
  return value === "creator" ? "creator" : "collector";
}

export async function signUpAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = normalizeRole(formData.get("role"));
  const returnTo = String(formData.get("returnTo") ?? "");

  if (!email || !email.includes("@")) {
    redirect(`/auth/sign-up?error=invalid_email&returnTo=${encodeURIComponent(returnTo)}` as Route);
  }

  // Rate limit by IP.
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitResult = checkRateLimit(`sign-up:${ip}`, AUTH_RATE_LIMIT);
  if (!rateLimitResult.allowed) {
    redirect(`/auth/sign-up?error=rate_limited&returnTo=${encodeURIComponent(returnTo)}` as Route);
  }

  // --- Supabase Auth path ---
  if (isSupabaseAuthEnabled()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role }
      }
    });

    if (error) {
      const errorCode = error.message.includes("already registered")
        ? "email_taken"
        : "signup_failed";
      redirect(
        `/auth/sign-up?error=${errorCode}&returnTo=${encodeURIComponent(returnTo)}` as Route
      );
    }

    // Supabase sets its own auth cookies via the server client.
    // The middleware reads Supabase session directly — no bridge cookies needed.
    const finalReturnTo = normalizeReturnTo(returnTo, "/townhall");
    redirect(finalReturnTo as Route);
  }

  // --- Legacy custom auth path ---
  let session: Awaited<ReturnType<typeof gateway.createSession>>;
  try {
    session = await gateway.createSession({ email, role });
  } catch {
    redirect(
      `/auth/sign-up?error=auth_service_unavailable&returnTo=${encodeURIComponent(returnTo)}` as Route
    );
  }
  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE,
    value: session.sessionToken,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14
  });
  cookieStore.set({
    name: SESSION_ROLES_COOKIE,
    value: serializeSessionRoles(session.roles),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14
  });

  const finalReturnTo = normalizeReturnTo(returnTo, "/townhall");
  redirect(finalReturnTo as Route);
}
