import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { DropVisibility, PreviewPolicy, SensitivityRating, WalletChain } from "@/lib/domain/contracts";
import {
  createCreatorTerms,
  createRightsMetadata,
  validateDropPublishReadiness,
  type CreatorTerms,
  type PermittedUseType,
  type RightsMetadata
} from "@/lib/domain/rights";

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
  rightsMetadata?: unknown;
  creatorTerms?: unknown;
};

const VALID_VISIBILITIES = new Set<DropVisibility>(["public", "world_members", "collectors_only"]);
const VALID_PREVIEW_POLICIES = new Set<PreviewPolicy>(["full", "limited", "poster"]);
const VALID_WALLET_CHAINS = new Set<WalletChain>(["ethereum", "tezos", "polygon"]);
const VALID_SENSITIVITY_RATINGS = new Set<SensitivityRating>(["none", "advisory", "mature"]);
const VALID_PERMITTED_USES = new Set<PermittedUseType>([
  "private_viewing",
  "collector_vault_display",
  "certificate_sharing",
  "creator_attributed_reference"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parsePermittedUses(value: unknown): PermittedUseType[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const permitted = value.filter(
    (entry): entry is PermittedUseType =>
      typeof entry === "string" && VALID_PERMITTED_USES.has(entry as PermittedUseType)
  );
  return permitted.length > 0 ? permitted : undefined;
}

function parseRightsMetadata(raw: unknown): RightsMetadata | null {
  if (!isRecord(raw)) return null;
  const rightsHolderHandle = typeof raw.rightsHolderHandle === "string" ? raw.rightsHolderHandle : "";
  const licenseSummary = typeof raw.licenseSummary === "string" ? raw.licenseSummary : "";

  return createRightsMetadata({
    rightsHolderHandle,
    licenseSummary,
    permittedUses: parsePermittedUses(raw.permittedUses),
    attributionRequired:
      typeof raw.attributionRequired === "boolean" ? raw.attributionRequired : undefined,
    commercialUseAllowed:
      typeof raw.commercialUseAllowed === "boolean" ? raw.commercialUseAllowed : undefined,
    remixAllowed: typeof raw.remixAllowed === "boolean" ? raw.remixAllowed : undefined,
    aiTrainingAllowed:
      typeof raw.aiTrainingAllowed === "boolean" ? raw.aiTrainingAllowed : undefined,
    governingJurisdiction:
      typeof raw.governingJurisdiction === "string" ? raw.governingJurisdiction : undefined
  });
}

function parseCreatorTerms(raw: unknown, creatorHandle: string): CreatorTerms | null {
  if (!isRecord(raw)) return null;
  const transferRules = isRecord(raw.transferRules) ? raw.transferRules : {};
  return createCreatorTerms({
    creatorHandle:
      typeof raw.creatorHandle === "string" && raw.creatorHandle.trim()
        ? raw.creatorHandle
        : creatorHandle,
    termsSummary: typeof raw.termsSummary === "string" ? raw.termsSummary : "",
    editionPolicy: typeof raw.editionPolicy === "string" ? raw.editionPolicy : "",
    proofRequiredBeforeCollect:
      typeof raw.proofRequiredBeforeCollect === "boolean"
        ? raw.proofRequiredBeforeCollect
        : true,
    transferRules: {
      transferEnabled:
        typeof transferRules.transferEnabled === "boolean"
          ? transferRules.transferEnabled
          : undefined,
      resaleEnabled:
        typeof transferRules.resaleEnabled === "boolean" ? transferRules.resaleEnabled : undefined,
      resaleSolicitationAllowed:
        typeof transferRules.resaleSolicitationAllowed === "boolean"
          ? transferRules.resaleSolicitationAllowed
          : undefined,
      minimumHoldDays:
        typeof transferRules.minimumHoldDays === "number"
          ? Math.floor(transferRules.minimumHoldDays)
          : undefined,
      royaltyBps:
        typeof transferRules.royaltyBps === "number"
          ? Math.floor(transferRules.royaltyBps)
          : undefined,
      allowedTransferKinds: Array.isArray(transferRules.allowedTransferKinds)
        ? transferRules.allowedTransferKinds.filter(
            (entry): entry is "none" | "gift" | "sale" | "account_migration" =>
              entry === "none" ||
              entry === "gift" ||
              entry === "sale" ||
              entry === "account_migration"
          )
        : undefined
    }
  });
}

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

  const rightsMetadata = parseRightsMetadata(body?.rightsMetadata);
  const creatorTerms = parseCreatorTerms(body?.creatorTerms, guard.session.handle);
  const publishValidation = validateDropPublishReadiness({
    rightsMetadata,
    creatorTerms
  });
  if (!publishValidation.ok || !rightsMetadata || !creatorTerms) {
    return badRequest(
      publishValidation.ok
        ? "rights metadata and creator terms are required before publishing"
        : publishValidation.detail
    );
  }

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
    sensitivityRating,
    rightsMetadata,
    creatorTerms
  });

  if (!drop) {
    return badRequest("drop could not be created — check world ownership and title uniqueness");
  }

  return ok({ drop }, 201);
}
