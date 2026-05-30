import type {
  CollectInventoryListing,
  Drop,
  DropPreviewMode,
} from "@/lib/domain/contracts";

export type CollectLaneSubView =
  | "most_collected"
  | "highest_revenue"
  | "rising_revenue"
  | "recent_high_resale"
  | "first_collect_today"
  | "by_mode"
  | "by_world";

export const COLLECT_LANE_SUB_VIEWS: CollectLaneSubView[] = [
  "most_collected",
  "highest_revenue",
  "rising_revenue",
  "recent_high_resale",
  "first_collect_today",
  "by_mode",
  "by_world",
];

export type EconomicActivityIndicator = "hot_resale" | "capped_supply" | null;

export type CollectLaneEntry = {
  drop: Drop;
  listing: CollectInventoryListing;
  collectCount: number;
  totalRevenueUsd: number;
  economicIndicator: EconomicActivityIndicator;
};

export type RevenueVisibility = "public" | "hidden";

export type RevenueVisibilitySetting = {
  studioHandle: string;
  dropId: string | null;
  visibility: RevenueVisibility;
};

export const DEFAULT_REVENUE_VISIBILITY: RevenueVisibility = "public";

// Sprint 0.5I gate: "hot_resale" and "recent_high_resale" are PROHIBITED from
// all public discovery surfaces, API responses, and lane outputs. They may only
// appear as internal domain classification values. Any code that outputs these
// values to a client response or a public endpoint is a constitutional violation.
// See: FORBIDDEN_FILTER_KEYS (includes "resale_velocity", "most_resold"),
//      FORBIDDEN_NOTIFICATION_TYPES, and check-approved-language.ts guardrails.
// classifyEconomicIndicator must NEVER be called from a public API route or
// discovery service method.
export function classifyEconomicIndicator(
  resaleCount: number,
  resaleWindowMs: number,
  totalSupply: number | null,
  remainingSupply: number | null
): EconomicActivityIndicator {
  if (totalSupply !== null && remainingSupply !== null && remainingSupply <= 0) {
    return "capped_supply";
  }

  const HOT_RESALE_THRESHOLD = 3;
  const HOT_RESALE_WINDOW_MS = 604_800_000;
  if (resaleCount >= HOT_RESALE_THRESHOLD && resaleWindowMs <= HOT_RESALE_WINDOW_MS) {
    return "hot_resale";
  }

  return null;
}

export function sortByMostCollected(entries: CollectLaneEntry[]): CollectLaneEntry[] {
  return [...entries].sort((a, b) => b.collectCount - a.collectCount);
}

export function sortByHighestRevenue(entries: CollectLaneEntry[]): CollectLaneEntry[] {
  return [...entries].sort((a, b) => b.totalRevenueUsd - a.totalRevenueUsd);
}

export function sortByRisingRevenue(
  entries: CollectLaneEntry[],
  revenueVelocityByDropId: Map<string, number>
): CollectLaneEntry[] {
  return [...entries].sort((a, b) => {
    const va = revenueVelocityByDropId.get(a.drop.id) ?? 0;
    const vb = revenueVelocityByDropId.get(b.drop.id) ?? 0;
    return vb - va;
  });
}

export function filterByMode(
  entries: CollectLaneEntry[],
  mode: DropPreviewMode
): CollectLaneEntry[] {
  return entries.filter((e) => Boolean(e.drop.previewMedia?.[mode]));
}

export function filterByWorld(
  entries: CollectLaneEntry[],
  worldId: string
): CollectLaneEntry[] {
  return entries.filter((e) => e.drop.worldId === worldId);
}

export type DropResume = {
  dropId: string;
  title: string;
  studioHandle: string;
  collectCount: number;
  totalRevenueUsd: number;
  revenueVisible: boolean;
  economicIndicator: EconomicActivityIndicator;
};

export function buildDropResume(
  drop: Drop,
  entry: CollectLaneEntry,
  revenueVisibility: RevenueVisibility
): DropResume {
  return {
    dropId: drop.id,
    title: drop.title,
    studioHandle: drop.studioHandle,
    collectCount: entry.collectCount,
    totalRevenueUsd: entry.totalRevenueUsd,
    revenueVisible: revenueVisibility === "public",
    economicIndicator: entry.economicIndicator,
  };
}
