export type TaxJurisdiction = {
  id: string;
  country: string;
  region: string | null;
  taxType: "sales_tax" | "vat" | "gst";
  rate: number;
  registeredAt: string | null;
};

export type VatValidation = {
  vatNumber: string;
  country: string;
  valid: boolean;
  businessName: string | null;
  validatedAt: string;
};

export function isVatValid(validation: VatValidation): boolean {
  return validation.valid;
}

export type ReverseChargeEligibility = {
  buyerCountry: string;
  buyerVatNumber: string | null;
  sellerCountry: string;
  eligible: boolean;
};

export function isReverseChargeEligible(
  buyerCountry: string,
  buyerVatNumber: string | null,
  sellerCountry: string
): boolean {
  const euCountries = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"];
  return (
    euCountries.includes(buyerCountry) &&
    euCountries.includes(sellerCountry) &&
    buyerCountry !== sellerCountry &&
    buyerVatNumber !== null
  );
}

export type TaxFormType = "w9" | "w8ben" | "w8bene";

export type TaxFormSubmission = {
  accountId: string;
  formType: TaxFormType;
  submittedAt: string;
  validUntil: string;
  status: "pending" | "verified" | "rejected" | "expired";
};

export function isTaxFormCurrent(form: TaxFormSubmission, nowIso: string): boolean {
  return form.status === "verified" && nowIso <= form.validUntil;
}

export type Form1099K = {
  accountId: string;
  taxYear: number;
  grossPaymentsCents: number;
  transactionCount: number;
  generated: boolean;
  deliveredAt: string | null;
};

export const FORM_1099K_THRESHOLD_CENTS = 60_000;
export const FORM_1099K_TRANSACTION_THRESHOLD = 200;

export function requires1099K(grossCents: number, transactionCount: number): boolean {
  return grossCents >= FORM_1099K_THRESHOLD_CENTS || transactionCount >= FORM_1099K_TRANSACTION_THRESHOLD;
}

export type WithholdingRate = {
  country: string;
  rate: number;
  treatyRate: number | null;
};

export const DEFAULT_WITHHOLDING_RATE = 0.3;

export function effectiveWithholdingRate(
  country: string,
  hasTaxForm: boolean,
  treatyRate: number | null
): number {
  if (!hasTaxForm) return DEFAULT_WITHHOLDING_RATE;
  return treatyRate ?? DEFAULT_WITHHOLDING_RATE;
}

export type CrossBorderPayout = {
  accountId: string;
  currency: string;
  amountCents: number;
  withholdingCents: number;
  netPayoutCents: number;
  exchangeRate: number | null;
};

export function computeNetPayout(
  grossCents: number,
  withholdingRate: number
): { withholdingCents: number; netCents: number } {
  const withholding = Math.round(grossCents * withholdingRate);
  return { withholdingCents: withholding, netCents: grossCents - withholding };
}

export type QuarterlyTaxExport = {
  quarter: string;
  jurisdiction: string;
  totalTaxCollectedCents: number;
  transactionCount: number;
  exportedAt: string;
};

export type PromoCode = {
  code: string;
  type: "percentage" | "fixed" | "free";
  value: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  createdBy: string;
};

export function isPromoCodeValid(promo: PromoCode, nowIso: string): boolean {
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return false;
  if (promo.expiresAt !== null && nowIso > promo.expiresAt) return false;
  return true;
}

export function applyPromoDiscount(
  priceCents: number,
  promo: PromoCode
): number {
  switch (promo.type) {
    case "free":
      return 0;
    case "percentage":
      return Math.max(0, priceCents - Math.round(priceCents * (promo.value / 100)));
    case "fixed":
      return Math.max(0, priceCents - promo.value);
  }
}

export type GiftCard = {
  id: string;
  denominationCents: number;
  balanceCents: number;
  purchasedBy: string;
  redeemedBy: string | null;
  expiresAt: string | null;
  status: "active" | "redeemed" | "expired" | "cancelled";
};

export function isGiftCardValid(card: GiftCard, nowIso: string): boolean {
  if (card.status !== "active") return false;
  if (card.expiresAt !== null && nowIso > card.expiresAt) return false;
  return card.balanceCents > 0;
}

export type BundleDiscount = {
  dropIds: string[];
  discountPercentage: number;
  bundlePriceCents: number;
};

export function computeBundlePrice(
  individualPricesCents: number[],
  discountPercentage: number
): number {
  const total = individualPricesCents.reduce((s, p) => s + p, 0);
  return Math.round(total * (1 - discountPercentage / 100));
}

export type ReserveHoldback = {
  accountId: string;
  holdbackPercentage: number;
  holdPeriodDays: number;
  reason: "new_creator" | "high_refund_rate" | "dispute_history";
};

export const NEW_CREATOR_HOLDBACK = {
  holdbackPercentage: 10,
  holdPeriodDays: 30,
} as const;

export type DisputeStatus =
  | "open"
  | "evidence_submitted"
  | "under_review"
  | "won"
  | "lost"
  | "accepted";

export type StripeDispute = {
  id: string;
  chargeId: string;
  accountId: string;
  amountCents: number;
  reason: string;
  status: DisputeStatus;
  evidenceDeadline: string;
  submittedAt: string | null;
  resolvedAt: string | null;
};

export function isDisputeEvidenceDeadlinePassed(
  dispute: StripeDispute,
  nowIso: string
): boolean {
  return nowIso > dispute.evidenceDeadline;
}

export type RefundTaxRecovery = {
  refundId: string;
  originalTaxCents: number;
  recoveredTaxCents: number;
  jurisdiction: string;
};
