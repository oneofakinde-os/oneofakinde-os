"use server";

import { commerceBffService } from "@/lib/bff/service";
import { requireSession } from "@/lib/server/session";
import { revalidatePath } from "next/cache";
import type { DmRestriction } from "@/lib/domain/contracts";

export type ProfileUpdateResult = {
  ok: boolean;
  error?: string;
  displayName?: string;
  bio?: string;
};

export async function updateProfileAction(formData: FormData): Promise<ProfileUpdateResult> {
  const session = await requireSession("/settings/account");

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (displayName && displayName.length > 100) {
    return { ok: false, error: "display name must be under 100 characters" };
  }

  if (bio.length > 500) {
    return { ok: false, error: "bio must be under 500 characters" };
  }

  const updates: { displayName?: string; bio?: string } = {};
  if (displayName) updates.displayName = displayName;
  if (bio !== undefined) updates.bio = bio;

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "nothing to update" };
  }

  const updated = await commerceBffService.updateAccountProfile(session.accountId, updates);
  if (!updated) {
    return { ok: false, error: "account not found" };
  }

  revalidatePath("/settings/account");
  revalidatePath(`/collectors/${session.handle}`);

  return {
    ok: true,
    displayName: updated.displayName,
    bio: updated.bio ?? "",
  };
}

const VALID_DM_RESTRICTIONS: ReadonlySet<DmRestriction> = new Set([
  "anyone", "followers_only", "mutual_only", "no_one"
]);

export async function updateStudioSafetyAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession("/settings/account");

  const rawDm = String(formData.get("dmRestriction") ?? "anyone").trim();
  const dmRestriction: DmRestriction = VALID_DM_RESTRICTIONS.has(rawDm as DmRestriction)
    ? (rawDm as DmRestriction)
    : "anyone";

  const rawKeywords = String(formData.get("keywordFilters") ?? "").trim();
  const keywordFilters = rawKeywords
    ? rawKeywords.split(",").map((kw) => kw.trim()).filter(Boolean)
    : [];

  const onlineStatusVisible = formData.get("onlineStatusVisible") !== "false";
  const hideLikeCounts = formData.get("hideLikeCounts") === "true";
  const isPrivate = formData.get("isPrivate") === "true";

  const updated = await commerceBffService.updateStudioSafetySettings(
    session.accountId,
    { dmRestriction, keywordFilters, onlineStatusVisible, hideLikeCounts }
  );

  if (!updated) {
    return { ok: false, error: "studio not found — are you a creator?" };
  }

  await commerceBffService.updateStudioPrivacy(session.accountId, isPrivate);

  revalidatePath("/settings/account");
  return { ok: true };
}
