/**
 * Townhall-specific ranking façade.
 *
 * Delegates to the surface-agnostic `lib/ranking/engine.ts` and re-exports
 * the legacy `rankDropsForTownhall` name so existing callers keep working.
 */

import type { Drop, TownhallTelemetrySignals } from "@/lib/domain/contracts";
import type { TownhallShowroomOrdering } from "@/lib/townhall/showroom-query";
import {
  rankDrops,
  type EngagementSignals,
  type RankingLane,
  type RankingOptions
} from "@/lib/ranking/engine";

// Re-export the canonical engagement type under its original townhall name
// so downstream consumers that already import it don't break.
export type TownhallEngagementSignals = EngagementSignals;

type TownhallRankingOptions = {
  now?: Date;
  ordering?: TownhallShowroomOrdering;
  laneKey?: TownhallShowroomOrdering;
  signalsByDropId?: Record<string, Partial<TownhallEngagementSignals>>;
  telemetryByDropId?: Record<string, Partial<TownhallTelemetrySignals>>;
  viewerAccountId?: string | null;
  viewerHasTasteSignals?: boolean;
  newVoicesCollectThreshold?: number;
};

/**
 * Legacy entry point — maps townhall-specific options to the
 * surface-agnostic `rankDrops()` call.
 */
export function rankDropsForTownhall(drops: Drop[], options: TownhallRankingOptions = {}): Drop[] {
  const lane: RankingLane = (options.laneKey ?? options.ordering ?? "rising") as RankingLane;

  const engineOptions: RankingOptions = {
    now: options.now,
    lane,
    signalsByDropId: options.signalsByDropId,
    telemetryByDropId: options.telemetryByDropId,
    viewerAccountId: options.viewerAccountId,
    viewerHasTasteSignals: options.viewerHasTasteSignals,
    newVoicesCollectThreshold: options.newVoicesCollectThreshold
  };

  return rankDrops(drops, engineOptions);
}
