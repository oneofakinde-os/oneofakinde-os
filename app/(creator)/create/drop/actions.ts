"use server";

import { gateway } from "@/lib/gateway";
import { requireSessionRoles } from "@/lib/server/session";
import type { DropPricingType, SensitivityRating, WalletChain } from "@/lib/domain/contracts";
import { redirect } from "next/navigation";

export type CreateDropResult = {
  ok: boolean;
  dropId?: string;
  error?: string;
};

const VALID_PRICING_TYPES: ReadonlySet<DropPricingType> = new Set(["free", "fixed", "auction", "bundle_priced"]);
const VALID_WALLET_CHAINS: ReadonlySet<WalletChain> = new Set(["ethereum", "tezos", "polygon"]);
const VALID_SENSITIVITY_RATINGS: ReadonlySet<SensitivityRating> = new Set([
  "none",
  "advisory",
  "mature"
]);

export async function createDropAction(formData: FormData): Promise<CreateDropResult> {
  const session = await requireSessionRoles("/create/drop", ["creator"]);

  const title = String(formData.get("title") ?? "").trim();
  const worldId = String(formData.get("worldId") ?? "").trim();
  const synopsis = String(formData.get("synopsis") ?? "").trim();
  const rawPricingType = String(formData.get("pricingType") ?? "fixed").trim();
  const pricingType: DropPricingType = VALID_PRICING_TYPES.has(rawPricingType as DropPricingType)
    ? (rawPricingType as DropPricingType)
    : "fixed";
  const priceStr = String(formData.get("priceUsd") ?? "0").trim();
  const seasonLabel = String(formData.get("seasonLabel") ?? "").trim() || undefined;
  const episodeLabel = String(formData.get("episodeLabel") ?? "").trim() || undefined;
  const rawWalletGate = String(formData.get("walletGate") ?? "").trim();
  const walletGate: WalletChain | undefined =
    rawWalletGate && VALID_WALLET_CHAINS.has(rawWalletGate as WalletChain)
      ? (rawWalletGate as WalletChain)
      : undefined;

  const rawSensitivity = String(formData.get("sensitivityRating") ?? "").trim();
  const sensitivityRating: SensitivityRating | undefined =
    rawSensitivity && VALID_SENSITIVITY_RATINGS.has(rawSensitivity as SensitivityRating)
      ? (rawSensitivity as SensitivityRating)
      : undefined;

  // Sprint 1 — optional drop-level controls
  const altText = String(formData.get("altText") ?? "").trim() || undefined;
  const captionUrl = String(formData.get("captionUrl") ?? "").trim() || undefined;
  const commentsDisabled = formData.get("commentsDisabled") === "true" ? true : undefined;
  const sponsoredContent = formData.get("sponsoredContent") === "true" ? true : undefined;

  if (!title) return { ok: false, error: "title is required" };
  if (title.length > 200) return { ok: false, error: "title must be under 200 characters" };
  if (!worldId) return { ok: false, error: "please select a world" };
  if (!synopsis) return { ok: false, error: "synopsis is required" };
  if (synopsis.length > 2000) return { ok: false, error: "synopsis must be under 2000 characters" };

  const priceUsd = Number.parseFloat(priceStr);
  if (!Number.isFinite(priceUsd) || priceUsd < 0) {
    return { ok: false, error: "price must be a valid positive number" };
  }

  const drop = await gateway.createDrop(session.accountId, {
    title,
    worldId,
    synopsis,
    pricingType,
    priceUsd: pricingType === "free" ? 0 : Math.round(priceUsd * 100) / 100,
    seasonLabel,
    episodeLabel,
    walletGate,
    sensitivityRating,
    altText,
    captionUrl,
    commentsDisabled,
    sponsoredContent
  });

  if (!drop) {
    return { ok: false, error: "failed to create drop. check that you own the selected world." };
  }

  redirect(`/drops/${encodeURIComponent(drop.id)}`);
}
