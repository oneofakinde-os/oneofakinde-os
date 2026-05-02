import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { DropVisibility, PreviewPolicy, SensitivityRating, WalletChain } from "@/lib/domain/contracts";

type CreateDropBody = {
  title?: string;
  worldId?: string;
  synopsis?: string;
  priceUsd?: number;
  seasonLabel?: string;
  episodeLabel?: string;
  visibility?: string;
  previewPolicy?: string;
  walletGate?: string;
  sensitivityRating?: string;
};

const VALID_VISIBILITIES = new Set<DropVisibility>(["public", "world_members", "collectors_only"]);
const VALID_PREVIEW_POLICIES = new Set<PreviewPolicy>(["full", "limited", "poster"]);
const VALID_WALLET_CHAINS = new Set<WalletChain>(["ethereum", "tezos", "polygon"]);
const VALID_SENSITIVITY_RATINGS = new Set<SensitivityRating>(["none", "advisory", "mature"]);

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const body = (await safeJson<CreateDropBody>(request)) as
    | Record<string, unknown>
    | null;

  const title = getRequiredBodyString(body, "title");
  if (!title || title.length > 200) {
    return badRequest("title is required (max 200 characters)");
  }

  const worldId = getRequiredBodyString(body, "worldId");
  if (!worldId) {
    return badRequest("worldId is required");
  }

  const synopsis = getRequiredBodyString(body, "synopsis");
  if (!synopsis || synopsis.length > 2000) {
    return badRequest("synopsis is required (max 2000 characters)");
  }

  const rawPrice = body?.priceUsd;
  if (rawPrice === undefined || rawPrice === null || typeof rawPrice !== "number" || !Number.isFinite(rawPrice) || rawPrice < 0) {
    return badRequest("priceUsd must be a non-negative number");
  }
  const priceUsd = Math.round(rawPrice * 100) / 100;

  const rawVisibility = typeof body?.visibility === "string" ? body.visibility.trim() : undefined;
  const visibility = rawVisibility && VALID_VISIBILITIES.has(rawVisibility as DropVisibility)
    ? (rawVisibility as DropVisibility)
    : undefined;

  const rawPreviewPolicy = typeof body?.previewPolicy === "string" ? body.previewPolicy.trim() : undefined;
  const previewPolicy = rawPreviewPolicy && VALID_PREVIEW_POLICIES.has(rawPreviewPolicy as PreviewPolicy)
    ? (rawPreviewPolicy as PreviewPolicy)
    : undefined;

  const seasonLabel = typeof body?.seasonLabel === "string" ? body.seasonLabel.trim() || undefined : undefined;
  const episodeLabel = typeof body?.episodeLabel === "string" ? body.episodeLabel.trim() || undefined : undefined;

  const rawWalletGate = typeof body?.walletGate === "string" ? body.walletGate.trim() : undefined;
  const walletGate = rawWalletGate && VALID_WALLET_CHAINS.has(rawWalletGate as WalletChain)
    ? (rawWalletGate as WalletChain)
    : undefined;

  const rawSensitivityRating =
    typeof body?.sensitivityRating === "string" ? body.sensitivityRating.trim() : undefined;
  const sensitivityRating =
    rawSensitivityRating && VALID_SENSITIVITY_RATINGS.has(rawSensitivityRating as SensitivityRating)
      ? (rawSensitivityRating as SensitivityRating)
      : undefined;

  const drop = await commerceBffService.createDrop(guard.session.accountId, {
    title,
    worldId,
    synopsis,
    priceUsd,
    seasonLabel,
    episodeLabel,
    visibility,
    previewPolicy,
    walletGate,
    sensitivityRating
  });

  if (!drop) {
    return badRequest("drop could not be created — check world ownership and title uniqueness");
  }

  return ok({ drop }, 201);
}
