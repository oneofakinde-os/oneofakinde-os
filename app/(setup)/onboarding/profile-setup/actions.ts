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

  // Persist discovery card selections
  const selectedCards = parseSelectedDiscoveryCards(formData);
  const seed = resolveOnboardingDiscoverySeed(selectedCards);
  await commerceBffService.seedOnboardingDiscoverySignals(session.accountId, seed.cardIds);

  // Persist profile fields (displayName, bio)
  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const updates: { displayName?: string; bio?: string } = {};
  if (displayName && displayName.length <= 100) {
    updates.displayName = displayName;
  }
  if (bio && bio.length <= 500) {
    updates.bio = bio;
  }

  if (Object.keys(updates).length > 0) {
    await commerceBffService.updateAccountProfile(session.accountId, updates);
  }

  redirect(returnTo as Route);
}
