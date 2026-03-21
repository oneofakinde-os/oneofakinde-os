/**
 * Surface-agnostic ranking engine.
 *
 * Extracted from `lib/townhall/ranking.ts` so that townhall, showroom,
 * connect, and collect feeds all share the same scoring primitives and
 * lane-resolution logic.
 *
 * Callers supply drops + signal maps; the engine returns a sorted list.
 */

import type { Drop, TownhallTelemetrySignals } from "@/lib/domain/contracts";
import { studioPinBoostForTownhall } from "@/lib/catalog/drop-curation";

// ── public types ──────────────────────────────────────────────────────

export type EngagementSignals = {
  watched: number;
  collected: number;
  liked: number;
  shared: number;
  commented: number;
  saved: number;
};

export type TelemetrySignals = TownhallTelemetrySignals;

export type RankingLane =
  | "featured"
  | "for_you"
  | "rising"
  | "newest"
  | "most_collected"
  | "new_voices"
  | "sustained_craft";

export type RankingOptions = {
  now?: Date;
  lane?: RankingLane;
  signalsByDropId?: Record<string, Partial<EngagementSignals>>;
  telemetryByDropId?: Record<string, Partial<TelemetrySignals>>;
  viewerAccountId?: string | null;
  viewerHasTasteSignals?: boolean;
  newVoicesCollectThreshold?: number;
};

// ── internal types ────────────────────────────────────────────────────

type RankedEntry = {
  drop: Drop;
  releaseMs: number;
  recency: number;
  sustainedRecency: number;
  studioPinBoost: number;
  engagementSignals: EngagementSignals;
  telemetrySignals: TelemetrySignals;
  engagementRaw: number;
  telemetryRaw: number;
  mostCollectedRaw: number;
};

type RankingMaxima = {
  engagement: number;
  telemetry: number;
  mostCollected: number;
};

// ── constants ─────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const DEFAULT_NEW_VOICES_COLLECT_THRESHOLD = 5_000;

// Mock engagement data used as baseline until the unified event pipeline
// provides real aggregation.  Keyed by well-known seed drop IDs.
const MOCK_SIGNALS_BY_DROP_ID: Record<string, EngagementSignals> = {
  stardust: {
    watched: 192_000,
    collected: 2_910,
    liked: 32_400,
    shared: 3_400,
    commented: 5_800,
    saved: 9_200
  },
  "through-the-lens": {
    watched: 131_000,
    collected: 2_260,
    liked: 21_800,
    shared: 2_700,
    commented: 4_100,
    saved: 6_700
  },
  voidrunner: {
    watched: 145_000,
    collected: 3_480,
    liked: 19_200,
    shared: 2_100,
    commented: 3_700,
    saved: 7_900
  },
  "twilight-whispers": {
    watched: 118_000,
    collected: 2_020,
    liked: 17_500,
    shared: 1_960,
    commented: 2_840,
    saved: 5_400
  }
};

// ── helpers ───────────────────────────────────────────────────────────

function parseReleaseDate(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function mockSignalsForDrop(drop: Drop): EngagementSignals {
  const seeded = MOCK_SIGNALS_BY_DROP_ID[drop.id];
  if (seeded) {
    return seeded;
  }

  const seed = hashSeed(`${drop.id}:${drop.releaseDate}:${drop.worldId}`);
  return {
    watched: 40_000 + (seed % 90_000),
    collected: 500 + (seed % 2_000),
    liked: 4_000 + (seed % 11_000),
    shared: 500 + (seed % 2_200),
    commented: 350 + (seed % 1_700),
    saved: 900 + (seed % 3_100)
  };
}

function mergeSignals(
  baseline: EngagementSignals,
  override?: Partial<EngagementSignals>
): EngagementSignals {
  if (!override) {
    return baseline;
  }

  return {
    watched: override.watched ?? baseline.watched,
    collected: override.collected ?? baseline.collected,
    liked: override.liked ?? baseline.liked,
    shared: override.shared ?? baseline.shared,
    commented: override.commented ?? baseline.commented,
    saved: override.saved ?? baseline.saved
  };
}

function engagementRawScore(signals: EngagementSignals): number {
  return (
    signals.collected * 4 +
    signals.watched * 1 +
    signals.liked * 0.25 +
    signals.shared * 0.55 +
    signals.commented * 0.65 +
    signals.saved * 0.3
  );
}

function recencyScore(nowMs: number, releaseMs: number, halfLifeDays: number): number {
  if (releaseMs <= 0) {
    return 0;
  }

  const ageDays = Math.max(0, (nowMs - releaseMs) / DAY_MS);
  return Math.exp(-ageDays / halfLifeDays);
}

function mergeTelemetrySignals(
  override?: Partial<TelemetrySignals>
): TelemetrySignals {
  return {
    watchTimeSeconds: override?.watchTimeSeconds ?? 0,
    completions: override?.completions ?? 0,
    collectIntents: override?.collectIntents ?? 0,
    impressions: override?.impressions ?? 0
  };
}

function telemetryRawScore(signals: TelemetrySignals): number {
  return signals.watchTimeSeconds * 0.75 + signals.completions * 600 + signals.collectIntents * 800;
}

function collectSignalScore(entry: RankedEntry): number {
  return entry.telemetrySignals.collectIntents + entry.telemetrySignals.completions;
}

function normalize(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return value / max;
}

// ── lane scoring ──────────────────────────────────────────────────────

function risingScore(entry: RankedEntry, maxima: RankingMaxima): number {
  const engagement = normalize(entry.engagementRaw, maxima.engagement);
  const telemetry = normalize(entry.telemetryRaw, maxima.telemetry);
  return entry.recency * 0.58 + engagement * 0.24 + telemetry * 0.18 + entry.studioPinBoost;
}

function sustainedCraftScore(entry: RankedEntry, maxima: RankingMaxima): number {
  const engagement = normalize(entry.engagementRaw, maxima.engagement);
  const telemetry = normalize(entry.telemetryRaw, maxima.telemetry);
  return entry.sustainedRecency * 0.2 + engagement * 0.5 + telemetry * 0.3 + entry.studioPinBoost;
}

function featuredScore(entry: RankedEntry, maxima: RankingMaxima): number {
  const engagement = normalize(entry.engagementRaw, maxima.engagement);
  const telemetry = normalize(entry.telemetryRaw, maxima.telemetry);
  const collected = normalize(entry.mostCollectedRaw, maxima.mostCollected);
  return (
    entry.recency * 0.2 +
    engagement * 0.22 +
    telemetry * 0.24 +
    collected * 0.24 +
    entry.studioPinBoost * 1.3
  );
}

function forYouStubScore(entry: RankedEntry, maxima: RankingMaxima, accountId: string): number {
  const base = risingScore(entry, maxima);
  const personalSeed = hashSeed(`${accountId}:${entry.drop.id}`) % 1_000;
  const personalizationWeight = personalSeed / 1_000;
  return base * 0.93 + personalizationWeight * 0.07;
}

// ── sorting ───────────────────────────────────────────────────────────

function sortByDateThenTitle(entries: RankedEntry[]): RankedEntry[] {
  return [...entries].sort((a, b) => {
    if (b.releaseMs !== a.releaseMs) {
      return b.releaseMs - a.releaseMs;
    }

    return a.drop.title.localeCompare(b.drop.title);
  });
}

function sortByScoreThenDate(
  entries: RankedEntry[],
  scoreFor: (entry: RankedEntry) => number
): RankedEntry[] {
  return [...entries].sort((a, b) => {
    const scoreA = scoreFor(a);
    const scoreB = scoreFor(b);

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    if (b.releaseMs !== a.releaseMs) {
      return b.releaseMs - a.releaseMs;
    }

    return a.drop.title.localeCompare(b.drop.title);
  });
}

// ── lane resolution ───────────────────────────────────────────────────

function applyNewVoicesLane(
  entries: RankedEntry[],
  maxima: RankingMaxima,
  threshold: number
): RankedEntry[] {
  const collectsByStudio = new Map<string, number>();
  for (const entry of entries) {
    const current = collectsByStudio.get(entry.drop.studioHandle) ?? 0;
    collectsByStudio.set(entry.drop.studioHandle, current + entry.engagementSignals.collected);
  }

  const eligible = entries.filter(
    (entry) => (collectsByStudio.get(entry.drop.studioHandle) ?? 0) <= threshold
  );
  const remainder = entries.filter(
    (entry) => (collectsByStudio.get(entry.drop.studioHandle) ?? 0) > threshold
  );

  if (eligible.length === 0) {
    return sortByScoreThenDate(entries, (entry) => risingScore(entry, maxima));
  }

  return [
    ...sortByScoreThenDate(eligible, (entry) => risingScore(entry, maxima)),
    ...sortByScoreThenDate(remainder, (entry) => risingScore(entry, maxima))
  ];
}

function applyMostCollectedLane(entries: RankedEntry[], maxima: RankingMaxima): RankedEntry[] {
  return sortByScoreThenDate(entries, (entry) => {
    const collected = normalize(entry.mostCollectedRaw, maxima.mostCollected);
    const engagement = normalize(entry.engagementRaw, maxima.engagement);
    return collected * 0.8 + engagement * 0.2 + entry.studioPinBoost;
  });
}

// ── main entry ────────────────────────────────────────────────────────

/**
 * Surface-agnostic drop ranking.
 *
 * Returns a new array of drops sorted according to the chosen lane and
 * available signal data.  Safe for townhall, showroom, connect, and
 * collect feed surfaces.
 */
export function rankDrops(drops: Drop[], options: RankingOptions = {}): Drop[] {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const laneKey = options.lane ?? "rising";

  const entries = drops.map((drop) => {
    const releaseMs = parseReleaseDate(drop.releaseDate);
    const engagementSignals = mergeSignals(
      mockSignalsForDrop(drop),
      options.signalsByDropId?.[drop.id]
    );
    const telemetrySignals = mergeTelemetrySignals(options.telemetryByDropId?.[drop.id]);
    const telemetryRaw = telemetryRawScore(telemetrySignals);

    return {
      drop,
      releaseMs,
      recency: recencyScore(nowMs, releaseMs, 18),
      sustainedRecency: recencyScore(nowMs, releaseMs, 60),
      studioPinBoost: studioPinBoostForTownhall(drop),
      engagementSignals,
      telemetrySignals,
      engagementRaw: engagementRawScore(engagementSignals),
      telemetryRaw,
      mostCollectedRaw: collectSignalScore({
        drop,
        releaseMs,
        recency: 0,
        sustainedRecency: 0,
        studioPinBoost: 0,
        engagementSignals,
        telemetrySignals,
        engagementRaw: 0,
        telemetryRaw,
        mostCollectedRaw: 0
      })
    } as RankedEntry;
  });

  const maxima: RankingMaxima = {
    engagement: entries.reduce((best, entry) => Math.max(best, entry.engagementRaw), 0),
    telemetry: entries.reduce((best, entry) => Math.max(best, entry.telemetryRaw), 0),
    mostCollected: entries.reduce((best, entry) => Math.max(best, entry.mostCollectedRaw), 0)
  };

  const sortedEntries = (() => {
    switch (laneKey) {
      case "featured":
        return sortByScoreThenDate(entries, (entry) => featuredScore(entry, maxima));
      case "newest":
        return sortByDateThenTitle(entries);
      case "most_collected":
        return applyMostCollectedLane(entries, maxima);
      case "new_voices":
        return applyNewVoicesLane(
          entries,
          maxima,
          options.newVoicesCollectThreshold ?? DEFAULT_NEW_VOICES_COLLECT_THRESHOLD
        );
      case "sustained_craft":
        return sortByScoreThenDate(entries, (entry) => sustainedCraftScore(entry, maxima));
      case "for_you": {
        if (!options.viewerAccountId || !options.viewerHasTasteSignals) {
          return sortByScoreThenDate(entries, (entry) => risingScore(entry, maxima));
        }

        return sortByScoreThenDate(entries, (entry) =>
          forYouStubScore(entry, maxima, options.viewerAccountId ?? "anon")
        );
      }
      case "rising":
      default:
        return sortByScoreThenDate(entries, (entry) => risingScore(entry, maxima));
    }
  })();

  return sortedEntries.map((entry) => entry.drop);
}

/**
 * Compute engagement signals for a single drop.
 *
 * Returns mock baseline if no overrides are supplied.
 * Useful for the `/api/v1/analytics/signals` endpoint.
 */
export function resolveEngagementSignals(
  drop: Drop,
  overrides?: Partial<EngagementSignals>
): EngagementSignals {
  return mergeSignals(mockSignalsForDrop(drop), overrides);
}

/**
 * Compute telemetry signals for a single drop.
 */
export function resolveTelemetrySignals(
  overrides?: Partial<TelemetrySignals>
): TelemetrySignals {
  return mergeTelemetrySignals(overrides);
}
