/**
 * Public consumption-score formula definition.
 *
 * Implements CONS-051 (documented, public formula) and CONS-052 (published weights).
 * This module is the single source of truth for the weights used by the ranking
 * engine and for the public transparency page at /transparency/score.
 */

export const CONSUMPTION_SCORE_VERSION = "1.0.0";

export const ENGAGEMENT_WEIGHTS = {
  collects: 4,
  completions: 1,
  saves: 0.3,
  shares: 0.55,
  likes: 0.25,
  comments: 0.65,
} as const;

export const TELEMETRY_WEIGHTS = {
  watchTimeSeconds: 0.75,
  completions: 600,
  collectIntents: 800,
} as const;

export const LANE_BLEND = {
  rising: { recency: 0.58, engagement: 0.24, telemetry: 0.18 },
  sustained_craft: { recency: 0.2, engagement: 0.5, telemetry: 0.3 },
  featured: { recency: 0.2, engagement: 0.22, telemetry: 0.24, collected: 0.24 },
  most_collected: { collected: 0.8, engagement: 0.2 },
} as const;

export const RECENCY_HALF_LIFE_DAYS = {
  rising: 18,
  sustained_craft: 60,
} as const;

export type ScoreFormulaSnapshot = {
  version: string;
  engagementWeights: typeof ENGAGEMENT_WEIGHTS;
  telemetryWeights: typeof TELEMETRY_WEIGHTS;
  laneBlend: typeof LANE_BLEND;
  recencyHalfLifeDays: typeof RECENCY_HALF_LIFE_DAYS;
  tieBreaker: string;
  antiPatterns: string[];
};

export function getScoreFormulaSnapshot(): ScoreFormulaSnapshot {
  return {
    version: CONSUMPTION_SCORE_VERSION,
    engagementWeights: ENGAGEMENT_WEIGHTS,
    telemetryWeights: TELEMETRY_WEIGHTS,
    laneBlend: LANE_BLEND,
    recencyHalfLifeDays: RECENCY_HALF_LIFE_DAYS,
    tieBreaker: "chronological-newer-first",
    antiPatterns: [
      "no-personalization",
      "no-algorithmic-amplification",
      "no-predicted-future-value",
      "no-hidden-signals",
      "score-measures-attention-not-quality",
    ],
  };
}
