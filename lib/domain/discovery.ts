import type { BffDatabase } from "@/lib/bff/persistence";
import type {
  DiscoveryDrop,
  DiscoveryFilterInput,
  Drop,
  DropType,
  GovernanceCaseStatus,
  ProofReadinessSignal,
  RecommendationReason,
  StudioDiscoveryEntry,
} from "@/lib/domain/contracts";
import { computeTasteGraph, type TasteGraph } from "@/lib/domain/personalization";

const ACTIVE_GOVERNANCE_STATUSES = new Set<GovernanceCaseStatus>([
  "open",
  "under_review",
  "action_required",
  "escalated",
]);

export const FORBIDDEN_FILTER_KEYS = new Set([
  "most_resold",
  "resale_ranking",
  "resale_velocity",
  "market_cap",
  "top_value",
  "highest_resale_gain",
  "fastest_price_increase",
  "bid",
  "ask",
  "order_book",
  "speculation",
  "investment_rank",
  "market_value_leaderboard",
  "most_profitable",
  "top_value_collector",
  "resale_count",
  "price_appreciation",
]);

export function isMarketReady(drop: Drop, db: BffDatabase): boolean {
  if (drop.releaseAt && new Date(drop.releaseAt) > new Date()) return false;
  if (!db.rightsMetadata.some((r) => r.dropId === drop.id)) return false;
  if (!db.catalog.studios.some((s) => s.handle === drop.studioHandle)) return false;
  return true;
}

export function isGovernanceFlagged(dropId: string, db: BffDatabase): boolean {
  return db.governanceCases.some(
    (gc) => gc.relatedDropId === dropId && ACTIVE_GOVERNANCE_STATUSES.has(gc.status)
  );
}

export function computeProofSignal(drop: Drop, db: BffDatabase): ProofReadinessSignal {
  const hasRightsMetadata = db.rightsMetadata.some((r) => r.dropId === drop.id);

  const certs = db.certificates.filter((c) => c.dropId === drop.id);
  const hasCertificate = certs.length > 0;
  let certificateStatus: "verified" | "under_review" | "revoked" | null = null;
  if (certs.some((c) => c.status === "verified")) certificateStatus = "verified";
  else if (certs.some((c) => c.status === "under_review")) certificateStatus = "under_review";
  else if (certs.some((c) => c.status === "revoked")) certificateStatus = "revoked";

  const hasProvenance = db.provenanceEvents.some((pe) => pe.dropId === drop.id);
  const hasTransferRules = db.transferRules.some((tr) => tr.dropId === drop.id);

  const hasActiveRightsDispute = db.governanceCases.some(
    (gc) =>
      gc.caseType === "rights_dispute" &&
      gc.relatedDropId === drop.id &&
      ACTIVE_GOVERNANCE_STATUSES.has(gc.status)
  );

  const isProofReady =
    hasRightsMetadata && certificateStatus === "verified" && !hasActiveRightsDispute;

  return {
    hasRightsMetadata,
    hasCertificate,
    certificateStatus,
    hasProvenance,
    hasTransferRules,
    isProofReady,
  };
}

export type ViewerContext = {
  accountId: string | null;
  savedIntentDropIds: Set<string>;
  followedStudioHandles: Set<string>;
  collectedDropIds: Set<string>;
  patronStudioHandles: Set<string>;
  tasteGraph: TasteGraph | null;
};

export function buildViewerContext(db: BffDatabase, viewerAccountId: string | null): ViewerContext {
  if (!viewerAccountId) {
    return {
      accountId: null,
      savedIntentDropIds: new Set(),
      followedStudioHandles: new Set(),
      collectedDropIds: new Set(),
      patronStudioHandles: new Set(),
      tasteGraph: null,
    };
  }

  const prefRecord = db.personalizationPreferences.find((p) => p.accountId === viewerAccountId);
  const tasteGraph = prefRecord?.disableTasteGraph
    ? null
    : computeTasteGraph(viewerAccountId, db);

  return {
    accountId: viewerAccountId,
    savedIntentDropIds: new Set(
      db.savedIntents.filter((si) => si.accountId === viewerAccountId).map((si) => si.dropId)
    ),
    followedStudioHandles: new Set(
      db.studioFollows.filter((sf) => sf.accountId === viewerAccountId).map((sf) => sf.studioHandle)
    ),
    collectedDropIds: new Set(
      db.ownerships.filter((o) => o.accountId === viewerAccountId).map((o) => o.dropId)
    ),
    patronStudioHandles: new Set(
      db.patrons
        .filter((p) => p.accountId === viewerAccountId && p.status === "active")
        .map((p) => p.studioHandle)
    ),
    tasteGraph,
  };
}

function scoreDropForDiscovery(
  drop: Drop,
  proofSignal: ProofReadinessSignal,
  viewerContext: ViewerContext,
  governanceFlagged: boolean
): number {
  let score = 0;
  if (proofSignal.isProofReady) score += 100;
  if (proofSignal.hasRightsMetadata) score += 50;
  if (proofSignal.certificateStatus === "verified") score += 30;
  if (proofSignal.hasProvenance) score += 20;
  if (proofSignal.hasTransferRules) score += 20;
  if (viewerContext.savedIntentDropIds.has(drop.id)) score += 40;
  if (viewerContext.patronStudioHandles.has(drop.studioHandle)) score += 50;
  if (viewerContext.followedStudioHandles.has(drop.studioHandle)) score += 30;
  if (viewerContext.collectedDropIds.has(drop.id)) score += 10;
  const daysOld = Math.max(0, (Date.now() - new Date(drop.releaseDate).getTime()) / 86_400_000);
  score += Math.max(0, 10 - Math.floor(daysOld / 3));
  if (governanceFlagged) score -= 20;

  // Taste graph affinity boost — capped at +25, no speculative signals
  if (viewerContext.tasteGraph) {
    const handleAffinity = viewerContext.tasteGraph.affinityByHandle[drop.studioHandle] ?? 0;
    const categoryAffinity = drop.category
      ? (viewerContext.tasteGraph.affinityByCategory[drop.category] ?? 0)
      : 0;
    const mediumAffinity = drop.medium
      ? (viewerContext.tasteGraph.affinityByMedium[drop.medium] ?? 0)
      : 0;
    const rawBoost = (handleAffinity + categoryAffinity + mediumAffinity) * 2;
    score += Math.min(rawBoost, 25);
  }

  return score;
}

function resolveRecommendationReason(
  drop: Drop,
  proofSignal: ProofReadinessSignal,
  viewerContext: ViewerContext
): RecommendationReason {
  if (viewerContext.patronStudioHandles.has(drop.studioHandle)) return "patron_studio";
  if (viewerContext.collectedDropIds.has(drop.id)) return "collected_studio";
  if (viewerContext.followedStudioHandles.has(drop.studioHandle)) return "followed_studio";
  if (viewerContext.savedIntentDropIds.has(drop.id)) return "saved_intent";
  if (proofSignal.isProofReady) return "proof_complete";
  return "default_ranking";
}

export function enrichDropForDiscovery(
  drop: Drop,
  db: BffDatabase,
  viewerContext: ViewerContext
): DiscoveryDrop {
  const proofSignal = computeProofSignal(drop, db);
  const governanceFlagged = isGovernanceFlagged(drop.id, db);
  const collectAvailable = !drop.releaseAt || new Date(drop.releaseAt) <= new Date();
  return {
    ...drop,
    savedByViewer: viewerContext.savedIntentDropIds.has(drop.id),
    isFollowingStudio: viewerContext.followedStudioHandles.has(drop.studioHandle),
    hasCollectedDrop: viewerContext.collectedDropIds.has(drop.id),
    proofSignal,
    collectAvailable,
    isGovernanceFlagged: governanceFlagged,
  };
}

function resolveEffectiveDropTypes(drop: DiscoveryDrop): DropType[] {
  const types: DropType[] = [];
  if (drop.dropType) types.push(drop.dropType);
  if (drop.releaseAt && new Date(drop.releaseAt) > new Date()) {
    types.push("upcoming");
  } else {
    types.push("available_now");
  }
  if (drop.visibility === "collectors_only") types.push("collector_only");
  if (types.length === 0) types.push("available_now");
  return types;
}

export function applyDiscoveryFilters(
  drops: Drop[],
  filters: DiscoveryFilterInput,
  viewerContext: ViewerContext,
  db: BffDatabase
): DiscoveryDrop[] {
  const enriched = drops.map((d) => enrichDropForDiscovery(d, db, viewerContext));
  return enriched.filter((drop) => {
    if (filters.category?.length && (!drop.category || !filters.category.includes(drop.category))) return false;
    if (filters.medium?.length && (!drop.medium || !filters.medium.includes(drop.medium))) return false;
    if (filters.tags?.length) {
      const dropTags = drop.tags ?? [];
      if (!filters.tags.some((t) => dropTags.includes(t))) return false;
    }
    if (filters.dropType?.length) {
      const effective = resolveEffectiveDropTypes(drop);
      if (!filters.dropType.some((t) => effective.includes(t))) return false;
    }
    if (filters.proofReady === true && !drop.proofSignal.isProofReady) return false;
    if (filters.followedStudiosOnly && !drop.isFollowingStudio) return false;
    if (filters.collectedFromOnly && !drop.hasCollectedDrop) return false;
    if (filters.savedBeforeOnly && !drop.savedByViewer) return false;
    if (filters.collectNow && !drop.collectAvailable) return false;
    if (filters.priceMaxUsd !== undefined && drop.priceUsd > filters.priceMaxUsd) return false;
    if (filters.freeToSave && drop.priceUsd !== 0) return false;
    if (filters.membershipIncluded) {
      const world = db.catalog.worlds.find((w) => w.id === drop.worldId);
      if (!world || world.entryRule !== "membership") return false;
    }
    if (filters.fromMyWorlds && viewerContext.accountId) {
      const hasAccess =
        db.worldCollectOwnerships.some(
          (wco) => wco.accountId === viewerContext.accountId && wco.worldId === drop.worldId
        ) ||
        db.membershipEntitlements.some(
          (me) =>
            me.accountId === viewerContext.accountId &&
            me.worldId === drop.worldId &&
            me.status === "active"
        );
      if (!hasAccess) return false;
    }
    return true;
  });
}

export function rankDiscoveryDrops(
  drops: Drop[],
  db: BffDatabase,
  viewerAccountId: string | null
): DiscoveryDrop[] {
  const viewerContext = buildViewerContext(db, viewerAccountId);
  const enriched = drops.map((d) => enrichDropForDiscovery(d, db, viewerContext));
  return enriched
    .sort((a, b) => {
      const scoreA = scoreDropForDiscovery(a, a.proofSignal, viewerContext, a.isGovernanceFlagged);
      const scoreB = scoreDropForDiscovery(b, b.proofSignal, viewerContext, b.isGovernanceFlagged);
      return scoreB - scoreA;
    })
    .map((drop) => ({
      ...drop,
      recommendationReason: resolveRecommendationReason(drop, drop.proofSignal, viewerContext),
    }));
}

export function listMarketReadyDrops(db: BffDatabase): Drop[] {
  return db.catalog.drops.filter((d) => isMarketReady(d, db));
}

export function buildDiscoveryStudios(
  db: BffDatabase,
  viewerAccountId: string | null
): StudioDiscoveryEntry[] {
  const followedHandles = new Set(
    db.studioFollows
      .filter((sf) => sf.accountId === viewerAccountId)
      .map((sf) => sf.studioHandle)
  );

  return db.catalog.studios
    .map((studio) => {
      const studioDrops = db.catalog.drops.filter(
        (d) => d.studioHandle === studio.handle && isMarketReady(d, db)
      );
      if (studioDrops.length === 0) return null;

      const proofReadyCount = studioDrops.filter((d) => computeProofSignal(d, db).isProofReady).length;
      let proofCompletenessSignal: "complete" | "partial" | "none";
      if (proofReadyCount === studioDrops.length) proofCompletenessSignal = "complete";
      else if (proofReadyCount > 0) proofCompletenessSignal = "partial";
      else proofCompletenessSignal = "none";

      return {
        handle: studio.handle,
        displayName: studio.title,
        synopsis: studio.synopsis,
        availableDropCount: studioDrops.length,
        proofCompletenessSignal,
        isFollowedByViewer: followedHandles.has(studio.handle),
      } satisfies StudioDiscoveryEntry;
    })
    .filter((entry): entry is StudioDiscoveryEntry => entry !== null);
}
