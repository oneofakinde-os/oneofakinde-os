import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCatalogSearchRoute } from "../../app/api/v1/catalog/search/route";

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

type CatalogSearchPayload = {
  search: {
    query: string;
    lane: string;
    offerState: string | null;
    limit: number;
    users: Array<{
      handle: string;
      title: string;
      synopsis: string;
    }>;
    worlds: Array<{
      id: string;
      title: string;
      synopsis: string;
      studioHandle: string;
    }>;
    drops: Array<{
      id: string;
      title: string;
      synopsis: string;
      worldId: string;
      worldLabel: string;
      studioHandle: string;
      priceUsd: number;
      collect: {
        lane: string;
        listingType: string;
        offerCount: number;
        highestOfferUsd: number | null;
        latestOfferState: string;
        listingPriceUsd: number;
      } | null;
    }>;
  };
};

test("proof: catalog search route documents backend decision contract", async () => {
  const source = await fs.readFile(
    path.join(process.cwd(), "app", "api", "v1", "catalog", "search", "route.ts"),
    "utf8"
  );
  assert.match(source, /Backend decision/i);
  assert.match(source, /Postgres FTS/i);
});

test("proof: catalog search route returns stable no-leak search payload", async () => {
  const response = await getCatalogSearchRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/search?q=stardust&limit=5")
  );
  assert.equal(response.status, 200);

  const payload = await parseJson<CatalogSearchPayload>(response);
  assert.equal(payload.search.query, "stardust");
  assert.ok(payload.search.drops.length >= 1);

  const drop = payload.search.drops[0];
  assert.ok(drop.id);
  assert.equal(typeof drop.priceUsd, "number");
  if (drop.collect) {
    assert.equal(typeof drop.collect.latestOfferState, "string");
    assert.ok(!Object.hasOwn(drop.collect, "executionPriceUsd"));
    assert.ok(!Object.hasOwn(drop.collect, "accountId"));
  }
});

test("proof: catalog search lane and offer-state filters wire into collect lifecycle", async () => {
  const laneResponse = await getCatalogSearchRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/search?lane=auction&limit=20")
  );
  assert.equal(laneResponse.status, 200);
  const lanePayload = await parseJson<CatalogSearchPayload>(laneResponse);
  assert.ok(lanePayload.search.drops.length > 0);
  assert.ok(lanePayload.search.drops.every((drop) => drop.collect?.lane === "auction"));

  const stateResponse = await getCatalogSearchRoute(
    new Request("http://127.0.0.1:3000/api/v1/catalog/search?offer_state=offer_submitted&limit=20")
  );
  assert.equal(stateResponse.status, 200);
  const statePayload = await parseJson<CatalogSearchPayload>(stateResponse);
  assert.ok(statePayload.search.drops.length > 0);
  assert.ok(
    statePayload.search.drops.every((drop) => drop.collect?.latestOfferState === "offer_submitted")
  );
});
