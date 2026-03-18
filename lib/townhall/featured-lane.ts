import { commerceBffService } from "@/lib/bff/service";
import type { CollectInventoryListing, Drop, TownhallTelemetrySignals } from "@/lib/domain/contracts";
import { rankDropsForTownhall } from "@/lib/townhall/ranking";

const DEFAULT_FEATURED_LANE_LIMIT = 12;
const MAX_FEATURED_LANE_LIMIT = 24;

function parseReleaseMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampLimit(input?: string | number | null): number {
  const raw =
    typeof input === "number" && Number.isFinite(input)
      ? input
      : Number.parseInt(String(input ?? ""), 10);
  if (!Number.isFinite(raw)) {
    return DEFAULT_FEATURED_LANE_LIMIT;
  }
  return Math.max(1, Math.min(MAX_FEATURED_LANE_LIMIT, Math.floor(raw)));
}

function buildCollectListingByDropId(
  listings: CollectInventoryListing[]
): Map<string, CollectInventoryListing> {
  return new Map(listings.map((listing) => [listing.drop.id, listing]));
}

type FeaturedReason = "studio_pin" | "market_signal" | "recent_release" | "sustained_interest";

export type ShowroomFeaturedEntry = {
  drop: Drop;
  rank: number;
  reasons: FeaturedReason[];
  telemetry: Pick<TownhallTelemetrySignals, "collectIntents" | "completions" | "watchTimeSeconds">;
  collect: {
    lane: CollectInventoryListing["lane"];
    listingType: CollectInventoryListing["listingType"];
    latestOfferState: CollectInventoryListing["latestOfferState"];
    offerCount: number;
  } | null;
};

export type ShowroomFeaturedLane = {
  laneKey: "featured";
  generatedAt: string;
  limit: number;
  entries: ShowroomFeaturedEntry[];
};

export async function buildShowroomFeaturedLane(input?: {
  limit?: string | number | null;
  viewerAccountId?: string | null;
}): Promise<ShowroomFeaturedLane> {
  const limit = clampLimit(input?.limit);
  const viewerAccountId = input?.viewerAccountId ?? null;
  const [drops, collectInventory] = await Promise.all([
    commerceBffService.listDrops(viewerAccountId),
    commerceBffService.getCollectInventory(null, "all")
  ]);
  const telemetryByDropId = await commerceBffService.getTownhallTelemetrySignals(
    drops.map((drop) => drop.id)
  );
  const collectListingByDropId = buildCollectListingByDropId(collectInventory.listings);
  const ranked = rankDropsForTownhall(drops, {
    laneKey: "featured",
    telemetryByDropId
  }).slice(0, limit);

  const nowMs = Date.now();

  return {
    laneKey: "featured",
    generatedAt: new Date(nowMs).toISOString(),
    limit,
    entries: ranked.map((drop, index) => {
      const listing = collectListingByDropId.get(drop.id) ?? null;
      const telemetry = telemetryByDropId[drop.id] ?? {};
      const reasons = new Set<FeaturedReason>();
      if (index <= 2) {
        reasons.add("studio_pin");
      }
      if ((telemetry.collectIntents ?? 0) > 0 || (telemetry.completions ?? 0) > 0) {
        reasons.add("market_signal");
      }

      const releaseMs = parseReleaseMs(drop.releaseDate);
      const ageDays = releaseMs > 0 ? Math.max(0, (nowMs - releaseMs) / 86_400_000) : Number.POSITIVE_INFINITY;
      if (ageDays <= 21) {
        reasons.add("recent_release");
      } else {
        reasons.add("sustained_interest");
      }

      return {
        drop,
        rank: index + 1,
        reasons: [...reasons],
        telemetry: {
          collectIntents: telemetry.collectIntents ?? 0,
          completions: telemetry.completions ?? 0,
          watchTimeSeconds: telemetry.watchTimeSeconds ?? 0
        },
        collect: listing
          ? {
              lane: listing.lane,
              listingType: listing.listingType,
              latestOfferState: listing.latestOfferState,
              offerCount: listing.offerCount
            }
          : null
      };
    })
  };
}
