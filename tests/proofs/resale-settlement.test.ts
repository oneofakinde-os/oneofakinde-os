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
import { buildResaleSettlementQuote, type QuoteEngineConfig } from "../../lib/domain/quote-engine";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-resale-settlement-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

/* ------------------------------------------------------------------ */
/*  quote engine: resale settlement math                               */
/* ------------------------------------------------------------------ */

const TEST_CONFIG: QuoteEngineConfig = {
  collectCommissionFloorCents: 25,
  collectCommissionCapCents: null,
  membershipCommissionFlatCents: 75,
  patronCommissionFlatCents: 50,
  resaleCommissionRateBps: 250,
  resaleCreatorRoyaltyRateBps: 1000
};

test("proof: resale quote computes platform commission, creator royalty, and seller payout", () => {
  const quote = buildResaleSettlementQuote(
    {
      executionPriceUsd: 100,
      processingUsd: 1.99,
      creatorAccountId: "creator_001",
      sellerAccountId: "seller_001"
    },
    TEST_CONFIG
  );

  assert.equal(quote.quoteKind, "resale");
  assert.equal(quote.subtotalUsd, 100);
  assert.equal(quote.processingUsd, 1.99);
  assert.equal(quote.totalUsd, 101.99);
  assert.equal(quote.commissionUsd, 2.5);

  const royaltyLine = quote.lineItems.find((li) => li.kind === "creator_royalty_resale");
  assert.ok(royaltyLine);
  assert.equal(royaltyLine.amountUsd, 10);
  assert.equal(royaltyLine.recipientAccountId, "creator_001");

  const sellerLine = quote.lineItems.find((li) => li.kind === "seller_payout_resale");
  assert.ok(sellerLine);
  assert.equal(sellerLine.amountUsd, 87.5);
  assert.equal(sellerLine.recipientAccountId, "seller_001");

  assert.equal(quote.payoutUsd, 97.5);
});

test("proof: resale quote respects per-drop royalty override", () => {
  const quote = buildResaleSettlementQuote(
    {
      executionPriceUsd: 200,
      processingUsd: 0,
      creatorAccountId: "creator_001",
      sellerAccountId: "seller_001",
      creatorRoyaltyOverrideBps: 500
    },
    TEST_CONFIG
  );

  const royaltyLine = quote.lineItems.find((li) => li.kind === "creator_royalty_resale");
  assert.equal(royaltyLine?.amountUsd, 10);
  assert.equal(quote.commissionUsd, 5);

  const sellerLine = quote.lineItems.find((li) => li.kind === "seller_payout_resale");
  assert.equal(sellerLine?.amountUsd, 185);
});

test("proof: resale quote handles zero royalty override", () => {
  const quote = buildResaleSettlementQuote(
    {
      executionPriceUsd: 50,
      processingUsd: 0,
      creatorAccountId: "creator_001",
      sellerAccountId: "seller_001",
      creatorRoyaltyOverrideBps: 0
    },
    TEST_CONFIG
  );

  const royaltyLine = quote.lineItems.find((li) => li.kind === "creator_royalty_resale");
  assert.equal(royaltyLine?.amountUsd, 0);

  const sellerLine = quote.lineItems.find((li) => li.kind === "seller_payout_resale");
  assert.equal(sellerLine?.amountUsd, 48.75);
});

test("proof: resale quote line items have correct scopes and recipients", () => {
  const quote = buildResaleSettlementQuote(
    {
      executionPriceUsd: 100,
      processingUsd: 1.99,
      creatorAccountId: "creator_001",
      sellerAccountId: "seller_001"
    },
    TEST_CONFIG
  );

  assert.equal(quote.lineItems.length, 5);

  const subtotal = quote.lineItems.find((li) => li.kind === "resale_subtotal");
  assert.equal(subtotal?.scope, "public");
  assert.equal(subtotal?.recipientAccountId, null);

  const processing = quote.lineItems.find((li) => li.kind === "resale_processing_fee");
  assert.equal(processing?.scope, "public");

  const commission = quote.lineItems.find((li) => li.kind === "platform_commission_resale");
  assert.equal(commission?.scope, "internal");

  const royalty = quote.lineItems.find((li) => li.kind === "creator_royalty_resale");
  assert.equal(royalty?.scope, "participant_private");
  assert.equal(royalty?.recipientAccountId, "creator_001");

  const sellerPayout = quote.lineItems.find((li) => li.kind === "seller_payout_resale");
  assert.equal(sellerPayout?.scope, "participant_private");
  assert.equal(sellerPayout?.recipientAccountId, "seller_001");
});

/* ------------------------------------------------------------------ */
/*  ecosystem: settle_offer triggers ledger, ownership, notifications  */
/* ------------------------------------------------------------------ */

test("proof: resale settle_offer creates ledger entries, transfers ownership, and emits notifications to all ecosystem participants", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  // Setup: collector (buyer) and creator
  const buyer = await commerceBffService.createSession({
    email: `resale-buyer-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const creator = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  // Find a resale-lane drop from the inventory
  const inventoryResponse = await getCollectInventoryRoute(
    new Request("http://127.0.0.1:3000/api/v1/collect/inventory?lane=resale", {
      headers: { "x-ook-session-token": buyer.sessionToken }
    })
  );
  assert.equal(inventoryResponse.status, 200);
  const inventoryPayload = await parseJson<{
    listings: Array<{ drop: { id: string; studioHandle: string }; priceUsd: number }>;
  }>(inventoryResponse);
  const resaleDrop = inventoryPayload.listings[0];
  assert.ok(resaleDrop, "need at least one resale listing");

  // First, ensure someone owns this drop so the ownership transfer can happen.
  // Purchase it as the buyer first (to simulate a collector who bought the primary),
  // then we'll use a second collector as the actual buyer.
  const seller = await commerceBffService.createSession({
    email: `resale-seller-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const primaryReceipt = await commerceBffService.purchaseDrop(
    seller.accountId,
    resaleDrop.drop.id
  );
  assert.ok(primaryReceipt, "seller should acquire the drop via primary collect");

  // Buyer submits a resale offer
  const offerResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDrop.drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": buyer.sessionToken
      },
      body: JSON.stringify({
        action: "submit_resale_fixed_offer",
        amountUsd: 25.00
      })
    }),
    withRouteParams({ drop_id: resaleDrop.drop.id })
  );
  assert.equal(offerResponse.status, 201, "resale offer should be submitted");

  // Creator accepts the offer
  const acceptResponse = await postCollectDropOffersRoute(
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
  assert.equal(acceptResponse.status, 200, "offer should be accepted");

  // Creator settles the offer — this triggers the full resale settlement
  const settleResponse = await postCollectDropOffersRoute(
    new Request(`http://127.0.0.1:3000/api/v1/collect/offers/${resaleDrop.drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": creator.sessionToken
      },
      body: JSON.stringify({
        action: "settle_latest_resale_offer",
        executionPriceUsd: 25.00
      })
    }),
    withRouteParams({ drop_id: resaleDrop.drop.id })
  );
  assert.equal(settleResponse.status, 200, "offer should be settled");

  // Read the persisted database to verify all ecosystem effects
  const raw = JSON.parse(await fs.readFile(dbPath, "utf8")) as {
    ledgerTransactions: Array<{
      id: string;
      kind: string;
      dropId: string | null;
      accountId: string;
      receiptId: string | null;
      commissionUsd: number;
      payoutUsd: number;
    }>;
    ledgerLineItems: Array<{
      transactionId: string;
      kind: string;
      amountUsd: number;
      recipientAccountId: string | null;
    }>;
    ownerships: Array<{ accountId: string; dropId: string; certificateId: string }>;
    certificates: Array<{
      id: string;
      dropId: string;
      ownerAccountId: string;
      status: string;
    }>;
    notificationEntries: Array<{
      accountId: string;
      type: string;
      title: string;
      body: string;
    }>;
  };

  // 1. Resale ledger transaction exists with correct economics
  const resaleTx = raw.ledgerTransactions.find(
    (tx) => tx.kind === "resale" && tx.dropId === resaleDrop.drop.id
  );
  assert.ok(resaleTx, "resale ledger transaction should exist");
  assert.ok(resaleTx.commissionUsd > 0, "platform commission should be positive");
  assert.ok(resaleTx.payoutUsd > 0, "payout should be positive");

  // 2. Ledger line items include creator royalty routed to creator account
  const resaleLineItems = raw.ledgerLineItems.filter(
    (li) => li.transactionId === resaleTx.id
  );
  const royaltyItem = resaleLineItems.find((li) => li.kind === "creator_royalty_resale");
  assert.ok(royaltyItem, "creator royalty line item should exist");
  assert.ok(royaltyItem.amountUsd > 0, "royalty amount should be positive");
  assert.equal(royaltyItem.recipientAccountId, creator.accountId, "royalty routes to creator");

  // 3. Seller payout line item routes to seller account
  const sellerPayoutItem = resaleLineItems.find((li) => li.kind === "seller_payout_resale");
  assert.ok(sellerPayoutItem, "seller payout line item should exist");
  assert.ok(sellerPayoutItem.amountUsd > 0, "seller payout should be positive");
  assert.equal(sellerPayoutItem.recipientAccountId, seller.accountId, "payout routes to seller");

  // 4. Platform commission line item
  const commissionItem = resaleLineItems.find((li) => li.kind === "platform_commission_resale");
  assert.ok(commissionItem, "platform commission line item should exist");

  // 5. Ownership transferred: buyer now owns, seller doesn't
  const buyerOwnership = raw.ownerships.find(
    (o) => o.accountId === buyer.accountId && o.dropId === resaleDrop.drop.id
  );
  assert.ok(buyerOwnership, "buyer should own the drop after resale");

  const sellerOwnership = raw.ownerships.find(
    (o) => o.accountId === seller.accountId && o.dropId === resaleDrop.drop.id
  );
  assert.equal(sellerOwnership, undefined, "seller should no longer own the drop");

  // 6. Seller's certificate revoked, buyer has a new verified certificate
  const sellerCerts = raw.certificates.filter(
    (c) => c.ownerAccountId === seller.accountId && c.dropId === resaleDrop.drop.id
  );
  assert.ok(
    sellerCerts.some((c) => c.status === "revoked"),
    "seller's certificate should be revoked"
  );

  const buyerCert = raw.certificates.find(
    (c) =>
      c.ownerAccountId === buyer.accountId &&
      c.dropId === resaleDrop.drop.id &&
      c.status === "verified"
  );
  assert.ok(buyerCert, "buyer should have a verified certificate");

  // 7. Notifications emitted to all three ecosystem participants
  const sellerNotif = raw.notificationEntries.find(
    (n) => n.accountId === seller.accountId && n.type === "resale_completed"
  );
  assert.ok(sellerNotif, "seller should receive resale_completed notification");

  const buyerNotif = raw.notificationEntries.find(
    (n) => n.accountId === buyer.accountId && n.type === "drop_collected"
  );
  assert.ok(buyerNotif, "buyer should receive drop_collected notification");

  const creatorNotif = raw.notificationEntries.find(
    (n) => n.accountId === creator.accountId && n.type === "resale_royalty_earned"
  );
  assert.ok(creatorNotif, "creator should receive resale_royalty_earned notification");
  assert.ok(creatorNotif.body.includes("royalt"), "notification should mention royalties");

  // 8. Verify ownership history includes the resale event
  const history = await commerceBffService.getDropOwnershipHistory(resaleDrop.drop.id);
  assert.ok(history, "ownership history should exist");
  const resaleEntry = history.entries.find((e) => e.kind === "resale");
  assert.ok(resaleEntry, "ownership history should include resale event");
});
