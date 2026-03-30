import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { commerceBffService } from "../../lib/bff/service";
import {
  GET as getOffersRoute
} from "../../app/api/v1/account/offers/route";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-collector-listings-${randomUUID()}.json`);
}

test("proof: collector listings — list own offers across drops", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  // Create a collector session
  const collector = await commerceBffService.createSession({
    email: "collector-listings@example.com",
    role: "collector"
  });
  assert.ok(collector, "collector session created");

  // Initially no offers
  const emptyListings = await commerceBffService.listCollectorOffers(collector.accountId);
  assert.equal(emptyListings.length, 0, "no listings initially");

  // Find a resale-lane drop from inventory
  const inventory = await commerceBffService.getCollectInventory(collector.accountId, "resale");
  assert.ok(inventory.listings.length > 0, "resale inventory has listings");
  const resaleDrop = inventory.listings[0]!.drop;

  // Purchase the drop so collector owns it
  const receipt = await commerceBffService.purchaseDrop(collector.accountId, resaleDrop.id);
  assert.ok(receipt, "drop purchased");

  // List the drop for resale
  const resaleResult = await commerceBffService.submitCollectResaleOffer({
    accountId: collector.accountId,
    dropId: resaleDrop.id,
    amountUsd: 25.0
  });
  assert.ok(resaleResult, "resale offer submitted");

  // Should now have one listing
  const listings = await commerceBffService.listCollectorOffers(collector.accountId);
  assert.equal(listings.length, 1, "one listing after resale submission");

  const listing = listings[0]!;
  assert.equal(listing.dropId, resaleDrop.id);
  assert.equal(listing.offer.listingType, "resale");
  assert.ok(listing.dropTitle, "drop title populated");
  assert.ok(listing.studioHandle, "studio handle populated");
  assert.ok(listing.originalPriceUsd > 0, "original price populated");
  assert.equal(listing.offer.state, "offer_submitted", "resale offer state after submission");
});

test("proof: collector listings are isolated between accounts", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const alice = await commerceBffService.createSession({
    email: "alice-listings@example.com",
    role: "collector"
  });
  const bob = await commerceBffService.createSession({
    email: "bob-listings@example.com",
    role: "collector"
  });
  assert.ok(alice);
  assert.ok(bob);

  // Find a resale drop
  const inventory = await commerceBffService.getCollectInventory(alice.accountId, "resale");
  assert.ok(inventory.listings.length > 0);
  const resaleDrop = inventory.listings[0]!.drop;

  // Alice purchases and lists
  await commerceBffService.purchaseDrop(alice.accountId, resaleDrop.id);
  await commerceBffService.submitCollectResaleOffer({
    accountId: alice.accountId,
    dropId: resaleDrop.id,
    amountUsd: 30.0
  });

  // Alice sees her listing
  const aliceListings = await commerceBffService.listCollectorOffers(alice.accountId);
  assert.equal(aliceListings.length, 1, "Alice sees her listing");

  // Bob sees nothing
  const bobListings = await commerceBffService.listCollectorOffers(bob.accountId);
  assert.equal(bobListings.length, 0, "Bob cannot see Alice's listings");
});

test("proof: collector listings API route — auth guard", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  // Unauthenticated
  const unauthed = await getOffersRoute(
    new Request("http://localhost/api/v1/account/offers")
  );
  assert.equal(unauthed.status, 401, "unauthenticated returns 401");

  // Authenticated
  const session = await commerceBffService.createSession({
    email: "listings-api@example.com",
    role: "collector"
  });
  assert.ok(session);

  const authed = await getOffersRoute(
    new Request("http://localhost/api/v1/account/offers", {
      headers: { cookie: `ook_session=${session.sessionToken}` }
    })
  );
  assert.equal(authed.status, 200);
  const body = (await authed.json()) as { listings: unknown[] };
  assert.ok(Array.isArray(body.listings));
});

test("proof: collector listings have required fields on all entries", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const collector = await commerceBffService.createSession({
    email: "field-check@example.com",
    role: "collector"
  });
  assert.ok(collector);

  // Purchase and list a resale drop
  const inventory = await commerceBffService.getCollectInventory(collector.accountId, "resale");
  assert.ok(inventory.listings.length > 0, "resale inventory has listings");
  const resaleDrop = inventory.listings[0]!.drop;

  await commerceBffService.purchaseDrop(collector.accountId, resaleDrop.id);
  await commerceBffService.submitCollectResaleOffer({
    accountId: collector.accountId,
    dropId: resaleDrop.id,
    amountUsd: resaleDrop.priceUsd * 1.2
  });

  const listings = await commerceBffService.listCollectorOffers(collector.accountId);
  assert.ok(listings.length >= 1, "at least 1 listing");

  // Each listing must have required fields
  for (const listing of listings) {
    assert.ok(listing.offer, "has offer");
    assert.ok(listing.dropId, "has dropId");
    assert.ok(listing.dropTitle, "has dropTitle");
    assert.ok(listing.studioHandle, "has studioHandle");
    assert.ok(typeof listing.originalPriceUsd === "number", "has originalPriceUsd");
    assert.ok(listing.offer.state, "offer has state");
    assert.ok(listing.offer.id, "offer has id");
    assert.ok(listing.offer.createdAt, "offer has createdAt");
    assert.ok(listing.offer.updatedAt, "offer has updatedAt");
  }

  // Should be sorted by updatedAt desc
  for (let i = 1; i < listings.length; i++) {
    assert.ok(
      listings[i - 1]!.offer.updatedAt >= listings[i]!.offer.updatedAt,
      "listings sorted by updatedAt desc"
    );
  }
});
