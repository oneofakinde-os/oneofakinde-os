"use server";

import { gateway } from "@/lib/gateway";
import { requireSessionRoles } from "@/lib/server/session";
import type { Route } from "next";
import { redirect } from "next/navigation";

function workshopOffersRedirect(query: string): never {
  redirect(`/workshop/offers${query}` as Route);
}

export async function acceptOfferAction(formData: FormData) {
  const session = await requireSessionRoles("/workshop/offers", ["creator"]);
  const dropId = formData.get("dropId") as string | null;
  const offerId = formData.get("offerId") as string | null;
  if (!dropId || !offerId) {
    workshopOffersRedirect("?offer_status=invalid_input");
  }

  const result = await gateway.transitionCollectOffer({
    accountId: session.accountId,
    offerId,
    action: "accept_offer"
  });

  if (!result) {
    workshopOffersRedirect("?offer_status=accept_failed");
  }

  workshopOffersRedirect(`?offer_status=accepted&offer_drop=${encodeURIComponent(dropId)}`);
}

export async function settleOfferAction(formData: FormData) {
  const session = await requireSessionRoles("/workshop/offers", ["creator"]);
  const dropId = formData.get("dropId") as string | null;
  const offerId = formData.get("offerId") as string | null;
  const executionPriceRaw = formData.get("executionPriceUsd") as string | null;
  if (!dropId || !offerId) {
    workshopOffersRedirect("?offer_status=invalid_input");
  }

  const executionPriceUsd = executionPriceRaw ? Number(executionPriceRaw) : undefined;

  const result = await gateway.transitionCollectOffer({
    accountId: session.accountId,
    offerId,
    action: "settle_offer",
    executionPriceUsd
  });

  if (!result) {
    workshopOffersRedirect("?offer_status=settle_failed");
  }

  workshopOffersRedirect(`?offer_status=settled&offer_drop=${encodeURIComponent(dropId)}`);
}
