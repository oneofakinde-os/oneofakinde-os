import assert from "node:assert/strict";
import test from "node:test";
import type { Drop } from "../../lib/domain/contracts";
import {
  filterDropsForShowroomMedia,
  parseTownhallShowroomMediaFilter,
  parseTownhallShowroomOrdering
} from "../../lib/townhall/showroom-query";

function makeDrop(id: string, modes: Array<"watch" | "listen" | "read" | "photos" | "live">): Drop {
  const previewMedia: Drop["previewMedia"] = {};
  for (const mode of modes) {
    previewMedia[mode] = {
      type: mode === "listen" ? "audio" : mode === "read" ? "text" : "video",
      src: `${id}-${mode}`
    };
  }

  return {
    id,
    title: id,
    seasonLabel: "season",
    episodeLabel: "episode",
    studioHandle: "oneofakinde",
    worldId: "dark-matter",
    worldLabel: "dark matter",
    synopsis: `${id} synopsis`,
    releaseDate: "2026-02-16",
    priceUsd: 1.99,
    previewMedia
  };
}

test("showroom query parsing falls back to canonical defaults", () => {
  assert.equal(parseTownhallShowroomMediaFilter(null), "all");
  assert.equal(parseTownhallShowroomMediaFilter("invalid"), "all");
  assert.equal(parseTownhallShowroomOrdering(null), "rising");
  assert.equal(parseTownhallShowroomOrdering("bad"), "rising");
});

test("showroom ordering parsing supports six-lane contract", () => {
  assert.equal(parseTownhallShowroomOrdering("for_you"), "for_you");
  assert.equal(parseTownhallShowroomOrdering("rising"), "rising");
  assert.equal(parseTownhallShowroomOrdering("newest"), "newest");
  assert.equal(parseTownhallShowroomOrdering("most_collected"), "most_collected");
  assert.equal(parseTownhallShowroomOrdering("new_voices"), "new_voices");
  assert.equal(parseTownhallShowroomOrdering("sustained_craft"), "sustained_craft");
});

test("showroom media filtering returns only drops with the selected mode", () => {
  const drops = [
    makeDrop("watch-only", ["watch"]),
    makeDrop("listen-read", ["listen", "read"]),
    makeDrop("all-modes", ["watch", "listen", "read", "photos", "live"])
  ];

  assert.deepEqual(
    filterDropsForShowroomMedia(drops, "watch").map((drop) => drop.id),
    ["watch-only", "all-modes"]
  );
  assert.deepEqual(
    filterDropsForShowroomMedia(drops, "read").map((drop) => drop.id),
    ["listen-read", "all-modes"]
  );
  assert.deepEqual(
    filterDropsForShowroomMedia(drops, "all").map((drop) => drop.id),
    ["watch-only", "listen-read", "all-modes"]
  );
});
