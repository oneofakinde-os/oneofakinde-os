"use server";

import { isSupabaseAuthEnabled } from "@/lib/supabase/config";
import type { Route } from "next";
import { redirect } from "next/navigation";

export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    redirect("/auth/forgot-password?error=invalid_email" as Route);
  }

  if (!isSupabaseAuthEnabled()) {
    redirect("/auth/forgot-password?error=not_available" as Route);
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/auth/reset-password`
  });

  if (error) {
    redirect("/auth/forgot-password?error=send_failed" as Route);
  }

  redirect("/auth/forgot-password?status=sent" as Route);
}
