"use server";

import { commerceBffService } from "@/lib/bff/service";
import { resolveOnboardingDiscoverySeed } from "@/lib/onboarding/discovery-cards";
import { routes } from "@/lib/routes";
import { requireSession } from "@/lib/server/session";
import { normalizeReturnTo } from "@/lib/session";
import type { Route } from "next";
import { redirect } from "next/navigation";

function parseSelectedDiscoveryCards(formData: FormData): string[] {
  return formData
    .getAll("taste_card_ids")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

export async function completeProfileSetupAction(formData: FormData): Promise<void> {
  const returnTo = normalizeReturnTo(String(formData.get("returnTo") ?? ""), "/townhall");
  const session = await requireSession(routes.profileSetup(returnTo));
  const selectedCards = parseSelectedDiscoveryCards(formData);
  const seed = resolveOnboardingDiscoverySeed(selectedCards);

  await commerceBffService.seedOnboardingDiscoverySignals(session.accountId, seed.cardIds);

  redirect(returnTo as Route);
}
