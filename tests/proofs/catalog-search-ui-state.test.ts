import assert from "node:assert/strict";
import test from "node:test";
import { buildCatalogSearchHref, parseCatalogSearchUiState } from "../../lib/catalog/search-ui-state";

test("proof: catalog search ui state parser normalizes query, lane, and offer_state", () => {
  const parsed = parseCatalogSearchUiState({
    query: "  stardust  ",
    lane: "auction",
    offerState: "offer_submitted"
  });
  assert.equal(parsed.query, "stardust");
  assert.equal(parsed.lane, "auction");
  assert.equal(parsed.offerState, "offer_submitted");
  assert.equal(parsed.collectibility, "all");
  assert.equal(parsed.minPriceUsd, null);
  assert.equal(parsed.maxPriceUsd, null);
});

test("proof: catalog search ui state parser falls back for invalid lane/state", () => {
  const parsed = parseCatalogSearchUiState({
    query: "voidrunner",
    lane: "invalid-lane",
    offerState: "invalid-state"
  });
  assert.equal(parsed.query, "voidrunner");
  assert.equal(parsed.lane, "all");
  assert.equal(parsed.offerState, null);
});

test("proof: catalog search ui state parser reads collectibility + price range", () => {
  const parsed = parseCatalogSearchUiState({
    query: "stardust",
    collectibility: "collectible",
    minPriceUsd: "5",
    maxPriceUsd: "50.5"
  });
  assert.equal(parsed.collectibility, "collectible");
  assert.equal(parsed.minPriceUsd, 5);
  assert.equal(parsed.maxPriceUsd, 50.5);

  const invalid = parseCatalogSearchUiState({
    collectibility: "bogus",
    minPriceUsd: "-3",
    maxPriceUsd: "abc"
  });
  assert.equal(invalid.collectibility, "all");
  assert.equal(invalid.minPriceUsd, null);
  assert.equal(invalid.maxPriceUsd, null);
});

test("proof: catalog search href builder persists active filters and omits defaults", () => {
  const hrefWithFilters = buildCatalogSearchHref("/showroom/search", {
    query: "stardust",
    lane: "resale",
    offerState: "countered",
    collectibility: "all",
    minPriceUsd: null,
    maxPriceUsd: null
  });
  assert.equal(hrefWithFilters, "/showroom/search?q=stardust&lane=resale&offer_state=countered");

  const hrefWithPriceFilters = buildCatalogSearchHref("/showroom/search", {
    query: "stardust",
    lane: "all",
    offerState: null,
    collectibility: "collectible",
    minPriceUsd: 5,
    maxPriceUsd: 50
  });
  assert.equal(
    hrefWithPriceFilters,
    "/showroom/search?q=stardust&collectibility=collectible&min_price=5&max_price=50"
  );

  const hrefDefaults = buildCatalogSearchHref("/showroom/search", {
    query: "",
    lane: "all",
    offerState: null,
    collectibility: "all",
    minPriceUsd: null,
    maxPriceUsd: null
  });
  assert.equal(hrefDefaults, "/showroom/search");
});
