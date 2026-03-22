"use server";

import { isSupabaseAuthEnabled } from "@/lib/supabase/config";
import type { Route } from "next";
import { redirect } from "next/navigation";

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    redirect("/auth/reset-password?error=too_short" as Route);
  }

  if (password !== confirm) {
    redirect("/auth/reset-password?error=mismatch" as Route);
  }

  if (!isSupabaseAuthEnabled()) {
    redirect("/auth/reset-password?error=not_available" as Route);
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/auth/reset-password?error=update_failed" as Route);
  }

  redirect("/auth/sign-in?status=password_reset" as Route);
}
