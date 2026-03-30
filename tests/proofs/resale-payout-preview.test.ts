import assert from "node:assert/strict";
import test from "node:test";
import { previewResalePayout } from "../../lib/collect/resale-economics";

test("proof: resale payout preview matches quote engine economics", () => {
  // Standard $100 resale with default rates
  const preview = previewResalePayout(100);

  assert.equal(preview.askingPriceUsd, 100);
  assert.equal(preview.platformCommissionUsd, 2.5, "2.5% commission on $100");
  assert.equal(preview.creatorRoyaltyUsd, 10, "10% royalty on $100");
  assert.equal(preview.sellerPayoutUsd, 87.5, "seller gets $87.50");
  assert.equal(preview.royaltyRatePercent, 10);
  assert.equal(preview.commissionRatePercent, 2.5);
  assert.equal(preview.processingFeeUsd, 1.99);
});

test("proof: resale payout preview with per-drop royalty override", () => {
  // 5% royalty override (500 bps)
  const preview = previewResalePayout(100, 500);

  assert.equal(preview.creatorRoyaltyUsd, 5, "5% royalty on $100");
  assert.equal(preview.platformCommissionUsd, 2.5, "commission unchanged");
  assert.equal(preview.sellerPayoutUsd, 92.5, "seller gets $92.50 with lower royalty");
  assert.equal(preview.royaltyRatePercent, 5);
});

test("proof: resale payout preview with zero royalty", () => {
  const preview = previewResalePayout(50, 0);

  assert.equal(preview.creatorRoyaltyUsd, 0, "no royalty");
  assert.equal(preview.platformCommissionUsd, 1.25, "2.5% of $50");
  assert.equal(preview.sellerPayoutUsd, 48.75, "seller gets $48.75");
  assert.equal(preview.royaltyRatePercent, 0);
});

test("proof: resale payout preview handles small amounts", () => {
  const preview = previewResalePayout(1);

  assert.equal(preview.askingPriceUsd, 1);
  assert.equal(preview.platformCommissionUsd, 0.03, "2.5% of $1 rounded");
  assert.equal(preview.creatorRoyaltyUsd, 0.1, "10% of $1");
  assert.equal(preview.sellerPayoutUsd, 0.87, "seller gets remainder");
});

test("proof: resale payout preview rejects negative/zero amounts", () => {
  const zero = previewResalePayout(0);
  assert.equal(zero.askingPriceUsd, 0);
  assert.equal(zero.sellerPayoutUsd, 0);

  const negative = previewResalePayout(-10);
  assert.equal(negative.askingPriceUsd, 0);
  assert.equal(negative.sellerPayoutUsd, 0);
});

test("proof: resale payout preview uses default royalty when override is null", () => {
  const withNull = previewResalePayout(100, null);
  const withoutOverride = previewResalePayout(100);

  assert.equal(withNull.creatorRoyaltyUsd, withoutOverride.creatorRoyaltyUsd);
  assert.equal(withNull.sellerPayoutUsd, withoutOverride.sellerPayoutUsd);
});
