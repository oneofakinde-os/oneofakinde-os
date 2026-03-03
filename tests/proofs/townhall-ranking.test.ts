import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { Drop } from "../../lib/domain/contracts";
import { rankDropsForTownhall } from "../../lib/townhall/ranking";

function makeDrop(id: string, releaseDate: string, studioHandle = "oneofakinde", priceUsd = 1.99): Drop {
  return {
    id,
    title: id,
    seasonLabel: "season one",
    episodeLabel: "episode one",
    studioHandle,
    worldId: "dark-matter",
    worldLabel: "dark matter",
    synopsis: `${id} synopsis`,
    releaseDate,
    priceUsd
  };
}

test("townhall ranking keeps all drops", () => {
  const drops = [
    makeDrop("alpha", "2026-02-15"),
    makeDrop("beta", "2026-02-14"),
    makeDrop("gamma", "2026-02-13")
  ];

  const ranked = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z")
  });

  assert.equal(ranked.length, drops.length);
  assert.deepEqual(
    [...ranked.map((drop) => drop.id)].sort(),
    [...drops.map((drop) => drop.id)].sort()
  );
});

test("townhall ranking supports newest lane", () => {
  const drops = [
    makeDrop("older", "2026-01-01"),
    makeDrop("newer", "2026-02-19"),
    makeDrop("middle", "2026-02-10")
  ];

  const ranked = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z"),
    laneKey: "newest"
  });

  assert.deepEqual(
    ranked.map((drop) => drop.id),
    ["newer", "middle", "older"]
  );
});

test("townhall ranking supports most_collected lane from telemetry intents+completions", () => {
  const drops = [
    makeDrop("low", "2026-02-19"),
    makeDrop("high", "2026-02-18"),
    makeDrop("mid", "2026-02-17")
  ];

  const ranked = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z"),
    laneKey: "most_collected",
    telemetryByDropId: {
      low: { collectIntents: 1, completions: 0 },
      high: { collectIntents: 9, completions: 8 },
      mid: { collectIntents: 3, completions: 2 }
    }
  });

  assert.deepEqual(
    ranked.map((drop) => drop.id),
    ["high", "mid", "low"]
  );
});

test("townhall ranking supports new_voices lane with threshold", () => {
  const drops = [
    makeDrop("legacy-a", "2026-02-19", "legacy"),
    makeDrop("legacy-b", "2026-02-18", "legacy"),
    makeDrop("new-a", "2026-02-17", "new-voice")
  ];

  const ranked = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z"),
    laneKey: "new_voices",
    newVoicesCollectThreshold: 100,
    signalsByDropId: {
      "legacy-a": { collected: 800, watched: 10_000, liked: 300, shared: 60, commented: 50, saved: 200 },
      "legacy-b": { collected: 700, watched: 9_000, liked: 250, shared: 40, commented: 35, saved: 170 },
      "new-a": { collected: 20, watched: 2_000, liked: 80, shared: 10, commented: 12, saved: 35 }
    }
  });

  assert.equal(ranked[0]?.id, "new-a");
});

test("townhall ranking supports sustained_craft lane", () => {
  const drops = [
    makeDrop("new-low", "2026-02-19"),
    makeDrop("older-strong", "2026-01-20")
  ];

  const ranked = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z"),
    laneKey: "sustained_craft",
    signalsByDropId: {
      "new-low": { collected: 1, watched: 100, liked: 10, shared: 2, commented: 1, saved: 3 },
      "older-strong": {
        collected: 3_000,
        watched: 400_000,
        liked: 40_000,
        shared: 4_800,
        commented: 4_200,
        saved: 9_100
      }
    }
  });

  assert.equal(ranked[0]?.id, "older-strong");
});

test("townhall ranking for_you falls back to rising for viewers without taste signals", () => {
  const drops = [
    makeDrop("alpha", "2026-02-19"),
    makeDrop("beta", "2026-02-18"),
    makeDrop("gamma", "2026-02-17")
  ];

  const rising = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z"),
    laneKey: "rising"
  });

  const forYouFallback = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z"),
    laneKey: "for_you",
    viewerAccountId: null,
    viewerHasTasteSignals: false
  });

  assert.deepEqual(
    forYouFallback.map((drop) => drop.id),
    rising.map((drop) => drop.id)
  );
});

test("townhall ranking is price-blind across all lanes", async () => {
  const drops = [
    makeDrop("expensive", "2026-02-19", "oneofakinde", 999.99),
    makeDrop("affordable", "2026-02-18", "oneofakinde", 0.99)
  ];

  const rising = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z"),
    laneKey: "rising",
    signalsByDropId: {
      expensive: { collected: 10, watched: 1_000, liked: 100, shared: 10, commented: 10, saved: 20 },
      affordable: { collected: 10, watched: 1_000, liked: 100, shared: 10, commented: 10, saved: 20 }
    }
  });

  const newest = rankDropsForTownhall(drops, {
    now: new Date("2026-02-20T00:00:00.000Z"),
    laneKey: "newest"
  });

  assert.deepEqual(rising.map((drop) => drop.id), ["expensive", "affordable"]);
  assert.deepEqual(newest.map((drop) => drop.id), ["expensive", "affordable"]);

  const rankingSource = await fs.readFile(
    path.join(process.cwd(), "lib", "townhall", "ranking.ts"),
    "utf8"
  );
  assert.equal(
    /priceUsd/.test(rankingSource),
    false,
    "ranking logic must stay price-blind"
  );
});
