export type ResalePolicy = {
  dropId: string;
  stance: "resale_allowed" | "resale_blocked" | "resale_with_royalty";
  priceCeilingCents: number | null;
  priceFloorCents: number | null;
  holdPeriodDays: number | null;
  royaltyRate: number;
  audienceScope: "anyone" | "collectors_only" | "world_members";
};

export type WorldDefaultResalePolicy = {
  worldId: string;
  stance: ResalePolicy["stance"];
  defaultRoyaltyRate: number;
  defaultPriceCeilingCents: number | null;
};

export type ResaleListing = {
  id: string;
  dropId: string;
  resaleHolderAccountId: string;
  askPriceCents: number;
  status: ResaleListingStatus;
  validationErrors: string[];
  listedAt: string;
  soldAt: string | null;
  cancelledAt: string | null;
};

export type ResaleListingStatus =
  | "active"
  | "sold"
  | "cancelled"
  | "rejected"
  | "invalidated";

export function validateResaleListing(
  listing: ResaleListing,
  policy: ResalePolicy
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (policy.stance === "resale_blocked") {
    errors.push("resale is not permitted for this drop");
  }
  if (policy.priceCeilingCents !== null && listing.askPriceCents > policy.priceCeilingCents) {
    errors.push(`price exceeds ceiling of ${policy.priceCeilingCents}`);
  }
  if (policy.priceFloorCents !== null && listing.askPriceCents < policy.priceFloorCents) {
    errors.push(`price below floor of ${policy.priceFloorCents}`);
  }
  return { valid: errors.length === 0, errors };
}

export function isHoldPeriodComplete(
  collectDateIso: string,
  holdPeriodDays: number | null,
  nowIso: string
): boolean {
  if (holdPeriodDays === null) return true;
  const collectDate = new Date(collectDateIso);
  const holdEnd = new Date(collectDate.getTime() + holdPeriodDays * 86_400_000);
  return new Date(nowIso) >= holdEnd;
}

export function computeResaleRoyalty(salePriceCents: number, royaltyRate: number): number {
  return Math.round(salePriceCents * royaltyRate);
}

export type AntiScalpingSignal = {
  accountId: string;
  pattern: "mass_listing" | "rapid_flip" | "price_manipulation" | "bot_purchase";
  confidence: number;
  detectedAt: string;
};

export const ANTI_SCALPING_THRESHOLD = 0.85;

export function isScalpingSuspected(confidence: number): boolean {
  return confidence >= ANTI_SCALPING_THRESHOLD;
}

export type BuybackDeclaration = {
  dropId: string;
  studioHandle: string;
  priceCents: number;
  fundVerified: boolean;
  queuePosition: number;
  declaredAt: string;
  status: "open" | "exhausted" | "cancelled";
};

export function canExecuteBuyback(declaration: BuybackDeclaration): boolean {
  return declaration.status === "open" && declaration.fundVerified;
}

export type TicketTransfer = {
  id: string;
  dropId: string;
  fromAccountId: string;
  toAccountId: string;
  transferType: "gift" | "resale";
  preEventCutoffMet: boolean;
  transferredAt: string;
};

export function canTransferTicket(
  dropId: string,
  eventStartIso: string,
  cutoffHours: number,
  nowIso: string
): boolean {
  const eventStart = Date.parse(eventStartIso);
  const cutoff = eventStart - cutoffHours * 3_600_000;
  return Date.parse(nowIso) < cutoff;
}

export const PRE_EVENT_CUTOFF_HOURS = 24;

export function isPostEventResaleBlocked(eventEndIso: string, nowIso: string): boolean {
  return new Date(nowIso) > new Date(eventEndIso);
}

export type WaitlistRerelease = {
  dropId: string;
  availableQuantity: number;
  waitlistAccountIds: string[];
  releasedAt: string | null;
};

export function nextInWaitlist(waitlist: WaitlistRerelease): string | null {
  return waitlist.waitlistAccountIds[0] ?? null;
}

export const PLATFORM_MIN_HOLD_PERIOD_DAYS = 7;
export const PLATFORM_MIN_ROYALTY_PCT = 0.05;

// Sprint 0.5H — transfer reason taxonomy; royalty only applies to "sale"
export type TransferReason = "sale" | "gift" | "migration" | "correction" | "dispute_reversal";

export function isRoyaltyApplicable(reason: TransferReason): boolean {
  return reason === "sale";
}

export function validateHoldPeriod(
  holdPeriodDays: number,
  creatorOverrideDays?: number | null
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const effective = creatorOverrideDays != null ? creatorOverrideDays : holdPeriodDays;
  if (effective < PLATFORM_MIN_HOLD_PERIOD_DAYS) {
    errors.push(
      `hold period of ${effective} days is below the platform minimum of ${PLATFORM_MIN_HOLD_PERIOD_DAYS} days`
    );
  }
  return { valid: errors.length === 0, errors };
}

export function validateRoyaltyFloor(
  royaltyPct: number | null | undefined,
  resaleAllowed: boolean
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (resaleAllowed && royaltyPct != null && royaltyPct < PLATFORM_MIN_ROYALTY_PCT) {
    errors.push(
      `royalty of ${(royaltyPct * 100).toFixed(1)}% is below the platform floor of ${(PLATFORM_MIN_ROYALTY_PCT * 100).toFixed(0)}% for resale-enabled drops`
    );
  }
  return { valid: errors.length === 0, errors };
}

export function computeScaffoldRoyaltyAmount(
  salePriceCents: number,
  royaltyPct: number,
  reason: TransferReason
): number {
  if (!isRoyaltyApplicable(reason)) return 0;
  return Math.round(salePriceCents * royaltyPct);
}

export type ResaleViolationRecord = {
  accountId: string;
  violations: number;
  threshold: number;
  restricted: boolean;
};

export function isResaleRestricted(record: ResaleViolationRecord): boolean {
  return record.violations >= record.threshold;
}
