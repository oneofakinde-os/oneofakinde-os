"use server";

import { gateway } from "@/lib/gateway";
import type { AccountRole } from "@/lib/domain/contracts";
import { normalizeReturnTo, serializeSessionRoles, SESSION_COOKIE, SESSION_ROLES_COOKIE } from "@/lib/session";
import { buildDefaultEntryFlow } from "@/lib/system-flow";
import { cookies } from "next/headers";
import type { Route } from "next";
import { redirect } from "next/navigation";

function normalizeRole(value: FormDataEntryValue | null): AccountRole {
  return value === "creator" ? "creator" : "collector";
}

export async function signInAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = normalizeRole(formData.get("role"));
  const returnTo = String(formData.get("returnTo") ?? "");

  if (!email || !email.includes("@")) {
    redirect(`/auth/sign-in?error=invalid_email&returnTo=${encodeURIComponent(returnTo)}` as Route);
  }

  let session: Awaited<ReturnType<typeof gateway.createSession>>;
  try {
    session = await gateway.createSession({ email, role });
  } catch {
    redirect(
      `/auth/sign-in?error=auth_service_unavailable&returnTo=${encodeURIComponent(returnTo)}` as Route
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

  const defaultReturnTo = buildDefaultEntryFlow().finalReturnTo;
  redirect(normalizeReturnTo(returnTo, defaultReturnTo) as Route);
}
