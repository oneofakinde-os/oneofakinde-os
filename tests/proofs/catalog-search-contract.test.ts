import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCatalogSearchRoute } from "../../app/api/v1/catalog/search/route";
import { commerceBffService } from "../../lib/bff/service";

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

type CatalogSearchPayload = {
  results: Array<{
    id: string;
    priceUsd: number;
  }>;
  cursor?: string;
  total: number;
};

test("proof: catalog search route documents backend decision contract", async () => {
  const source = await fs.readFile(
    path.join(process.cwd(), "app", "api", "v1", "catalog", "search", "route.ts"),
    "utf8"
  );
  assert.match(source, /Backend decision/i);
  assert.match(source, /Postgres FTS/i);
});

test("proof: catalog search route returns authority response shape", async () => {
  const response = await getCatalogSearchRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/search?q=stardust&limit=5")
  );
  assert.equal(response.status, 200);

  const payload = await parseJson<CatalogSearchPayload>(response);
  assert.ok(!Object.hasOwn(payload, "search"));
  assert.ok(payload.results.length >= 1);
  assert.ok(payload.total >= payload.results.length);

  const drop = payload.results[0];
  assert.ok(drop.id);
  assert.equal(typeof drop.priceUsd, "number");
});

test("proof: catalog search lane and offer-state filters wire into collect lifecycle", async () => {
  const collectInventory = await commerceBffService.getCollectInventory(null, "all");
  const listingByDropId = new Map(
    collectInventory.listings.map((listing) => [listing.drop.id, listing])
  );

  const laneResponse = await getCatalogSearchRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/search?lane=auction&limit=20")
  );
  assert.equal(laneResponse.status, 200);
  const lanePayload = await parseJson<CatalogSearchPayload>(laneResponse);
  assert.ok(lanePayload.results.length > 0);
  assert.ok(lanePayload.results.every((drop) => listingByDropId.get(drop.id)?.lane === "auction"));

  const stateResponse = await getCatalogSearchRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/search?offer_state=offer_submitted&limit=20")
  );
  assert.equal(stateResponse.status, 200);
  const statePayload = await parseJson<CatalogSearchPayload>(stateResponse);
  assert.ok(statePayload.results.length > 0);
  assert.ok(
    statePayload.results.every(
      (drop) => listingByDropId.get(drop.id)?.latestOfferState === "offer_submitted"
    )
  );
});
