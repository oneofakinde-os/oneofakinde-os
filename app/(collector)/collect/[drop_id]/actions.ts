"use server";

import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

async function resolveAppBaseUrl(): Promise<string> {
  // Check explicit config first, then NEXT_PUBLIC_SITE_URL, then headers.
  const configured =
    process.env.OOK_APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return trimTrailingSlashes(configured);
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) {
    return "http://127.0.0.1:3000";
  }

  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");

  return `${protocol}://${host}`;
}

export async function purchaseDropAction(formData: FormData): Promise<void> {
  const dropId = String(formData.get("drop_id") ?? "").trim();

  if (!dropId) {
    redirect("/my-collection");
  }

  // Use unified session resolution (Supabase first, then legacy cookie).
  const session = await getOptionalSession();

  if (!session) {
    redirect(`/auth/sign-in?returnTo=${encodeURIComponent(`/collect/${dropId}`)}`);
  }

  const baseUrl = await resolveAppBaseUrl();
  const checkoutSession = await gateway.createCheckoutSession(session.accountId, dropId, {
    successUrl: `${baseUrl}/my-collection?status=checkout_success`,
    cancelUrl: `${baseUrl}/collect/${encodeURIComponent(dropId)}?status=checkout_cancelled`
  });

  if (!checkoutSession) {
    redirect(`/collect/${encodeURIComponent(dropId)}?status=checkout_unavailable`);
  }

  if (checkoutSession.status === "already_owned") {
    redirect(
      `/my-collection?receipt=${encodeURIComponent(checkoutSession.receiptId)}&status=${encodeURIComponent("already_owned")}`
    );
  }

  if (checkoutSession.provider === "manual") {
    const receipt = await gateway.completePendingPayment(checkoutSession.paymentId);
    if (!receipt) {
      redirect("/my-collection?status=payment_pending");
    }
    redirect(
      `/my-collection?receipt=${encodeURIComponent(receipt.id)}&status=${encodeURIComponent(receipt.status)}`
    );
  }

  if (!checkoutSession.checkoutUrl) {
    redirect(`/collect/${encodeURIComponent(dropId)}?status=checkout_missing_url`);
  }

  redirect(checkoutSession.checkoutUrl as never);
}
