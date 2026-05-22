/**
 * Proof: Sprint 7 — search price + collectibility filters (DSC-006).
 *
 * executeCatalogSearch now applies the pre-built discovery filters
 * (filterByPriceRange + filterByCollectibility). These assert the invariant
 * that returned drops always respect the active filter.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { executeCatalogSearch } from "../../lib/catalog/search";

test("proof: collectibility=free returns only zero-price drops", async () => {
  const result = await executeCatalogSearch({ collectibility: "free", limit: 20 });
  assert.equal(result.collectibility, "free");
  assert.ok(
    result.drops.every((drop) => drop.priceUsd === 0),
    "every free result has priceUsd === 0"
  );
});

test("proof: collectibility=collectible returns only priced drops", async () => {
  const result = await executeCatalogSearch({ collectibility: "collectible", limit: 20 });
  assert.equal(result.collectibility, "collectible");
  assert.ok(
    result.drops.every((drop) => drop.priceUsd > 0),
    "every collectible result has priceUsd > 0"
  );
});

test("proof: price range bounds the returned drops", async () => {
  const minUsd = 1;
  const maxUsd = 10;
  const result = await executeCatalogSearch({
    minPriceUsd: minUsd,
    maxPriceUsd: maxUsd,
    limit: 20
  });
  assert.equal(result.priceRange.minUsd, minUsd);
  assert.equal(result.priceRange.maxUsd, maxUsd);
  assert.ok(
    result.drops.every((drop) => drop.priceUsd >= minUsd && drop.priceUsd <= maxUsd),
    "every result falls within the price range"
  );
});

test("proof: invalid filter values fall back to no-op defaults", async () => {
  const result = await executeCatalogSearch({
    collectibility: "bogus",
    minPriceUsd: "-5",
    maxPriceUsd: "abc",
    limit: 20
  });
  assert.equal(result.collectibility, "all", "invalid collectibility -> all");
  assert.equal(result.priceRange.minUsd, null, "negative min -> null");
  assert.equal(result.priceRange.maxUsd, null, "non-numeric max -> null");
});
