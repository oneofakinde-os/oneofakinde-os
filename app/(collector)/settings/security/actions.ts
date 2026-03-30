"use server";

import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import type { Route } from "next";
import { redirect } from "next/navigation";

function securityRedirect(params: string): never {
  redirect(`/settings/security?${params}` as Route);
}

export async function enrollTotpAction(): Promise<void> {
  const session = await requireSession("/settings/security");
  const enrollment = await gateway.createTotpEnrollment(session.accountId);
  if (!enrollment) {
    securityRedirect("totp_status=enroll_failed");
  }
  securityRedirect(`totp_status=enrolled&enrollment_id=${encodeURIComponent(enrollment.id)}`);
}

export async function verifyTotpAction(formData: FormData): Promise<void> {
  const session = await requireSession("/settings/security");
  const code = String(formData.get("code") ?? "").trim();
  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    securityRedirect("totp_status=invalid_code");
  }
  const enrollment = await gateway.verifyTotpEnrollment(session.accountId, code);
  if (!enrollment) {
    securityRedirect("totp_status=verify_failed");
  }
  securityRedirect("totp_status=verified");
}

export async function disableTotpAction(): Promise<void> {
  const session = await requireSession("/settings/security");
  const disabled = await gateway.disableTotpEnrollment(session.accountId);
  if (!disabled) {
    securityRedirect("totp_status=disable_failed");
  }
  securityRedirect("totp_status=disabled");
}
