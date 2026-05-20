import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_THRESHOLDS,
  evaluateDormancy,
  applyDormancyTransition,
  canResumePatron,
  resumePatron,
  declareVoluntaryDormancy,
  buildDormancyNotifications,
} from "../../lib/patron/dormancy";
import {
  filterByTimeWindow,
  filterByFollowing,
  filterByWorld,
  applyEditorialPins,
  completionWeight,
  tieBreakChronological,
  SNAPSHOT_INTERVAL_MS,
  TOWNHALL_TIME_WINDOWS,
  TOWNHALL_SCOPE_FILTERS,
} from "../../lib/townhall/feed-filters";
import {
  classifyVelocity,
  computePercentileRank,
  detectMilestone,
  SCORE_NOT_QUALITY_COMMITMENT,
  ANTI_SPECULATION_COMMITMENTS,
  VELOCITY_THRESHOLDS,
} from "../../lib/discovery/stock-market";
import {
  filterByPriceRange,
  filterByCollectibility,
  computeSearchRank,
  buildAutocompleteSuggestions,
  summarizeSearchAnalytics,
  SEARCH_RANKING_WEIGHTS,
} from "../../lib/discovery/search-enhancements";
import {
  COLLECT_LANE_SUB_VIEWS,
  classifyEconomicIndicator,
  sortByMostCollected,
  sortByHighestRevenue,
  DEFAULT_REVENUE_VISIBILITY,
} from "../../lib/collect/collect-lane";
import {
  extractHashtags,
  normalizeHashtag,
  suggestHashtags,
  computeHashtagTrends,
} from "../../lib/social/hashtags";
import type { Drop, Patron } from "../../lib/domain/contracts";

const DAY_MS = 86_400_000;

function makePatron(overrides: Partial<Patron> = {}): Patron {
  const now = Date.now();
  return {
    id: "pat_1",
    accountId: "acc_1",
    handle: "collector",
    studioHandle: "creator",
    status: "active",
    committedAt: new Date(now - 30 * DAY_MS).toISOString(),
    lastActivityAt: new Date(now - 30 * DAY_MS).toISOString(),
    ...overrides,
  };
}

function makeDrop(id: string, overrides: Partial<Drop> = {}): Drop {
  return {
    id,
    title: `Drop ${id}`,
    seasonLabel: "s1",
    episodeLabel: "",
    studioHandle: "creator",
    worldId: "w1",
    worldLabel: "World One",
    synopsis: "test",
    releaseDate: "2026-05-15",
    priceUsd: 9.99,
    visibility: "public",
    previewPolicy: "full",
    ...overrides,
  } as Drop;
}

// ── Patron Dormancy (PDL-001 through PDL-010) ──

test("PDL-001: 60-day inactivity triggers dormancy detection", () => {
  const patron = makePatron({
    lastActivityAt: new Date(Date.now() - 65 * DAY_MS).toISOString(),
  });
  const signal = evaluateDormancy(patron, Date.now());
  assert.equal(signal.action, "detect_dormancy");
  assert.equal(signal.nextStatus, "dormant_60");
});

test("PDL-003: 90-day triggers patron notification", () => {
  const patron = makePatron({
    status: "dormant_60",
    lastActivityAt: new Date(Date.now() - 95 * DAY_MS).toISOString(),
  });
  const signal = evaluateDormancy(patron, Date.now());
  assert.equal(signal.action, "notify_patron_90");
  assert.equal(signal.nextStatus, "dormant_90");
});

test("PDL-005: 180-day auto-pauses billing", () => {
  const patron = makePatron({
    status: "dormant_90",
    lastActivityAt: new Date(Date.now() - 185 * DAY_MS).toISOString(),
  });
  const signal = evaluateDormancy(patron, Date.now());
  assert.equal(signal.action, "auto_pause_billing");
  assert.equal(signal.nextStatus, "paused_180");
});

test("PDL-007: 365-day ends relationship", () => {
  const patron = makePatron({
    status: "paused_180",
    lastActivityAt: new Date(Date.now() - 370 * DAY_MS).toISOString(),
  });
  const signal = evaluateDormancy(patron, Date.now());
  assert.equal(signal.action, "end_relationship");
  assert.equal(signal.nextStatus, "ended");
});

test("PDL-008: creator can resume dormant patron", () => {
  const patron = makePatron({ status: "paused_180" });
  assert.ok(canResumePatron(patron));
  const resumed = resumePatron(patron, new Date().toISOString());
  assert.equal(resumed.status, "active");
  assert.equal(resumed.voluntaryDormancy, false);
});

test("PDL-009: voluntary dormancy declaration", () => {
  const patron = makePatron();
  const declared = declareVoluntaryDormancy(patron);
  assert.equal(declared.voluntaryDormancy, true);
  const signal = evaluateDormancy(declared, Date.now());
  assert.equal(signal.action, "detect_dormancy");
});

test("PDL-010: default thresholds match matrix spec", () => {
  assert.equal(DEFAULT_THRESHOLDS.detectionDays, 60);
  assert.equal(DEFAULT_THRESHOLDS.patronNotificationDays, 90);
  assert.equal(DEFAULT_THRESHOLDS.autoPauseDays, 180);
  assert.equal(DEFAULT_THRESHOLDS.relationshipEndDays, 365);
});

test("PDL: dormancy notifications include both parties at 180-day", () => {
  const patron = makePatron({ status: "dormant_90" });
  const signal = { ...evaluateDormancy(patron, Date.now()), action: "auto_pause_billing" as const, nextStatus: "paused_180" as const };
  const notifs = buildDormancyNotifications(patron, "creator_acc", signal);
  assert.equal(notifs.length, 2);
  assert.ok(notifs.some((n) => n.recipientRole === "patron"));
  assert.ok(notifs.some((n) => n.recipientRole === "creator"));
});

// ── Consumption Filters (CONS-050/054/056/057/058/059/060) ──

test("CONS-054: time-window filter covers all five windows", () => {
  assert.equal(TOWNHALL_TIME_WINDOWS.length, 5);
  const drops = [
    makeDrop("d1", { releaseDate: "2026-05-18" }),
    makeDrop("d2", { releaseDate: "2026-01-01" }),
    makeDrop("d3", { releaseDate: "2024-01-01" }),
  ];
  const now = Date.parse("2026-05-18T12:00:00Z");
  assert.equal(filterByTimeWindow(drops, "today", now).length, 1);
  assert.equal(filterByTimeWindow(drops, "this_year", now).length, 2);
  assert.equal(filterByTimeWindow(drops, "all_time", now).length, 3);
});

test("CONS-058: following-only filter scopes to followed studios", () => {
  const drops = [
    makeDrop("d1", { studioHandle: "creator_a" }),
    makeDrop("d2", { studioHandle: "creator_b" }),
  ];
  const followed = new Set(["creator_a"]);
  const filtered = filterByFollowing(drops, followed);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].studioHandle, "creator_a");
});

test("CONS-059: world-only filter scopes to member worlds", () => {
  const drops = [
    makeDrop("d1", { worldId: "w1" }),
    makeDrop("d2", { worldId: "w2" }),
  ];
  const memberWorlds = new Set(["w1"]);
  const filtered = filterByWorld(drops, memberWorlds);
  assert.equal(filtered.length, 1);
});

test("CONS-060: editorial pins float pinned drops to top", () => {
  const drops = [makeDrop("d1"), makeDrop("d2"), makeDrop("d3")];
  const pins = [{ dropId: "d3", pinnedBy: "ops", pinnedAt: "2026-05-18T00:00:00Z", expiresAt: null, label: "editorial pick" as const }];
  const result = applyEditorialPins(drops, pins, Date.now());
  assert.equal(result[0].id, "d3");
});

test("CONS-056: completion-weighted plays", () => {
  assert.equal(completionWeight(9000, 10000), 1.0);
  assert.equal(completionWeight(5500, 10000), 0.6);
  assert.equal(completionWeight(1500, 10000), 0.3);
  assert.equal(completionWeight(500, 10000), 0.1);
});

test("CONS-053: snapshot interval is 15 minutes", () => {
  assert.equal(SNAPSHOT_INTERVAL_MS, 900_000);
});

test("CONS-057: tie-breaker is chronological newer-first", () => {
  const a = makeDrop("d1", { releaseDate: "2026-05-15" });
  const b = makeDrop("d2", { releaseDate: "2026-05-17" });
  assert.ok(tieBreakChronological(a, b) > 0);
});

// ── Stock-Market Discovery (SM-001 through SM-017) ──

test("SM-007/008/009/010: velocity indicators classify correctly", () => {
  assert.equal(classifyVelocity(30, 10, DAY_MS, 5), "rising_fast");
  assert.equal(classifyVelocity(8, 5, DAY_MS, 2), "emerging");
  assert.equal(classifyVelocity(150, 140, DAY_MS, 25), "established");
  assert.equal(classifyVelocity(50, 45, DAY_MS, 55), "deep_collector_base");
});

test("SM-004: percentile rank computes correctly", () => {
  assert.equal(computePercentileRank(50, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]), 40);
  assert.equal(computePercentileRank(100, [10, 20, 30]), 100);
});

test("SM-006: score milestone detection", () => {
  const milestone = detectMilestone("d1", "creator", 55, [], "2026-05-18T00:00:00Z");
  assert.ok(milestone);
  assert.equal(milestone.milestone, "score_10");

  const second = detectMilestone("d1", "creator", 55, ["score_10"], "2026-05-18T00:00:00Z");
  assert.ok(second);
  assert.equal(second.milestone, "score_50");
});

test("SM-016: score-not-quality commitment exists", () => {
  assert.ok(SCORE_NOT_QUALITY_COMMITMENT.includes("not editorial quality"));
});

test("SM-017: anti-speculation commitments exist", () => {
  assert.ok(ANTI_SPECULATION_COMMITMENTS.length >= 4);
  assert.ok(ANTI_SPECULATION_COMMITMENTS.some((c) => c.includes("organic")));
});

// ── Search Enhancements (DSC/SRCH) ──

test("DSC-006: price range filter", () => {
  const drops = [
    makeDrop("d1", { priceUsd: 5 }),
    makeDrop("d2", { priceUsd: 15 }),
    makeDrop("d3", { priceUsd: 25 }),
  ];
  const result = filterByPriceRange(drops, { minUsd: 10, maxUsd: 20 });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "d2");
});

test("DSC-007: collectibility filter", () => {
  const drops = [
    makeDrop("d1", { priceUsd: 0 }),
    makeDrop("d2", { priceUsd: 9.99 }),
  ];
  assert.equal(filterByCollectibility(drops, "free").length, 1);
  assert.equal(filterByCollectibility(drops, "collectible").length, 1);
  assert.equal(filterByCollectibility(drops, "all").length, 2);
});

test("DSC-008: autocomplete suggestions", () => {
  const suggestions = buildAutocompleteSuggestions(
    "star",
    ["stardust", "starfield", "moonlight"],
    ["starmaker"],
    ["starworld"],
    ["starart"]
  );
  assert.ok(suggestions.length >= 3);
  assert.ok(suggestions.every((s) => s.text.toLowerCase().includes("star")));
});

test("SRCH-002: search ranking weights sum to 1.0", () => {
  const sum = SEARCH_RANKING_WEIGHTS.textRelevance +
    SEARCH_RANKING_WEIGHTS.recencyScore +
    SEARCH_RANKING_WEIGHTS.consumptionScore;
  assert.ok(Math.abs(sum - 1.0) < 0.001);
});

test("SRCH-004: zero-result query monitoring", () => {
  const entries = [
    { query: "stardust", resultCount: 5, timestamp: "2026-05-18T10:00:00Z" },
    { query: "nonexistent", resultCount: 0, timestamp: "2026-05-18T11:00:00Z" },
    { query: "stardust", resultCount: 3, timestamp: "2026-05-18T12:00:00Z" },
  ];
  const summary = summarizeSearchAnalytics(entries);
  assert.equal(summary.totalQueries, 3);
  assert.equal(summary.zeroResultQueries.length, 1);
  assert.equal(summary.topQueries[0].query, "stardust");
});

// ── Collect Lane (CL-001 through CL-016) ──

test("CL-001: collect lane has correct sub-views", () => {
  assert.ok(COLLECT_LANE_SUB_VIEWS.includes("most_collected"));
  assert.ok(COLLECT_LANE_SUB_VIEWS.includes("highest_revenue"));
  assert.ok(COLLECT_LANE_SUB_VIEWS.includes("rising_revenue"));
  assert.ok(COLLECT_LANE_SUB_VIEWS.includes("by_mode"));
  assert.ok(COLLECT_LANE_SUB_VIEWS.includes("by_world"));
  assert.equal(COLLECT_LANE_SUB_VIEWS.length, 7);
});

test("CL-009/010: economic activity indicators", () => {
  assert.equal(classifyEconomicIndicator(5, 604_800_000, null, null), "hot_resale");
  assert.equal(classifyEconomicIndicator(0, 0, 100, 0), "capped_supply");
  assert.equal(classifyEconomicIndicator(1, 604_800_000, null, null), null);
});

test("CL-014: default revenue visibility is public", () => {
  assert.equal(DEFAULT_REVENUE_VISIBILITY, "public");
});

// ── Hashtags (SOC-030/031) ──

test("SOC-030: hashtag extraction and normalization", () => {
  const tags = extractHashtags("check out #Art and #digital_art today");
  assert.equal(tags.length, 2);
  assert.equal(tags[0].normalized, "art");
  assert.equal(tags[1].normalized, "digital_art");
});

test("SOC-030: hashtag suggestion", () => {
  const suggestions = suggestHashtags("dig", ["digital_art", "digitalpainting", "nature", "art"]);
  assert.ok(suggestions.length >= 2);
  assert.ok(suggestions[0].startsWith("digital"));
});

test("SOC-031: hashtag trend computation", () => {
  const now = Date.now();
  const occurrences = [
    { hashtag: "art", timestamp: new Date(now - 1000).toISOString() },
    { hashtag: "art", timestamp: new Date(now - 2000).toISOString() },
    { hashtag: "art", timestamp: new Date(now - 3000).toISOString() },
    { hashtag: "film", timestamp: new Date(now - 500_000).toISOString() },
  ];
  const trends = computeHashtagTrends(occurrences, 604_800_000, now);
  assert.ok(trends.length >= 1);
  assert.equal(trends[0].hashtag, "art");
  assert.ok(trends[0].count >= 3);
});
