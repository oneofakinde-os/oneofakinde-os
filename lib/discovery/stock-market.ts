import type { Drop } from "@/lib/domain/contracts";

export type VelocityIndicator = "rising_fast" | "emerging" | "established" | "deep_collector_base";

export type DropStanding = {
  dropId: string;
  consumptionScore: number;
  percentileRank: number;
  modePercentileRank: number | null;
  velocity: VelocityIndicator | null;
  scoreHistory: ScoreSnapshot[];
};

export type ScoreSnapshot = {
  timestamp: string;
  score: number;
};

export type ScoreMilestone = {
  dropId: string;
  studioHandle: string;
  milestone: string;
  score: number;
  reachedAt: string;
};

export const VELOCITY_THRESHOLDS = {
  rising_fast: { minAcceleration: 2.0, minScore: 10 },
  emerging: { minAcceleration: 0.5, minScore: 5 },
  established: { minScore: 100, minCollectors: 20 },
  deep_collector_base: { minCollectors: 50 },
} as const;

export const SCORE_NOT_QUALITY_COMMITMENT =
  "consumption score reflects audience engagement volume, not editorial quality judgment. " +
  "a high score means many people engaged, not that the platform endorses the work.";

export const ANTI_SPECULATION_COMMITMENTS = [
  "score is derived only from organic consumption signals — no purchased boosts",
  "resale price is never factored into consumption score",
  "collect count is weighted identically regardless of price paid",
  "velocity indicators are derived from score acceleration, not price movement",
] as const;

export function classifyVelocity(
  currentScore: number,
  previousScore: number,
  intervalMs: number,
  collectCount: number
): VelocityIndicator | null {
  if (collectCount >= VELOCITY_THRESHOLDS.deep_collector_base.minCollectors) {
    return "deep_collector_base";
  }

  if (
    currentScore >= VELOCITY_THRESHOLDS.established.minScore &&
    collectCount >= VELOCITY_THRESHOLDS.established.minCollectors
  ) {
    return "established";
  }

  if (intervalMs <= 0 || previousScore <= 0) return null;
  const acceleration = (currentScore - previousScore) / previousScore;

  if (
    acceleration >= VELOCITY_THRESHOLDS.rising_fast.minAcceleration &&
    currentScore >= VELOCITY_THRESHOLDS.rising_fast.minScore
  ) {
    return "rising_fast";
  }

  if (
    acceleration >= VELOCITY_THRESHOLDS.emerging.minAcceleration &&
    currentScore >= VELOCITY_THRESHOLDS.emerging.minScore
  ) {
    return "emerging";
  }

  return null;
}

export function computePercentileRank(
  score: number,
  allScores: number[]
): number {
  if (allScores.length === 0) return 100;
  const below = allScores.filter((s) => s < score).length;
  return Math.round((below / allScores.length) * 100);
}

export function detectMilestone(
  dropId: string,
  studioHandle: string,
  currentScore: number,
  previousMilestones: string[],
  nowIso: string
): ScoreMilestone | null {
  const thresholds = [10, 50, 100, 500, 1000, 5000, 10000];
  for (const t of thresholds) {
    const label = `score_${t}`;
    if (currentScore >= t && !previousMilestones.includes(label)) {
      return { dropId, studioHandle, milestone: label, score: currentScore, reachedAt: nowIso };
    }
  }
  return null;
}

export type AggregateSurface =
  | "the_index"
  | "rising_today"
  | "first_collects_today"
  | "most_active_worlds";

export type IndexEntry = {
  drop: Drop;
  standing: DropStanding;
};

export function buildRisingToday(
  standings: DropStanding[],
  drops: Drop[],
  limit: number = 20
): IndexEntry[] {
  const dropMap = new Map(drops.map((d) => [d.id, d]));
  return standings
    .filter((s) => s.velocity === "rising_fast" || s.velocity === "emerging")
    .sort((a, b) => b.consumptionScore - a.consumptionScore)
    .slice(0, limit)
    .map((s) => ({ drop: dropMap.get(s.dropId)!, standing: s }))
    .filter((e) => e.drop);
}

export function buildFirstCollectsToday(
  drops: Drop[],
  firstCollectedTodayIds: Set<string>,
  standings: DropStanding[],
  limit: number = 20
): IndexEntry[] {
  const standingMap = new Map(standings.map((s) => [s.dropId, s]));
  return drops
    .filter((d) => firstCollectedTodayIds.has(d.id))
    .slice(0, limit)
    .map((d) => ({
      drop: d,
      standing: standingMap.get(d.id) ?? {
        dropId: d.id,
        consumptionScore: 0,
        percentileRank: 0,
        modePercentileRank: null,
        velocity: null,
        scoreHistory: [],
      },
    }));
}
