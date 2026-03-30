/**
 * Pure client-safe utility for previewing resale payout splits.
 *
 * Uses the same formulas as the quote engine (lib/domain/quote-engine.ts)
 * but does NOT import it — this runs in the browser via "use client" components
 * without pulling in server-only dependencies.
 */

const DEFAULT_COMMISSION_BPS = 250; // 2.5%
const DEFAULT_ROYALTY_BPS = 1000; // 10%
const PROCESSING_FEE_USD = 1.99;

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

export type ResalePayoutPreview = {
  askingPriceUsd: number;
  processingFeeUsd: number;
  platformCommissionUsd: number;
  creatorRoyaltyUsd: number;
  sellerPayoutUsd: number;
  royaltyRatePercent: number;
  commissionRatePercent: number;
};

/**
 * Compute a preview of the resale payout split for a given asking price.
 *
 * @param askingPriceUsd - The seller's asking price (execution price)
 * @param royaltyOverrideBps - Optional per-drop royalty in basis points (e.g. 500 = 5%)
 */
export function previewResalePayout(
  askingPriceUsd: number,
  royaltyOverrideBps?: number | null
): ResalePayoutPreview {
  const subtotal = roundUsd(Math.max(0, askingPriceUsd));
  const royaltyBps = royaltyOverrideBps ?? DEFAULT_ROYALTY_BPS;
  const commissionBps = DEFAULT_COMMISSION_BPS;

  const platformCommissionUsd = roundUsd(subtotal * (commissionBps / 10_000));
  const creatorRoyaltyUsd = roundUsd(subtotal * (royaltyBps / 10_000));
  const sellerPayoutUsd = roundUsd(Math.max(0, subtotal - platformCommissionUsd - creatorRoyaltyUsd));

  return {
    askingPriceUsd: subtotal,
    processingFeeUsd: PROCESSING_FEE_USD,
    platformCommissionUsd,
    creatorRoyaltyUsd,
    sellerPayoutUsd,
    royaltyRatePercent: roundUsd(royaltyBps / 100),
    commissionRatePercent: roundUsd(commissionBps / 100)
  };
}
