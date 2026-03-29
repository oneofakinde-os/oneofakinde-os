import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCollectInventoryRoute } from "../../app/api/v1/collect/inventory/route";
import { POST as postCollectDropOffersRoute } from "../../app/api/v1/collect/offers/[drop_id]/route";
import { commerceBffService } from "../../lib/bff/service";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-offer-mgmt-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: workshop offer management page loads creator's drops with their offers", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const buyer = await commerceBffService.createSession({
    email: `buyer-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Get creator's drops via studio handle
  const drops = await commerceBffService.listDropsByStudioHandle(
    creator.handle,
    creator.accountId
  );
  assert.ok(drops.length > 0, "creator should have drops");

  // Find a resale-lane drop
  const inventoryResponse = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=resale", {
      headers: { "x-ook-session-token": buyer.sessionToken }
    })
  );
  const inventory = await parseJson<{
    listings: Array<{ drop: { id: string } }>;
  }>(inventoryResponse);
  const resaleDrop = inventory.listings[0];
  assert.ok(resaleDrop, "need resale listing");

  // Buyer submits offer
  const offerResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDrop.drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": buyer.sessionToken
      },
      body: JSON.stringify({
        action: "submit_resale_fixed_offer",
        amountUsd: 15.50
      })
    }),
    withRouteParams({ drop_id: resaleDrop.drop.id })
  );
  assert.equal(offerResponse.status, 201);

  // Load offers for creator's view (simulates what the workshop offers page does)
  const dropsWithOffers = await Promise.all(
    drops.map(async (drop) => {
      const result = await commerceBffService.getCollectDropOffers(
        drop.id,
        creator.accountId
      );
      return {
        dropId: drop.id,
        offers: result?.offers ?? []
      };
    })
  );

  // The resale drop should have the offer
  const targetDrop = dropsWithOffers.find((d) => d.dropId === resaleDrop.drop.id);
  assert.ok(targetDrop, "creator's drops should include the resale drop");
  assert.ok(targetDrop.offers.length > 0, "drop should have at least one offer");
  assert.equal(targetDrop.offers[0]!.state, "offer_submitted");
});

test("proof: transitionCollectOffer on gateway port accepts and settles offers", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const seller = await commerceBffService.createSession({
    email: `seller-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const buyer = await commerceBffService.createSession({
    email: `buyer-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Find resale listing and submit offer
  const inventoryResponse = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=resale", {
      headers: { "x-ook-session-token": buyer.sessionToken }
    })
  );
  const inventory = await parseJson<{
    listings: Array<{ drop: { id: string } }>;
  }>(inventoryResponse);
  const resaleDrop = inventory.listings[0];
  assert.ok(resaleDrop);

  // Seller acquires the drop first (so settlement has an owner to resolve)
  const sellerReceipt = await commerceBffService.purchaseDrop(seller.accountId, resaleDrop.drop.id);
  assert.ok(sellerReceipt, "seller should acquire the drop");

  // Submit offer via API
  await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDrop.drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": buyer.sessionToken
      },
      body: JSON.stringify({
        action: "submit_resale_fixed_offer",
        amountUsd: 20.00
      })
    }),
    withRouteParams({ drop_id: resaleDrop.drop.id })
  );

  // Get the offer ID
  const offersResult = await commerceBffService.getCollectDropOffers(
    resaleDrop.drop.id,
    creator.accountId
  );
  assert.ok(offersResult);
  const pendingOffer = offersResult.offers.find((o) => o.state === "offer_submitted");
  assert.ok(pendingOffer, "should have a pending offer");

  // Accept via transitionCollectOffer (same method the server action uses)
  const accepted = await commerceBffService.transitionCollectOffer({
    accountId: creator.accountId,
    offerId: pendingOffer.id,
    action: "accept_offer"
  });
  assert.ok(accepted, "accept should succeed");
  const acceptedOffer = accepted.offers.find((o) => o.id === pendingOffer.id);
  assert.equal(acceptedOffer?.state, "accepted");

  // Settle via transitionCollectOffer
  const settled = await commerceBffService.transitionCollectOffer({
    accountId: creator.accountId,
    offerId: pendingOffer.id,
    action: "settle_offer",
    executionPriceUsd: 20.00
  });
  assert.ok(settled, "settle should succeed");
  const settledOffer = settled.offers.find((o) => o.id === pendingOffer.id);
  assert.equal(settledOffer?.state, "settled");
});

test("proof: collector can withdraw their own resale offer", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const collector = await commerceBffService.createSession({
    email: `collector-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  // Find resale listing
  const inventoryResponse = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=resale", {
      headers: { "x-ook-session-token": collector.sessionToken }
    })
  );
  const inventory = await parseJson<{
    listings: Array<{ drop: { id: string } }>;
  }>(inventoryResponse);
  const resaleDrop = inventory.listings[0];
  assert.ok(resaleDrop);

  // Submit offer
  const submitResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDrop.drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        action: "submit_resale_fixed_offer",
        amountUsd: 12.00
      })
    }),
    withRouteParams({ drop_id: resaleDrop.drop.id })
  );
  assert.equal(submitResponse.status, 201);

  const submitPayload = await parseJson<{
    offers: Array<{ id: string; state: string }>;
  }>(submitResponse);
  const offerId = submitPayload.offers[0]?.id;
  assert.ok(offerId);

  // Collector withdraws their own offer
  const withdrawResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDrop.drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": collector.sessionToken
      },
      body: JSON.stringify({
        action: "withdraw_offer",
        offerId
      })
    }),
    withRouteParams({ drop_id: resaleDrop.drop.id })
  );
  assert.equal(withdrawResponse.status, 200, "withdraw should succeed");

  const withdrawPayload = await parseJson<{
    offers: Array<{ id: string; state: string }>;
  }>(withdrawResponse);
  const withdrawnOffer = withdrawPayload.offers.find((o) => o.id === offerId);
  assert.equal(withdrawnOffer?.state, "withdrawn", "offer should be withdrawn");
});
