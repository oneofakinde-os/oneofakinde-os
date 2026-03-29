import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getCollectInventoryRoute } from "../../app/api/v1/collect/inventory/route";
import { POST as postCollectDropOffersRoute } from "../../app/api/v1/collect/offers/[drop_id]/route";
import { commerceBffService } from "../../lib/bff/service";
import type { MyCollectionAnalyticsPanel, WorkshopAnalyticsPanel } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-resale-analytics-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

test("proof: resale settlement flows into workshop analytics panel as royalty income", async (t) => {
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

  // Before any resale: workshop panel should show zero resale royalties
  const panelBefore = await commerceBffService.getWorkshopAnalyticsPanel(creator.accountId);
  assert.ok(panelBefore, "workshop analytics should exist before resale");
  assert.equal(panelBefore.resaleRoyalties.resaleTransactions, 0);
  assert.equal(panelBefore.resaleRoyalties.royaltyGrossUsd, 0);

  // Find resale listing, seller purchases it, buyer makes offer, settle
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

  // Seller acquires the drop first
  const receipt = await commerceBffService.purchaseDrop(seller.accountId, resaleDrop.drop.id);
  assert.ok(receipt);

  // Buyer submits offer
  await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDrop.drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": buyer.sessionToken
      },
      body: JSON.stringify({ action: "submit_resale_fixed_offer", amountUsd: 30.00 })
    }),
    withRouteParams({ drop_id: resaleDrop.drop.id })
  );

  // Creator accepts
  await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDrop.drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({ action: "accept_latest_resale_offer" })
    }),
    withRouteParams({ drop_id: resaleDrop.drop.id })
  );

  // Creator settles
  await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDrop.drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({ action: "settle_latest_resale_offer", executionPriceUsd: 30.00 })
    }),
    withRouteParams({ drop_id: resaleDrop.drop.id })
  );

  // After resale: workshop panel should reflect royalty income
  const panelAfter = await commerceBffService.getWorkshopAnalyticsPanel(creator.accountId);
  assert.ok(panelAfter);
  assert.equal(panelAfter.resaleRoyalties.resaleTransactions, 1, "one resale transaction");
  assert.ok(panelAfter.resaleRoyalties.royaltyGrossUsd > 0, "royalty income should be positive");
  assert.equal(panelAfter.resaleRoyalties.royaltyLedgerLineItems, 1, "one royalty line item");
});

test("proof: resale settlement flows into my-collection analytics as resale activity", async (t) => {
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

  // Find a resale drop, seller buys it
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

  await commerceBffService.purchaseDrop(seller.accountId, resaleDrop.drop.id);

  // Before resale: check seller and buyer analytics
  const sellerBefore = await commerceBffService.getMyCollectionAnalyticsPanel(seller.accountId);
  assert.ok(sellerBefore);
  assert.equal(sellerBefore.resaleActivity.soldCount, 0);
  assert.equal(sellerBefore.resaleActivity.soldProceedsUsd, 0);

  const buyerBefore = await commerceBffService.getMyCollectionAnalyticsPanel(buyer.accountId);
  assert.ok(buyerBefore);
  assert.equal(buyerBefore.resaleActivity.purchasedViaResaleCount, 0);

  // Execute the resale flow
  await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDrop.drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": buyer.sessionToken
      },
      body: JSON.stringify({ action: "submit_resale_fixed_offer", amountUsd: 40.00 })
    }),
    withRouteParams({ drop_id: resaleDrop.drop.id })
  );

  await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDrop.drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({ action: "accept_latest_resale_offer" })
    }),
    withRouteParams({ drop_id: resaleDrop.drop.id })
  );

  await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDrop.drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({ action: "settle_latest_resale_offer", executionPriceUsd: 40.00 })
    }),
    withRouteParams({ drop_id: resaleDrop.drop.id })
  );

  // After resale: seller should show sold activity
  const sellerAfter = await commerceBffService.getMyCollectionAnalyticsPanel(seller.accountId);
  assert.ok(sellerAfter);
  assert.equal(sellerAfter.resaleActivity.soldCount, 1, "seller sold one piece");
  assert.ok(sellerAfter.resaleActivity.soldProceedsUsd > 0, "seller should have proceeds");

  // After resale: buyer should show purchased via resale
  const buyerAfter = await commerceBffService.getMyCollectionAnalyticsPanel(buyer.accountId);
  assert.ok(buyerAfter);
  assert.equal(buyerAfter.resaleActivity.purchasedViaResaleCount, 1, "buyer acquired one via resale");
});
