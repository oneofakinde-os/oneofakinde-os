import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTownhallFeedHrefWithFocus,
  parseTownhallFeedFocusDrop,
  parseTownhallFeedFocusPosition,
  resolveTownhallFeedActiveIndex,
  routeForTownhallMediaFilter
} from "../../lib/townhall/feed-focus";

const drops = [{ id: "stardust" }, { id: "voidrunner" }, { id: "twilight-whispers" }];

test("proof: townhall feed focus resolves drop-first fallback to position", () => {
  assert.equal(
    resolveTownhallFeedActiveIndex(drops, {
      dropId: "voidrunner",
      position: 1
    }),
    1
  );

  assert.equal(
    resolveTownhallFeedActiveIndex(drops, {
      dropId: "missing",
      position: 2
    }),
    1
  );

  assert.equal(
    resolveTownhallFeedActiveIndex(drops, {
      dropId: null,
      position: 9
    }),
    2
  );
});

test("proof: townhall feed focus query parsing is strict and safe", () => {
  assert.equal(parseTownhallFeedFocusDrop("  stardust "), "stardust");
  assert.equal(parseTownhallFeedFocusDrop(""), null);
  assert.equal(parseTownhallFeedFocusDrop(undefined), null);

  assert.equal(parseTownhallFeedFocusPosition("3"), 3);
  assert.equal(parseTownhallFeedFocusPosition("-2"), null);
  assert.equal(parseTownhallFeedFocusPosition("abc"), null);
  assert.equal(parseTownhallFeedFocusPosition(undefined), null);
});

test("proof: townhall return href keeps mode lane, ordering, and feed focus", () => {
  assert.equal(routeForTownhallMediaFilter("watch"), "/showroom/watch");
  assert.equal(routeForTownhallMediaFilter("all"), "/showroom");

  const href = buildTownhallFeedHrefWithFocus({
    mediaFilter: "watch",
    ordering: "most_collected",
    focusDropId: "voidrunner",
    focusPosition: 4
  });

  const parsed = new URL(href, "https://oneofakinde.local");
  assert.equal(parsed.pathname, "/showroom/watch");
  assert.equal(parsed.searchParams.get("lane_key"), "most_collected");
  assert.equal(parsed.searchParams.get("focusDrop"), "voidrunner");
  assert.equal(parsed.searchParams.get("focusPosition"), "4");
});
