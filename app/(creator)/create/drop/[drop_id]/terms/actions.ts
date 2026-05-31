"use server";

import { redirect } from "next/navigation";
import { commerceBffService } from "@/lib/bff/service";
import { requireSessionRoles } from "@/lib/server/session";

function isChecked(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true";
}

// In-flow "set your terms" step.
//
// The creator confirms (or edits) the deal a collector agrees to, then the drop
// is published. We write BOTH the rights metadata (the license / proof) and the
// creator terms (the agreement) from the same fields, then publish — which is
// exactly what the market-law settlement gate requires before the drop can be
// collected. Terms are a deliberate creator act: nothing is auto-stamped; the
// creator submits this form.
//
// This calls the bff service directly (server-side), consistent with the other
// setup/account server actions in app/. In the deployed (bff) runtime the drop
// created via the gateway and these writes hit the same backend.
export async function commitDropDealAction(formData: FormData): Promise<void> {
  const session = await requireSessionRoles("/create/drop", ["creator"]);

  const dropId = String(formData.get("dropId") ?? "").trim();
  if (!dropId) {
    redirect("/create/drop");
  }

  const licenseType =
    String(formData.get("licenseType") ?? "").trim() || "personal-use-only";
  const commercialUse = isChecked(formData, "commercialUse");
  const derivativesAllowed = isChecked(formData, "derivativesAllowed");
  const attributionRequired = isChecked(formData, "attributionRequired");

  // Royalty is entered as a percentage (0–100) and stored as a 0–1 fraction.
  // It stays dormant until resale settlement is enabled; the default is none.
  const royaltyInput = Number.parseFloat(String(formData.get("royaltyPct") ?? "").trim());
  const royaltyPct =
    Number.isFinite(royaltyInput) && royaltyInput > 0 ? Math.min(royaltyInput / 100, 1) : null;

  // upsertCreatorTerms refuses unless the caller owns the drop's studio, so it
  // gates the whole deal write (rights + publish only run if this succeeds).
  const terms = await commerceBffService.upsertCreatorTerms(session.accountId, dropId, {
    commercialUse,
    derivativesAllowed,
    attributionRequired,
    royaltyPct,
    termsVersion: "1.0"
  });
  if (!terms) {
    // Shouldn't happen — the creator just created this drop — so surface it loudly.
    throw new Error("Couldn't save your terms — confirm you own this drop.");
  }

  await commerceBffService.upsertRightsMetadataForDrop(dropId, {
    licenseType,
    commercialUse,
    derivativesAllowed,
    attributionRequired,
    royaltyPct,
    notes: null
  });

  // Publish on first set; when editing an already-live drop just update the deal —
  // re-publishing would reset the drop's release time.
  const current = await commerceBffService.getDropById(dropId);
  if (!current?.releaseAt) {
    const published = await commerceBffService.publishDrop(session.accountId, dropId);
    if (!published.ok) {
      throw new Error(`Couldn't publish this drop (${published.reason}).`);
    }
  }

  redirect(`/drops/${encodeURIComponent(dropId)}`);
}
