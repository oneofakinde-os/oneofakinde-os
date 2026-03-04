import type { CollectInventoryListing, Drop, DropPreviewMode } from "@/lib/domain/contracts";

export type TownhallShowroomMediaFilter = "all" | "agora" | DropPreviewMode;
export type TownhallShowroomOrdering =
  | "for_you"
  | "rising"
  | "newest"
  | "most_collected"
  | "new_voices"
  | "sustained_craft";

export const TOWNHALL_SHOWROOM_MEDIA_FILTERS: TownhallShowroomMediaFilter[] = [
  "all",
  "agora",
  "watch",
  "listen",
  "read",
  "photos",
  "live"
];

export const TOWNHALL_SHOWROOM_ORDERINGS: TownhallShowroomOrdering[] = [
  "for_you",
  "rising",
  "newest",
  "most_collected",
  "new_voices",
  "sustained_craft"
];

export const DEFAULT_TOWNHALL_SHOWROOM_MEDIA_FILTER: TownhallShowroomMediaFilter = "all";
export const DEFAULT_TOWNHALL_SHOWROOM_ORDERING: TownhallShowroomOrdering = "rising";

export function parseTownhallShowroomMediaFilter(
  input: string | null | undefined
): TownhallShowroomMediaFilter {
  const normalized = input?.trim().toLowerCase();
  if (
    normalized &&
    TOWNHALL_SHOWROOM_MEDIA_FILTERS.includes(normalized as TownhallShowroomMediaFilter)
  ) {
    return normalized as TownhallShowroomMediaFilter;
  }

  return DEFAULT_TOWNHALL_SHOWROOM_MEDIA_FILTER;
}

export function parseTownhallShowroomOrdering(
  input: string | null | undefined
): TownhallShowroomOrdering {
  const normalized = input?.trim().toLowerCase();
  if (normalized && TOWNHALL_SHOWROOM_ORDERINGS.includes(normalized as TownhallShowroomOrdering)) {
    return normalized as TownhallShowroomOrdering;
  }

  return DEFAULT_TOWNHALL_SHOWROOM_ORDERING;
}

export function parseTownhallShowroomOrderingFromParams(params: URLSearchParams): TownhallShowroomOrdering {
  return parseTownhallShowroomOrdering(params.get("lane_key") ?? params.get("ordering"));
}

export function filterDropsForShowroomMedia(
  drops: Drop[],
  mediaFilter: TownhallShowroomMediaFilter,
  options?: {
    collectListingsByDropId?: Map<string, CollectInventoryListing>;
  }
): Drop[] {
  if (mediaFilter === "all") {
    return drops;
  }

  if (mediaFilter === "agora") {
    const collectListingsByDropId = options?.collectListingsByDropId;
    if (!collectListingsByDropId || collectListingsByDropId.size === 0) {
      return [];
    }

    const marketActiveDrops = drops.filter((drop) => {
      const listing = collectListingsByDropId.get(drop.id);
      if (!listing) {
        return false;
      }

      return (
        listing.listingType === "auction" ||
        listing.listingType === "resale" ||
        listing.latestOfferState !== "listed"
      );
    });
    if (marketActiveDrops.length > 0) {
      return marketActiveDrops;
    }

    return drops.filter((drop) => collectListingsByDropId.has(drop.id));
  }

  return drops.filter((drop) => Boolean(drop.previewMedia?.[mediaFilter]));
}

export function buildCollectListingsByDropId(
  listings: CollectInventoryListing[]
): Map<string, CollectInventoryListing> {
  return new Map(listings.map((listing) => [listing.drop.id, listing]));
}
