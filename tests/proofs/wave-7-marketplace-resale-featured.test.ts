import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidFeaturedLanePurchase,
  isOwnWork,
  computeImpressionsBudget,
  isExposureCapReached,
  DEFAULT_EXPOSURE_CAP,
  isBudgetExhausted,
  computeCtr,
  computeRefundForUndelivered,
  FEATURED_LANE_LABEL,
  FEATURED_LANE_RULES,
  ARCHITECTURAL_SEPARATION,
  FEATURED_LANE_VOCABULARY_LINT,
  ELECTION_QUIET_WINDOW_FEATURED_RESTRICTION,
  CPM_RATES,
} from "../../lib/domain/featured-lane";
import {
  validateResaleListing,
  isHoldPeriodComplete,
  computeResaleRoyalty,
  isScalpingSuspected,
  canExecuteBuyback,
  canTransferTicket,
  PRE_EVENT_CUTOFF_HOURS,
  isPostEventResaleBlocked,
  nextInWaitlist,
  isResaleRestricted,
  ANTI_SCALPING_THRESHOLD,
} from "../../lib/domain/resale-authority";
import type { ResaleListing, ResalePolicy, BuybackDeclaration, WaitlistRerelease } from "../../lib/domain/resale-authority";
import {
  isVatValid,
  isReverseChargeEligible,
  isTaxFormCurrent,
  requires1099K,
  FORM_1099K_THRESHOLD_CENTS,
  effectiveWithholdingRate,
  DEFAULT_WITHHOLDING_RATE,
  computeNetPayout,
  isPromoCodeValid,
  applyPromoDiscount,
  isGiftCardValid,
  computeBundlePrice,
  NEW_CREATOR_HOLDBACK,
  isDisputeEvidenceDeadlinePassed,
} from "../../lib/domain/tax-compliance";
import type { PromoCode, GiftCard, StripeDispute } from "../../lib/domain/tax-compliance";
import {
  isExclusiveLicense,
  computeRoyaltyOnResale,
} from "../../lib/domain/drm-ip-rights";
import {
  canOfferBuyback,
} from "../../lib/domain/drop-retirement";
import {
  INSTITUTIONAL_MIRROR_ENFORCEMENT,
} from "../../lib/domain/wind-down";
import {
  PRIVACY_PRESERVING_PAYMENT_ROUTING,
} from "../../lib/domain/government-requests";

// ── Featured Lane (FL-001 through FL-018) ──

test("FL-001/002: featured lane creator-only, own-work-only", () => {
  assert.ok(isValidFeaturedLanePurchase("creator_1", "creator_1"));
  assert.ok(!isValidFeaturedLanePurchase("creator_1", "creator_2"));
  assert.ok(isOwnWork("studio_a", "studio_a"));
  assert.ok(!isOwnWork("studio_a", "studio_b"));
  assert.ok(FEATURED_LANE_RULES.creatorOnlyPurchase);
  assert.ok(FEATURED_LANE_RULES.ownWorkOnly);
});

test("FL-003/005: on-platform destination, architecturally separate", () => {
  assert.ok(FEATURED_LANE_RULES.onPlatformDestinationOnly);
  assert.ok(FEATURED_LANE_RULES.separateFromConsumptionRanking);
  assert.ok(ARCHITECTURAL_SEPARATION.includes("do not affect consumption score"));
});

test("FL-004: featured drop labeling", () => {
  assert.equal(FEATURED_LANE_LABEL, "Featured by Creator");
});

test("FL-006: CPM rate pricing", () => {
  assert.equal(CPM_RATES.length, 3);
  const impressions = computeImpressionsBudget(10000, 200);
  assert.equal(impressions, 50000);
  assert.equal(computeImpressionsBudget(0, 200), 0);
  assert.equal(computeImpressionsBudget(10000, 0), 0);
});

test("FL-008: per-user exposure cap", () => {
  assert.equal(DEFAULT_EXPOSURE_CAP.maxImpressionsPerUser, 3);
  assert.ok(!isExposureCapReached(2, DEFAULT_EXPOSURE_CAP));
  assert.ok(isExposureCapReached(3, DEFAULT_EXPOSURE_CAP));
});

test("FL-009: per-creator budget cap", () => {
  assert.ok(!isBudgetExhausted({ studioHandle: "s", monthlyBudgetCapCents: 50000, spentThisMonthCents: 30000 }));
  assert.ok(isBudgetExhausted({ studioHandle: "s", monthlyBudgetCapCents: 50000, spentThisMonthCents: 50000 }));
});

test("FL-013: analytics CTR computation", () => {
  assert.equal(computeCtr(1000, 50), 0.05);
  assert.equal(computeCtr(0, 0), 0);
});

test("FL-016: technical failure refund", () => {
  const refund = computeRefundForUndelivered(5000, 200);
  assert.equal(refund, 1000);
});

test("FL-014: election quiet window restrictions", () => {
  assert.ok(ELECTION_QUIET_WINDOW_FEATURED_RESTRICTION.includes("suspended"));
});

test("FL-018: vocabulary lint for banned terms", () => {
  assert.ok(FEATURED_LANE_VOCABULARY_LINT.includes("ads"));
  assert.ok(FEATURED_LANE_VOCABULARY_LINT.includes("advertising"));
});

// ── Resale & Secondary Market (RSL-004 through RSL-029) ──

const makePolicy = (overrides?: Partial<ResalePolicy>): ResalePolicy => ({
  dropId: "d1", stance: "resale_with_royalty",
  priceCeilingCents: 50000, priceFloorCents: 1000,
  holdPeriodDays: 30, royaltyRate: 0.1,
  audienceScope: "anyone", ...overrides,
});

const makeListing = (overrides?: Partial<ResaleListing>): ResaleListing => ({
  id: "l1", dropId: "d1", resaleHolderAccountId: "s1",
  askPriceCents: 25000, status: "active",
  validationErrors: [], listedAt: "2026-05-18", soldAt: null, cancelledAt: null,
  ...overrides,
});

test("RSL-004/005/011: resale listing validation against price rules", () => {
  const valid = validateResaleListing(makeListing(), makePolicy());
  assert.ok(valid.valid);

  const tooHigh = validateResaleListing(makeListing({ askPriceCents: 60000 }), makePolicy());
  assert.ok(!tooHigh.valid);
  assert.ok(tooHigh.errors[0].includes("ceiling"));

  const tooLow = validateResaleListing(makeListing({ askPriceCents: 500 }), makePolicy());
  assert.ok(!tooLow.valid);
  assert.ok(tooLow.errors[0].includes("floor"));
});

test("RSL-011: resale blocked stance rejects all listings", () => {
  const result = validateResaleListing(makeListing(), makePolicy({ stance: "resale_blocked" }));
  assert.ok(!result.valid);
  assert.ok(result.errors[0].includes("not permitted"));
});

test("RSL-006: hold period enforcement", () => {
  assert.ok(!isHoldPeriodComplete("2026-05-01", 30, "2026-05-20"));
  assert.ok(isHoldPeriodComplete("2026-05-01", 30, "2026-06-01"));
  assert.ok(isHoldPeriodComplete("2026-05-01", null, "2026-05-02"));
});

test("RSL-007: resale royalty computation", () => {
  assert.equal(computeResaleRoyalty(10000, 0.1), 1000);
  assert.equal(computeResaleRoyalty(10000, 0.15), 1500);
});

test("RSL-015: anti-scalping detection", () => {
  assert.ok(isScalpingSuspected(ANTI_SCALPING_THRESHOLD));
  assert.ok(!isScalpingSuspected(0.5));
});

test("RSL-021/022: buyback declaration requires verified funds", () => {
  const decl: BuybackDeclaration = {
    dropId: "d1", studioHandle: "creator", priceCents: 10000,
    fundVerified: true, queuePosition: 0, declaredAt: "2026-05-18", status: "open",
  };
  assert.ok(canExecuteBuyback(decl));
  assert.ok(!canExecuteBuyback({ ...decl, fundVerified: false }));
  assert.ok(!canExecuteBuyback({ ...decl, status: "exhausted" }));
});

test("RSL-025/026: ticket transfer with pre-event cutoff", () => {
  assert.ok(canTransferTicket("d1", "2026-05-20T20:00:00Z", PRE_EVENT_CUTOFF_HOURS, "2026-05-19T10:00:00Z"));
  assert.ok(!canTransferTicket("d1", "2026-05-20T20:00:00Z", PRE_EVENT_CUTOFF_HOURS, "2026-05-20T10:00:00Z"));
});

test("RSL-027: post-event resale blocked", () => {
  assert.ok(isPostEventResaleBlocked("2026-05-18T22:00:00Z", "2026-05-19T00:00:00Z"));
  assert.ok(!isPostEventResaleBlocked("2026-05-20T22:00:00Z", "2026-05-19T00:00:00Z"));
});

test("RSL-028: waitlist re-release FIFO", () => {
  const wl: WaitlistRerelease = {
    dropId: "d1", availableQuantity: 1,
    waitlistAccountIds: ["first", "second"], releasedAt: null,
  };
  assert.equal(nextInWaitlist(wl), "first");
  assert.equal(nextInWaitlist({ ...wl, waitlistAccountIds: [] }), null);
});

test("RSL-029: repeat violation account consequences", () => {
  assert.ok(isResaleRestricted({ accountId: "a1", violations: 3, threshold: 3, restricted: true }));
  assert.ok(!isResaleRestricted({ accountId: "a1", violations: 1, threshold: 3, restricted: false }));
});

// ── Tax & Financial Compliance (TAX-001 through TAX-015) ──

test("TAX-003: VAT validation", () => {
  assert.ok(isVatValid({ vatNumber: "DE123456789", country: "DE", valid: true, businessName: "Co", validatedAt: "2026-05-18" }));
  assert.ok(!isVatValid({ vatNumber: "XX000", country: "XX", valid: false, businessName: null, validatedAt: "2026-05-18" }));
});

test("TAX-004: reverse-charge eligibility", () => {
  assert.ok(isReverseChargeEligible("DE", "DE123", "FR"));
  assert.ok(!isReverseChargeEligible("DE", null, "FR"));
  assert.ok(!isReverseChargeEligible("DE", "DE123", "DE"));
  assert.ok(!isReverseChargeEligible("US", "US123", "FR"));
});

test("TAX-008/041: 1099-K threshold", () => {
  assert.ok(requires1099K(FORM_1099K_THRESHOLD_CENTS, 0));
  assert.ok(requires1099K(0, 200));
  assert.ok(!requires1099K(50000, 100));
});

test("TAX-009: tax form currency check", () => {
  const form = { accountId: "a1", formType: "w9" as const, submittedAt: "2026-01-01", validUntil: "2026-12-31", status: "verified" as const };
  assert.ok(isTaxFormCurrent(form, "2026-06-01"));
  assert.ok(!isTaxFormCurrent(form, "2027-01-01"));
  assert.ok(!isTaxFormCurrent({ ...form, status: "expired" as const }, "2026-06-01"));
});

test("TAX-010/039: withholding rate and net payout", () => {
  assert.equal(effectiveWithholdingRate("BR", false, null), DEFAULT_WITHHOLDING_RATE);
  assert.equal(effectiveWithholdingRate("CA", true, 0.15), 0.15);
  const payout = computeNetPayout(10000, 0.3);
  assert.equal(payout.withholdingCents, 3000);
  assert.equal(payout.netCents, 7000);
});

test("MKT-045: promo code validation and discount", () => {
  const promo: PromoCode = {
    code: "SAVE20", type: "percentage", value: 20,
    maxUses: 100, usedCount: 50,
    expiresAt: "2026-12-31", createdBy: "admin",
  };
  assert.ok(isPromoCodeValid(promo, "2026-06-01"));
  assert.ok(!isPromoCodeValid({ ...promo, usedCount: 100 }, "2026-06-01"));
  assert.ok(!isPromoCodeValid(promo, "2027-01-01"));
  assert.equal(applyPromoDiscount(10000, promo), 8000);
  assert.equal(applyPromoDiscount(10000, { ...promo, type: "fixed", value: 3000 }), 7000);
  assert.equal(applyPromoDiscount(10000, { ...promo, type: "free", value: 0 }), 0);
});

test("MKT-046/047: gift card validity", () => {
  const card: GiftCard = {
    id: "g1", denominationCents: 5000, balanceCents: 5000,
    purchasedBy: "a1", redeemedBy: null,
    expiresAt: "2027-01-01", status: "active",
  };
  assert.ok(isGiftCardValid(card, "2026-06-01"));
  assert.ok(!isGiftCardValid({ ...card, status: "expired" }, "2026-06-01"));
  assert.ok(!isGiftCardValid(card, "2027-02-01"));
  assert.ok(!isGiftCardValid({ ...card, balanceCents: 0 }, "2026-06-01"));
});

test("MKT-048: bundle discount computation", () => {
  const bundlePrice = computeBundlePrice([1000, 2000, 3000], 20);
  assert.equal(bundlePrice, 4800);
});

test("MKT-052: new creator reserve holdback", () => {
  assert.equal(NEW_CREATOR_HOLDBACK.holdbackPercentage, 10);
  assert.equal(NEW_CREATOR_HOLDBACK.holdPeriodDays, 30);
});

test("MKT-054/055/056: dispute evidence deadline", () => {
  const dispute: StripeDispute = {
    id: "d1", chargeId: "ch_1", accountId: "a1",
    amountCents: 5000, reason: "fraudulent", status: "open",
    evidenceDeadline: "2026-05-25T00:00:00Z",
    submittedAt: null, resolvedAt: null,
  };
  assert.ok(!isDisputeEvidenceDeadlinePassed(dispute, "2026-05-20T00:00:00Z"));
  assert.ok(isDisputeEvidenceDeadlinePassed(dispute, "2026-05-26T00:00:00Z"));
});

// ── DRM extensions (DRM-008/021/034) ──

test("DRM-021: exclusive vs non-exclusive licensing", () => {
  assert.ok(isExclusiveLicense({ dropId: "d1", exclusivity: "exclusive", declaredAt: "2026-05-18" }));
  assert.ok(!isExclusiveLicense({ dropId: "d1", exclusivity: "non_exclusive", declaredAt: "2026-05-18" }));
});

test("DRM-034: royalty enforcement on resale", () => {
  assert.equal(computeRoyaltyOnResale(10000, 0.1), 1000);
});

// ── Drop Retirement (DR-006) ──

test("DR-006: buyback only on retired drops", () => {
  const active = { dropId: "d1", studioHandle: "c", status: "active" as const, retirementStatement: null, retiredAt: null, existingCollectorAccessPreserved: true, removedFromOwnershipHistory: false };
  const retired = { ...active, status: "retired" as const, retiredAt: "2026-05-18" };
  assert.ok(!canOfferBuyback(active));
  assert.ok(canOfferBuyback(retired));
});

// ── Wind-Down (WND-003) ──

test("WND-003: institutional mirror enforcement", () => {
  assert.ok(INSTITUTIONAL_MIRROR_ENFORCEMENT.includes("institutional mirror"));
  assert.ok(INSTITUTIONAL_MIRROR_ENFORCEMENT.includes("cultural institution"));
});

// ── Government (GRH-003) ──

test("GRH-003: privacy-preserving payment routing", () => {
  assert.ok(PRIVACY_PRESERVING_PAYMENT_ROUTING.includes("privacy-preserving"));
});
