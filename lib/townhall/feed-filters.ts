import type { Drop } from "@/lib/domain/contracts";

export type TownhallTimeWindow = "today" | "this_week" | "this_month" | "this_year" | "all_time";

export const TOWNHALL_TIME_WINDOWS: TownhallTimeWindow[] = [
  "today",
  "this_week",
  "this_month",
  "this_year",
  "all_time",
];

export type TownhallScopeFilter = "all" | "following_only" | "world_only";

export const TOWNHALL_SCOPE_FILTERS: TownhallScopeFilter[] = [
  "all",
  "following_only",
  "world_only",
];

export const SNAPSHOT_INTERVAL_MS = 900_000;

export function filterByTimeWindow(
  drops: Drop[],
  window: TownhallTimeWindow,
  nowMs: number
): Drop[] {
  if (window === "all_time") return drops;

  const cutoffMs = (() => {
    switch (window) {
      case "today":
        return nowMs - 86_400_000;
      case "this_week":
        return nowMs - 604_800_000;
      case "this_month":
        return nowMs - 2_592_000_000;
      case "this_year":
        return nowMs - 31_536_000_000;
    }
  })();

  return drops.filter((d) => Date.parse(d.releaseDate) >= cutoffMs);
}

export function filterByFollowing(
  drops: Drop[],
  followedStudioHandles: Set<string>
): Drop[] {
  return drops.filter((d) =>
    followedStudioHandles.has(d.studioHandle.toLowerCase())
  );
}

export function filterByWorld(
  drops: Drop[],
  memberWorldIds: Set<string>
): Drop[] {
  return drops.filter((d) => memberWorldIds.has(d.worldId));
}

export type EditorialPin = {
  dropId: string;
  pinnedBy: string;
  pinnedAt: string;
  expiresAt: string | null;
  label: "editorial pick";
};

export type EditorialPinAuditEntry = {
  action: "pin" | "unpin";
  dropId: string;
  operatorHandle: string;
  timestamp: string;
  reason: string;
};

export function applyEditorialPins(
  drops: Drop[],
  pins: EditorialPin[],
  nowMs: number
): Drop[] {
  const activePinIds = new Set(
    pins
      .filter((p) => !p.expiresAt || Date.parse(p.expiresAt) > nowMs)
      .map((p) => p.dropId)
  );

  if (activePinIds.size === 0) return drops;

  const pinned: Drop[] = [];
  const unpinned: Drop[] = [];
  for (const drop of drops) {
    if (activePinIds.has(drop.id)) {
      pinned.push(drop);
    } else {
      unpinned.push(drop);
    }
  }

  return [...pinned, ...unpinned];
}

export function completionWeight(
  watchDurationMs: number,
  totalDurationMs: number
): number {
  if (totalDurationMs <= 0) return 0;
  const ratio = watchDurationMs / totalDurationMs;
  if (ratio >= 0.9) return 1.0;
  if (ratio >= 0.5) return 0.6;
  if (ratio >= 0.1) return 0.3;
  return 0.1;
}

export function tieBreakChronological(a: Drop, b: Drop): number {
  return Date.parse(b.releaseDate) - Date.parse(a.releaseDate);
}
