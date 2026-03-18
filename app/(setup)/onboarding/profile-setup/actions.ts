"use server";

import { normalizeReturnTo } from "@/lib/session";
import type { Route } from "next";
import { redirect } from "next/navigation";

export async function completeProfileSetupAction(formData: FormData): Promise<void> {
  const returnTo = String(formData.get("returnTo") ?? "");
  redirect(normalizeReturnTo(returnTo, "/townhall") as Route);
}
