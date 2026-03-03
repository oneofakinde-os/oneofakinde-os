"use server";

import type { AccountRole } from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";
import { normalizeReturnTo, serializeSessionRoles, SESSION_COOKIE, SESSION_ROLES_COOKIE } from "@/lib/session";
import { cookies } from "next/headers";
import type { Route } from "next";
import { redirect } from "next/navigation";

function normalizeRole(value: FormDataEntryValue | null): AccountRole {
  return value === "creator" ? "creator" : "collector";
}

export async function signUpAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = normalizeRole(formData.get("role"));
  const returnTo = String(formData.get("returnTo") ?? "");

  if (!email || !email.includes("@")) {
    redirect(`/auth/sign-up?error=invalid_email&returnTo=${encodeURIComponent(returnTo)}` as Route);
  }

  const session = await gateway.createSession({ email, role });
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

  const finalReturnTo = normalizeReturnTo(returnTo, "/showroom");
  const onboardingReturnTo = finalReturnTo.startsWith("/onboarding/profile-setup")
    ? finalReturnTo
    : `/onboarding/profile-setup?returnTo=${encodeURIComponent(finalReturnTo)}`;
  redirect(`/auth/wallet-connect?returnTo=${encodeURIComponent(onboardingReturnTo)}` as Route);
}
