import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCollectInventoryRoute } from "../../app/api/v1/collect/inventory/route";
import {
  GET as getCollectDropOffersRoute,
  POST as postCollectDropOffersRoute
} from "../../app/api/v1/collect/offers/[drop_id]/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-collect-resale-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: fixed resale offers persist and private execution values stay hidden on public response", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const seller = await commerceBffService.createSession({
    email: `resale-seller-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const collector = await commerceBffService.createSession({
    email: `resale-collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  const inventoryResponse = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=resale", {
      headers: {
        "x-ook-session-token": collector.sessionToken
      }
    })
  );
  assert.equal(inventoryResponse.status, 200);
  const inventoryPayload = await parseJson<{
    listings: Array<{ drop: { id: string } }>;
  }>(inventoryResponse);
  const resaleDropId = inventoryPayload.listings[0]?.drop.id;
  assert.ok(resaleDropId, "expected resale lane drop");

  // Seller acquires the drop so settlement can resolve an owner
  const sellerReceipt = await commerceBffService.purchaseDrop(seller.accountId, resaleDropId);
  assert.ok(sellerReceipt, "seller should own the drop");

  const submitResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        action: "submit_resale_fixed_offer",
        amountUsd: 11.11
      })
    }),
    withRouteParams({ drop_id: resaleDropId })
  );
  assert.equal(submitResponse.status, 201);
  const submitPayload = await parseJson<{
    offers: Array<{ id: string; state: string; executionPriceUsd: number | null }>;
  }>(submitResponse);
  assert.equal(submitPayload.offers[0]?.state, "offer_submitted");
  const createdOfferId = submitPayload.offers[0]?.id;
  assert.ok(createdOfferId, "expected created resale offer id");

  const acceptResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        action: "accept_latest_resale_offer"
      })
    }),
    withRouteParams({ drop_id: resaleDropId })
  );
  assert.equal(acceptResponse.status, 200);

  const settleResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        action: "settle_latest_resale_offer",
        executionPriceUsd: 10.73
      })
    }),
    withRouteParams({ drop_id: resaleDropId })
  );
  assert.equal(settleResponse.status, 200);

  const publicResponse = await getCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDropId}`),
    withRouteParams({ drop_id: resaleDropId })
  );
  assert.equal(publicResponse.status, 200);
  const publicPayload = await parseJson<{
    offers: Array<{ id: string; state: string; executionVisibility: string | null; executionPriceUsd: number | null }>;
  }>(publicResponse);
  const publicOffer = publicPayload.offers.find((offer) => offer.id === createdOfferId);
  assert.equal(publicOffer?.state, "settled");
  assert.equal(publicOffer?.executionVisibility, "private");
  assert.equal(publicOffer?.executionPriceUsd, null);

  const collectorViewResponse = await getCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDropId}`, {
      headers: {
        "x-ook-session-token": collector.sessionToken
      }
    }),
    withRouteParams({ drop_id: resaleDropId })
  );
  assert.equal(collectorViewResponse.status, 200);
  const collectorViewPayload = await parseJson<{
    offers: Array<{ id: string; executionPriceUsd: number | null }>;
  }>(collectorViewResponse);
  const collectorOffer = collectorViewPayload.offers.find((offer) => offer.id === createdOfferId);
  assert.equal(collectorOffer?.executionPriceUsd, 10.73);

  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    collectOffers: Array<{ id: string; state: string; executionVisibility: string; executionPriceUsd: number | null }>;
  };
  const persistedOffer = raw.collectOffers.find((offer) => offer.id === createdOfferId);
  assert.equal(persistedOffer?.state, "settled");
  assert.equal(persistedOffer?.executionVisibility, "private");
  assert.equal(persistedOffer?.executionPriceUsd, 10.73);
});

test("proof: collect offer transitions are drop-scoped and settle rejects non-positive execution prices", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const collector = await commerceBffService.createSession({
    email: `resale-collector-scope-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  const inventoryResponse = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=resale", {
      headers: {
        "x-ook-session-token": collector.sessionToken
      }
    })
  );
  assert.equal(inventoryResponse.status, 200);
  const inventoryPayload = await parseJson<{
    listings: Array<{ drop: { id: string } }>;
  }>(inventoryResponse);
  const resaleDropId = inventoryPayload.listings[0]?.drop.id;
  assert.ok(resaleDropId, "expected resale lane drop");

  const allDrops = await commerceBffService.listDrops();
  const otherDropId = allDrops.find((drop) => drop.id !== resaleDropId)?.id;
  assert.ok(otherDropId, "expected different drop for scope proof");

  const submitResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        action: "submit_resale_fixed_offer",
        amountUsd: 9.5
      })
    }),
    withRouteParams({ drop_id: resaleDropId })
  );
  assert.equal(submitResponse.status, 201);
  const submitPayload = await parseJson<{
    offers: Array<{ id: string }>;
  }>(submitResponse);
  const createdOfferId = submitPayload.offers[0]?.id;
  assert.ok(createdOfferId, "expected created offer id");

  const crossDropTransition = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${otherDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        action: "accept_offer",
        offerId: createdOfferId
      })
    }),
    withRouteParams({ drop_id: otherDropId! })
  );
  assert.equal(crossDropTransition.status, 404);

  const acceptResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        action: "accept_latest_resale_offer"
      })
    }),
    withRouteParams({ drop_id: resaleDropId })
  );
  assert.equal(acceptResponse.status, 200);

  const invalidSettle = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDropId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        action: "settle_latest_resale_offer",
        executionPriceUsd: 0
      })
    }),
    withRouteParams({ drop_id: resaleDropId })
  );
  assert.equal(invalidSettle.status, 400);
});
