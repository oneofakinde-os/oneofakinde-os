import assert from "node:assert/strict";
import test from "node:test";
import { PLATFORM_MIN_ROYALTY_PCT } from "../../lib/domain/resale-authority";
import { buildResaleSettlementQuote } from "../../lib/domain/quote-engine";
import type { QuoteEngineConfig } from "../../lib/domain/quote-engine";

const TEST_CONFIG: QuoteEngineConfig = {
  collectCommissionFloorCents: 25,
  collectCommissionCapCents: null,
  membershipCommissionFlatCents: 75,
  patronCommissionFlatCents: 50,
  resaleCommissionRateBps: 250,
  resaleCreatorRoyaltyRateBps: 1000
};

test("proof: platform minimum royalty constant is 5% or higher", () => {
  assert.ok(
    PLATFORM_MIN_ROYALTY_PCT >= 0.05,
    `expected platform min royalty to be >= 5%, got ${PLATFORM_MIN_ROYALTY_PCT * 100}%`
  );
});

test("proof: resale quote with royalty at platform minimum produces non-zero creator royalty", () => {
  const royaltyBps = Math.round(PLATFORM_MIN_ROYALTY_PCT * 10_000);
  const quote = buildResaleSettlementQuote(
    {
      executionPriceUsd: 100,
      processingUsd: 0,
      creatorAccountId: "creator_001",
      resaleHolderAccountId: "holder_001",
      creatorRoyaltyOverrideBps: royaltyBps
    },
    TEST_CONFIG
  );

  const royaltyLine = quote.lineItems.find((li) => li.kind === "creator_royalty_resale");
  assert.ok(royaltyLine, "expected creator royalty line item");
  assert.ok(
    royaltyLine.amountUsd >= PLATFORM_MIN_ROYALTY_PCT * 100,
    `expected royalty >= $${(PLATFORM_MIN_ROYALTY_PCT * 100).toFixed(2)} on $100 resale`
  );
});

test("proof: resale payout line item kind is resale_payout (not seller_payout_resale)", () => {
  const quote = buildResaleSettlementQuote(
    {
      executionPriceUsd: 50,
      processingUsd: 0,
      creatorAccountId: "creator_001",
      resaleHolderAccountId: "holder_001"
    },
    TEST_CONFIG
  );

  const resalePayoutLine = quote.lineItems.find((li) => li.kind === "resale_payout");
  assert.ok(resalePayoutLine, "expected line item with kind 'resale_payout'");

  const oldTermLine = quote.lineItems.find((li) => (li.kind as string) === "seller_payout_resale");
  assert.equal(oldTermLine, undefined, "must not contain deprecated 'seller_payout_resale' kind");
});
