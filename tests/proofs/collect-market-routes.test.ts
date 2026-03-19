import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCollectInventoryRoute } from "../../app/api/v1/collect/inventory/route";
import { GET as getCollectDropOffersRoute } from "../../app/api/v1/collect/offers/[drop_id]/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-collect-market-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: collect inventory route enforces session and lane filtering", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const unauthorized = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory")
  );
  assert.equal(unauthorized.status, 401);

  const session = await commerceBffService.createSession({
    email: `collect-lane-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const response = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=auction", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(response.status, 200);

  const payload = await parseJson<{
    lane: string;
    laneMetadata: {
      requestedLane: string | null;
      resolvedLane: string;
      availableLanes: string[];
      totalListings: number;
      generatedAt: string;
    };
    listings: Array<{ lane: string }>;
  }>(response);
  assert.equal(payload.lane, "auction");
  assert.equal(payload.laneMetadata.requestedLane, "auction");
  assert.equal(payload.laneMetadata.resolvedLane, "auction");
  assert.deepEqual(payload.laneMetadata.availableLanes, ["all", "sale", "auction", "resale"]);
  assert.ok(payload.laneMetadata.totalListings >= payload.listings.length);
  assert.ok(Date.parse(payload.laneMetadata.generatedAt) > 0);
  assert.ok(payload.listings.length > 0);
  assert.ok(payload.listings.every((entry) => entry.lane === "auction"));
});

test("proof: collect drop offers route resolves listing + offers snapshot", async () => {
  const response = await getCollectDropOffersRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/offers/stardust"),
    withRouteParams({ drop_id: "stardust" })
  );
  assert.equal(response.status, 200);

  const payload = await parseJson<{
    dropId: string;
    listing: { drop: { id: string }; lane: string } | null;
    offers: Array<{ dropId: string }>;
  }>(response);
  assert.equal(payload.dropId, "stardust");
  assert.equal(payload.listing?.drop.id, "stardust");
  assert.ok(payload.offers.every((entry) => entry.dropId === "stardust"));
});
