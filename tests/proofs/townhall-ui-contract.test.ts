import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { routes } from "../../lib/routes";

type TownhallUiContract = {
  version: string;
  townhall: {
    canonical_routes: string[];
    legacy_redirect_routes: string[];
    required_search_placeholder: string;
    required_showroom_modes: string[];
    required_ordering_lanes: string[];
    default_ordering_lane: string;
    required_social_actions: string[];
    required_markup_classes: string[];
    required_css_selectors: string[];
    forbidden_ui_nouns: string[];
  };
};

async function readContract(): Promise<TownhallUiContract> {
  const raw = await fs.readFile(path.join(process.cwd(), "config", "townhall-ui-contract.json"), "utf8");
  return JSON.parse(raw) as TownhallUiContract;
}

async function readTownhallSources() {
  const [feedScreen, bottomNav, css, showroomQuery] = await Promise.all([
    fs.readFile(
      path.join(process.cwd(), "features", "townhall", "townhall-feed-screen.tsx"),
      "utf8"
    ),
    fs.readFile(
      path.join(process.cwd(), "features", "townhall", "townhall-bottom-nav.tsx"),
      "utf8"
    ),
    fs.readFile(path.join(process.cwd(), "app", "globals.css"), "utf8"),
    fs.readFile(path.join(process.cwd(), "lib", "townhall", "showroom-query.ts"), "utf8")
  ]);

  return {
    feedScreen,
    bottomNav,
    css,
    showroomQuery
  };
}

test("proof: townhall ui contract file is strict and deduplicated", async () => {
  const contract = await readContract();
  assert.ok(contract.version, "expected contract version");

  const { townhall } = contract;
  const arrays: Array<keyof TownhallUiContract["townhall"]> = [
    "canonical_routes",
    "legacy_redirect_routes",
    "required_showroom_modes",
    "required_ordering_lanes",
    "required_social_actions",
    "required_markup_classes",
    "required_css_selectors",
    "forbidden_ui_nouns"
  ];

  for (const key of arrays) {
    const values = townhall[key];
    assert.ok(values.length > 0, `expected ${key} values`);
    assert.equal(new Set(values).size, values.length, `expected ${key} to be deduplicated`);
  }
});

test("proof: townhall canonical and legacy routes align with route helpers", async () => {
  const contract = await readContract();
  const expectedCanonical = new Set([
    routes.townhall(),
    routes.townhallWatch(),
    routes.townhallListen(),
    routes.townhallRead(),
    routes.townhallPhotos(),
    routes.townhallLive(),
    routes.townhallSearch()
  ]);
  const expectedLegacy = new Set([
    "/townhall/gallery"
  ]);

  assert.deepEqual(new Set(contract.townhall.canonical_routes), expectedCanonical);
  assert.deepEqual(new Set(contract.townhall.legacy_redirect_routes), expectedLegacy);
});

test("proof: townhall feed layout and overlay chrome satisfy the ui contract", async () => {
  const contract = await readContract();
  const sources = await readTownhallSources();

  assert.ok(
    sources.feedScreen.includes(`aria-label="search oneofakinde cosmos"`),
    "expected search icon link in feed screen header"
  );

  for (const className of contract.townhall.required_markup_classes) {
    const appearsInFeed = sources.feedScreen.includes(className);
    const appearsInBottomNav = sources.bottomNav.includes(className);
    assert.ok(
      appearsInFeed || appearsInBottomNav,
      `expected required markup class ${className}`
    );
  }

  for (const selector of contract.townhall.required_css_selectors) {
    assert.ok(sources.css.includes(selector), `expected css selector ${selector}`);
  }

  // Showroom modes and ordering lanes are now handled via
  // bottom nav surface links (constitutional design), not inline
  // filter chips. The feed screen uses a canonical default ordering
  // internally but does not render mode/ordering UI.
  assert.ok(
    sources.feedScreen.includes(
      `showroomOrdering = DEFAULT_TOWNHALL_SHOWROOM_ORDERING`
    ),
    "expected feed screen to use canonical default showroom ordering"
  );
  assert.ok(
    sources.showroomQuery.includes(
      `DEFAULT_TOWNHALL_SHOWROOM_ORDERING: TownhallShowroomOrdering = "${contract.townhall.default_ordering_lane}"`
    ),
    "expected showroom query default ordering to align with contract"
  );

  for (const ariaLabel of contract.townhall.required_social_actions) {
    assert.ok(
      sources.feedScreen.includes(`aria-label="${ariaLabel}"`),
      `expected social action aria label ${ariaLabel}`
    );
  }

  assert.match(
    sources.feedScreen,
    /<TownhallBottomNav\s+activeMode=\{modeNav\(mode\)\}\s+noImmersiveToggle\s*\/>/,
    "expected icon bottom nav with no-immersive-toggle guard"
  );

  const feedLower = sources.feedScreen.toLowerCase();
  const navLower = sources.bottomNav.toLowerCase();
  for (const noun of contract.townhall.forbidden_ui_nouns) {
    const regex = new RegExp(`\\b${noun.toLowerCase()}\\b`, "g");
    if (noun === "gallery") {
      // "gallery" is now a constitutional surface name (bottom nav slot
      // and modeNav mapping) — allowed in both feed and nav
      continue;
    }

    assert.ok(!regex.test(feedLower), `expected forbidden noun ${noun} not in townhall feed copy`);
    assert.ok(!regex.test(navLower), `expected forbidden noun ${noun} not in bottom nav copy`);
  }
});
