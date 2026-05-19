export type QuoteAuditEntry = {
  quoteId: string;
  idempotencyToken: string;
  action: string;
  performedAt: string;
};

export type QuoteExpiry = {
  quoteId: string;
  expiresAt: string;
  expired: boolean;
};

export const QUOTE_EXPIRY_MINUTES = 15;

export function isQuoteExpired(expiry: QuoteExpiry, nowIso: string): boolean {
  return nowIso > expiry.expiresAt;
}

export function computeQuoteExpiry(createdAtIso: string): string {
  const d = new Date(createdAtIso);
  d.setMinutes(d.getMinutes() + QUOTE_EXPIRY_MINUTES);
  return d.toISOString();
}

export type RefundPolicy = {
  dropId: string;
  refundWindowDays: number;
  partialRefundAllowed: boolean;
  refundPercentageMin: number;
};

export const DEFAULT_REFUND_WINDOW_DAYS = 14;

export function isWithinRefundWindow(collectDateIso: string, nowIso: string, windowDays: number): boolean {
  const collectDate = new Date(collectDateIso);
  const deadline = new Date(collectDate.getTime() + windowDays * 86_400_000);
  return new Date(nowIso) <= deadline;
}

export function computePartialRefund(fullAmount: number, percentage: number): number {
  return Math.round(fullAmount * (percentage / 100));
}

export type VelocityLimit = {
  accountId: string;
  maxCollectsPerHour: number;
  maxCollectsPerDay: number;
};

export const DEFAULT_VELOCITY_LIMITS: VelocityLimit = {
  accountId: "",
  maxCollectsPerHour: 20,
  maxCollectsPerDay: 100,
};

export function isVelocityExceeded(
  collectsInWindow: number,
  limit: number
): boolean {
  return collectsInWindow >= limit;
}

export type FirstCollectCelebration = {
  accountId: string;
  dropId: string;
  celebratedAt: string;
  educationalContent: string;
};

export const FIRST_COLLECT_EDUCATIONAL_MESSAGE =
  "congratulations on your first collect! you now own access to this work. " +
  "you can find it in your library, and the creator receives their earnings directly.";

export type BrandContentDisclosure = {
  dropId: string;
  disclosureType: "sponsored" | "gifted" | "affiliate";
  partnerName: string;
  disclosedAt: string;
};

export type ResaleStanceDeclaration = {
  dropId: string;
  stance: "resale_allowed" | "resale_blocked" | "resale_with_royalty";
  royaltyPercentage: number | null;
  declaredAt: string;
};

export type ResaleStanceTemplate = {
  id: string;
  name: string;
  stance: ResaleStanceDeclaration["stance"];
  defaultRoyaltyPercentage: number | null;
  description: string;
};

export const RESALE_STANCE_TEMPLATES: readonly ResaleStanceTemplate[] = [
  { id: "open", name: "Open Resale", stance: "resale_allowed", defaultRoyaltyPercentage: null, description: "collectors can freely resell" },
  { id: "royalty_10", name: "10% Creator Royalty", stance: "resale_with_royalty", defaultRoyaltyPercentage: 10, description: "resale allowed with 10% royalty to creator" },
  { id: "royalty_15", name: "15% Creator Royalty", stance: "resale_with_royalty", defaultRoyaltyPercentage: 15, description: "resale allowed with 15% royalty to creator" },
  { id: "no_resale", name: "No Resale", stance: "resale_blocked", defaultRoyaltyPercentage: null, description: "resale is not permitted" },
] as const;
