import type { Drop } from "@/lib/domain/contracts";

export type SearchFilterSet = {
  query: string;
  mediaMode: string | null;
  priceRange: PriceRange | null;
  collectibility: CollectibilityFilter;
};

export type PriceRange = {
  minUsd: number | null;
  maxUsd: number | null;
};

export type CollectibilityFilter = "all" | "collectible" | "free";

export function filterByPriceRange(drops: Drop[], range: PriceRange): Drop[] {
  return drops.filter((d) => {
    if (range.minUsd !== null && d.priceUsd < range.minUsd) return false;
    if (range.maxUsd !== null && d.priceUsd > range.maxUsd) return false;
    return true;
  });
}

export function filterByCollectibility(
  drops: Drop[],
  filter: CollectibilityFilter
): Drop[] {
  if (filter === "all") return drops;
  if (filter === "free") return drops.filter((d) => d.priceUsd === 0);
  return drops.filter((d) => d.priceUsd > 0);
}

export type SearchRankingFactors = {
  textRelevance: number;
  recencyScore: number;
  consumptionScore: number;
};

export const SEARCH_RANKING_WEIGHTS = {
  textRelevance: 0.5,
  recencyScore: 0.2,
  consumptionScore: 0.3,
} as const;

export function computeSearchRank(factors: SearchRankingFactors): number {
  return (
    factors.textRelevance * SEARCH_RANKING_WEIGHTS.textRelevance +
    factors.recencyScore * SEARCH_RANKING_WEIGHTS.recencyScore +
    factors.consumptionScore * SEARCH_RANKING_WEIGHTS.consumptionScore
  );
}

export function computeRecencyScore(releaseDateIso: string, nowMs: number): number {
  const ageMs = nowMs - Date.parse(releaseDateIso);
  const ageDays = ageMs / 86_400_000;
  return Math.max(0, 1 - ageDays / 365);
}

export type AutocompleteSuggestion = {
  text: string;
  kind: "drop" | "studio" | "world" | "hashtag";
  score: number;
};

export function buildAutocompleteSuggestions(
  query: string,
  dropTitles: string[],
  studioHandles: string[],
  worldTitles: string[],
  hashtags: string[],
  limit: number = 8
): AutocompleteSuggestion[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const suggestions: AutocompleteSuggestion[] = [];

  for (const title of dropTitles) {
    if (title.toLowerCase().includes(q)) {
      suggestions.push({ text: title, kind: "drop", score: title.toLowerCase().startsWith(q) ? 1 : 0.5 });
    }
  }
  for (const handle of studioHandles) {
    if (handle.toLowerCase().includes(q)) {
      suggestions.push({ text: handle, kind: "studio", score: handle.toLowerCase().startsWith(q) ? 1 : 0.5 });
    }
  }
  for (const title of worldTitles) {
    if (title.toLowerCase().includes(q)) {
      suggestions.push({ text: title, kind: "world", score: title.toLowerCase().startsWith(q) ? 1 : 0.5 });
    }
  }
  for (const tag of hashtags) {
    if (tag.toLowerCase().includes(q)) {
      suggestions.push({ text: `#${tag}`, kind: "hashtag", score: tag.toLowerCase().startsWith(q) ? 1 : 0.5 });
    }
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type SearchAnalyticsEntry = {
  query: string;
  resultCount: number;
  timestamp: string;
};

export type SearchAnalyticsSummary = {
  totalQueries: number;
  zeroResultQueries: SearchAnalyticsEntry[];
  topQueries: Array<{ query: string; count: number }>;
};

export function summarizeSearchAnalytics(
  entries: SearchAnalyticsEntry[],
  limit: number = 20
): SearchAnalyticsSummary {
  const zeroResultQueries = entries.filter((e) => e.resultCount === 0);

  const queryCounts = new Map<string, number>();
  for (const entry of entries) {
    const normalized = entry.query.toLowerCase().trim();
    queryCounts.set(normalized, (queryCounts.get(normalized) ?? 0) + 1);
  }

  const topQueries = [...queryCounts.entries()]
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return {
    totalQueries: entries.length,
    zeroResultQueries,
    topQueries,
  };
}
