import { parseCollectMarketLane } from "@/lib/collect/market-lanes";
import { commerceBffService } from "@/lib/bff/service";
import type {
  CollectInventoryListing,
  CollectMarketLane,
  CollectOfferState,
  Drop,
  Studio,
  World
} from "@/lib/domain/contracts";

const DEFAULT_CATALOG_SEARCH_LIMIT = 8;
const MAX_CATALOG_SEARCH_LIMIT = 20;

const COLLECT_OFFER_STATES: ReadonlyArray<CollectOfferState> = [
  "listed",
  "offer_submitted",
  "countered",
  "accepted",
  "settled",
  "expired",
  "withdrawn"
];

export type CatalogSearchUserResult = {
  handle: string;
  title: string;
  synopsis: string;
};

export type CatalogSearchWorldResult = {
  id: string;
  title: string;
  synopsis: string;
  studioHandle: string;
};

export type CatalogSearchDropResult = {
  id: string;
  title: string;
  synopsis: string;
  worldId: string;
  worldLabel: string;
  studioHandle: string;
  priceUsd: number;
  collect: {
    lane: CollectMarketLane;
    listingType: CollectInventoryListing["listingType"];
    offerCount: number;
    highestOfferUsd: number | null;
    latestOfferState: CollectOfferState;
    listingPriceUsd: number;
  } | null;
};

export type CatalogSearchResult = {
  query: string;
  lane: CollectMarketLane;
  offerState: CollectOfferState | null;
  limit: number;
  users: CatalogSearchUserResult[];
  worlds: CatalogSearchWorldResult[];
  drops: CatalogSearchDropResult[];
  totals: {
    users: number;
    worlds: number;
    drops: number;
  };
};

type CatalogSearchData = {
  query: string;
  lane: CollectMarketLane;
  offerState: CollectOfferState | null;
  limit: number;
  drops: Drop[];
  worlds: World[];
  studios: Studio[];
  collectListings: CollectInventoryListing[];
};

export type ExecuteCatalogSearchInput = {
  query?: string | null;
  lane?: string | null;
  offerState?: string | null;
  limit?: string | number | null;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function fieldScore(query: string, value: string): number {
  const normalizedQuery = normalize(query);
  const normalizedValue = normalize(value);
  if (!normalizedQuery || !normalizedValue) return 0;
  if (normalizedValue === normalizedQuery) return 400;
  if (normalizedValue.startsWith(normalizedQuery)) return 250;

  const index = normalizedValue.indexOf(normalizedQuery);
  if (index < 0) return 0;
  return 120 - Math.min(index, 100);
}

function scoreByFields(query: string, values: string[]): number {
  return values.reduce((best, value) => Math.max(best, fieldScore(query, value)), 0);
}

function sortByScore<T>(
  items: T[],
  query: string,
  fields: (item: T) => string[],
  getKey: (item: T) => string
): T[] {
  if (!query) {
    return [...items].sort((a, b) => getKey(a).localeCompare(getKey(b)));
  }

  return items
    .map((item) => ({
      item,
      score: scoreByFields(query, fields(item))
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || getKey(a.item).localeCompare(getKey(b.item)))
    .map((entry) => entry.item);
}

function dedupeUsers(studios: Studio[], drops: Drop[], worlds: World[]): CatalogSearchUserResult[] {
  const byHandle = new Map<string, CatalogSearchUserResult>();

  for (const studio of studios) {
    byHandle.set(studio.handle, {
      handle: studio.handle,
      title: studio.title,
      synopsis: studio.synopsis
    });
  }

  for (const handle of [...drops.map((drop) => drop.studioHandle), ...worlds.map((world) => world.studioHandle)]) {
    if (byHandle.has(handle)) continue;
    byHandle.set(handle, {
      handle,
      title: handle,
      synopsis: "creator identity publishing drops and worlds."
    });
  }

  return [...byHandle.values()];
}

export function parseCatalogSearchQuery(value: string | null | undefined): string {
  return value?.trim().slice(0, 120) ?? "";
}

export function parseCatalogSearchLimit(value: string | number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.min(MAX_CATALOG_SEARCH_LIMIT, Math.floor(value)));
  }

  const numeric = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_CATALOG_SEARCH_LIMIT;
  }

  return Math.max(1, Math.min(MAX_CATALOG_SEARCH_LIMIT, Math.floor(numeric)));
}

export function parseCatalogSearchOfferState(value: string | null | undefined): CollectOfferState | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return COLLECT_OFFER_STATES.includes(normalized as CollectOfferState)
    ? (normalized as CollectOfferState)
    : null;
}

function buildCollectListingByDropId(
  listings: CollectInventoryListing[]
): Map<string, CollectInventoryListing> {
  return new Map(listings.map((listing) => [listing.drop.id, listing]));
}

export function searchCatalogFromData(input: CatalogSearchData): CatalogSearchResult {
  const query = parseCatalogSearchQuery(input.query);
  const lane = parseCollectMarketLane(input.lane);
  const offerState = parseCatalogSearchOfferState(input.offerState);
  const limit = parseCatalogSearchLimit(input.limit);
  const users = dedupeUsers(input.studios, input.drops, input.worlds);
  const collectListingByDropId = buildCollectListingByDropId(input.collectListings);

  const scopedDrops = input.drops.filter((drop) => {
    const listing = collectListingByDropId.get(drop.id);
    if (lane !== "all" && (!listing || listing.lane !== lane)) {
      return false;
    }

    if (offerState && (!listing || listing.latestOfferState !== offerState)) {
      return false;
    }

    return true;
  });

  const matchedUsers = sortByScore(
    users,
    query,
    (user) => [user.handle, user.title, user.synopsis],
    (user) => user.handle
  ).slice(0, limit);

  const matchedWorlds = sortByScore(
    input.worlds,
    query,
    (world) => [world.title, world.synopsis, world.studioHandle],
    (world) => world.id
  )
    .slice(0, limit)
    .map<CatalogSearchWorldResult>((world) => ({
      id: world.id,
      title: world.title,
      synopsis: world.synopsis,
      studioHandle: world.studioHandle
    }));

  const matchedDrops = sortByScore(
    scopedDrops,
    query,
    (drop) => [drop.title, drop.synopsis, drop.worldLabel, drop.studioHandle],
    (drop) => drop.id
  )
    .slice(0, limit)
    .map<CatalogSearchDropResult>((drop) => {
      const listing = collectListingByDropId.get(drop.id) ?? null;
      return {
        id: drop.id,
        title: drop.title,
        synopsis: drop.synopsis,
        worldId: drop.worldId,
        worldLabel: drop.worldLabel,
        studioHandle: drop.studioHandle,
        priceUsd: drop.priceUsd,
        collect: listing
          ? {
              lane: listing.lane,
              listingType: listing.listingType,
              offerCount: listing.offerCount,
              highestOfferUsd: listing.highestOfferUsd,
              latestOfferState: listing.latestOfferState,
              listingPriceUsd: listing.priceUsd
            }
          : null
      };
    });

  return {
    query,
    lane,
    offerState,
    limit,
    users: matchedUsers,
    worlds: matchedWorlds,
    drops: matchedDrops,
    totals: {
      users: matchedUsers.length,
      worlds: matchedWorlds.length,
      drops: matchedDrops.length
    }
  };
}

export async function executeCatalogSearch(input: ExecuteCatalogSearchInput = {}): Promise<CatalogSearchResult> {
  const query = parseCatalogSearchQuery(input.query);
  const lane = parseCollectMarketLane(input.lane);
  const offerState = parseCatalogSearchOfferState(input.offerState);
  const limit = parseCatalogSearchLimit(input.limit);

  const [drops, worlds, collectInventory] = await Promise.all([
    commerceBffService.listDrops(),
    commerceBffService.listWorlds(),
    commerceBffService.getCollectInventory(null, "all")
  ]);
  const handles = Array.from(new Set([...drops.map((drop) => drop.studioHandle), ...worlds.map((world) => world.studioHandle)]));
  const studioResults = await Promise.all(handles.map((handle) => commerceBffService.getStudioByHandle(handle)));
  const studios = studioResults.filter((studio): studio is Studio => studio !== null);

  return searchCatalogFromData({
    query,
    lane,
    offerState,
    limit,
    drops,
    worlds,
    studios,
    collectListings: collectInventory.listings
  });
}
