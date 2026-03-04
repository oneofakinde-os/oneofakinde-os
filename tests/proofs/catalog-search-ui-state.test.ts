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

test("proof: catalog search href builder persists active filters and omits defaults", () => {
  const hrefWithFilters = buildCatalogSearchHref("/showroom/search", {
    query: "stardust",
    lane: "resale",
    offerState: "countered"
  });
  assert.equal(hrefWithFilters, "/showroom/search?q=stardust&lane=resale&offer_state=countered");

  const hrefDefaults = buildCatalogSearchHref("/showroom/search", {
    query: "",
    lane: "all",
    offerState: null
  });
  assert.equal(hrefDefaults, "/showroom/search");
});
