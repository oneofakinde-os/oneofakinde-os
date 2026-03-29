import type {
  SettlementLineItemKind,
  SettlementQuote
} from "@/lib/domain/contracts";

export const QUOTE_ENGINE_VERSION: SettlementQuote["engineVersion"] = "quote_engine_v1";
const COLLECT_COMMISSION_RATE = 0.01;

export type QuoteEngineConfig = {
  collectCommissionFloorCents: number;
  collectCommissionCapCents: number | null;
  membershipCommissionFlatCents: number;
  patronCommissionFlatCents: number;
  resaleCommissionRateBps: number;
  resaleCreatorRoyaltyRateBps: number;
};

export type BuildCollectQuoteInput = {
  subtotalUsd: number;
  processingUsd: number;
  currency?: "USD";
  artistAccountId?: string | null;
  payoutRecipients?: Array<{
    recipientAccountId: string | null;
    sharePercent: number;
  }>;
};

function roundUsd(value: number): number {
  return Number(value.toFixed(2));
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function parseNullablePositiveInt(value: string | undefined): number | null {
  if (!value || !value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function centsToUsd(cents: number): number {
  return roundUsd(cents / 100);
}

function ensureAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return roundUsd(Math.max(0, value));
}

function buildLineItem(
  kind: SettlementLineItemKind,
  amountUsd: number,
  scope: "public" | "participant_private" | "internal",
  recipientAccountId: string | null
): SettlementQuote["lineItems"][number] {
  return {
    kind,
    scope,
    amountUsd: roundUsd(amountUsd),
    currency: "USD",
    recipientAccountId
  };
}

function normalizePayoutRecipients(
  payoutRecipients: BuildCollectQuoteInput["payoutRecipients"] | undefined,
  artistAccountId: string | null
): Array<{
  recipientAccountId: string | null;
  sharePercent: number;
}> {
  const normalized = (payoutRecipients ?? [])
    .map((entry) => ({
      recipientAccountId: entry.recipientAccountId ?? null,
      sharePercent: Number(entry.sharePercent)
    }))
    .filter((entry) => Number.isFinite(entry.sharePercent) && entry.sharePercent > 0);

  if (normalized.length === 0) {
    return [
      {
        recipientAccountId: artistAccountId,
        sharePercent: 100
      }
    ];
  }

  const totalSharePercent = normalized.reduce((sum, entry) => sum + entry.sharePercent, 0);
  if (totalSharePercent <= 0) {
    return [
      {
        recipientAccountId: artistAccountId,
        sharePercent: 100
      }
    ];
  }

  return normalized.map((entry) => ({
    recipientAccountId: entry.recipientAccountId,
    sharePercent: (entry.sharePercent / totalSharePercent) * 100
  }));
}

function buildPayoutLineItems(
  payoutUsd: number,
  recipients: Array<{
    recipientAccountId: string | null;
    sharePercent: number;
  }>
): SettlementQuote["lineItems"] {
  const payoutCents = Math.round(payoutUsd * 100);
  if (payoutCents <= 0) {
    return [
      buildLineItem("artist_payout_collect", 0, "participant_private", recipients[0]?.recipientAccountId ?? null)
    ];
  }

  const weighted = recipients.map((recipient, index) => {
    const rawCents = (payoutCents * recipient.sharePercent) / 100;
    const baseCents = Math.floor(rawCents);
    return {
      index,
      recipientAccountId: recipient.recipientAccountId,
      baseCents,
      fractionalCents: rawCents - baseCents
    };
  });

  const allocatedBaseCents = weighted.reduce((sum, entry) => sum + entry.baseCents, 0);
  const remainingCents = payoutCents - allocatedBaseCents;

  weighted
    .slice()
    .sort((a, b) => b.fractionalCents - a.fractionalCents)
    .slice(0, remainingCents)
    .forEach((entry) => {
      weighted[entry.index]!.baseCents += 1;
    });

  return weighted.map((entry) =>
    buildLineItem(
      "artist_payout_collect",
      entry.baseCents / 100,
      "participant_private",
      entry.recipientAccountId
    )
  );
}

export function resolveQuoteEngineConfigFromEnv(): QuoteEngineConfig {
  return {
    collectCommissionFloorCents: parsePositiveInt(
      process.env.OOK_COLLECT_COMMISSION_FLOOR_CENTS,
      25
    ),
    collectCommissionCapCents: parseNullablePositiveInt(
      process.env.OOK_COLLECT_COMMISSION_CAP_CENTS
    ),
    membershipCommissionFlatCents: parsePositiveInt(
      process.env.OOK_MEMBERSHIP_COMMISSION_FLAT_CENTS,
      75
    ),
    patronCommissionFlatCents: parsePositiveInt(
      process.env.OOK_PATRON_COMMISSION_FLAT_CENTS,
      50
    ),
    resaleCommissionRateBps: parsePositiveInt(
      process.env.OOK_RESALE_COMMISSION_RATE_BPS,
      250
    ),
    resaleCreatorRoyaltyRateBps: parsePositiveInt(
      process.env.OOK_RESALE_CREATOR_ROYALTY_RATE_BPS,
      1000
    )
  };
}

export function buildCollectSettlementQuote(
  input: BuildCollectQuoteInput,
  config = resolveQuoteEngineConfigFromEnv()
): SettlementQuote {
  const subtotalUsd = ensureAmount(input.subtotalUsd);
  const processingUsd = ensureAmount(input.processingUsd);
  const currency = input.currency ?? "USD";
  const artistAccountId = input.artistAccountId ?? null;
  const payoutRecipients = normalizePayoutRecipients(input.payoutRecipients, artistAccountId);

  const commissionBaseUsd = roundUsd(subtotalUsd * COLLECT_COMMISSION_RATE);
  const commissionFloorUsd = centsToUsd(config.collectCommissionFloorCents);
  const commissionBeforeCapUsd = roundUsd(Math.max(commissionBaseUsd, commissionFloorUsd));
  const commissionCapUsd =
    config.collectCommissionCapCents === null ? null : centsToUsd(config.collectCommissionCapCents);
  const commissionUsd =
    commissionCapUsd === null
      ? commissionBeforeCapUsd
      : roundUsd(Math.min(commissionBeforeCapUsd, commissionCapUsd));
  const payoutUsd = roundUsd(Math.max(0, subtotalUsd - commissionUsd));
  const totalUsd = roundUsd(subtotalUsd + processingUsd);
  const payoutLineItems = buildPayoutLineItems(payoutUsd, payoutRecipients);

  return {
    engineVersion: QUOTE_ENGINE_VERSION,
    quoteKind: "collect",
    subtotalUsd,
    processingUsd,
    totalUsd,
    commissionUsd,
    payoutUsd,
    currency,
    lineItems: [
      buildLineItem("collect_subtotal", subtotalUsd, "public", null),
      buildLineItem("collect_processing_fee", processingUsd, "public", null),
      buildLineItem("platform_commission_collect", commissionUsd, "internal", null),
      ...payoutLineItems
    ]
  };
}

export function buildMembershipSettlementQuote(
  subtotalUsd: number,
  config = resolveQuoteEngineConfigFromEnv()
): SettlementQuote {
  const normalizedSubtotal = ensureAmount(subtotalUsd);
  const commissionUsd = centsToUsd(config.membershipCommissionFlatCents);
  const payoutUsd = roundUsd(Math.max(0, normalizedSubtotal - commissionUsd));

  return {
    engineVersion: QUOTE_ENGINE_VERSION,
    quoteKind: "membership",
    subtotalUsd: normalizedSubtotal,
    processingUsd: 0,
    totalUsd: normalizedSubtotal,
    commissionUsd,
    payoutUsd,
    currency: "USD",
    lineItems: [
      buildLineItem("membership_subtotal", normalizedSubtotal, "public", null),
      buildLineItem("platform_commission_membership", commissionUsd, "internal", null)
    ]
  };
}

export function buildPatronSettlementQuote(
  subtotalUsd: number,
  config = resolveQuoteEngineConfigFromEnv()
): SettlementQuote {
  const normalizedSubtotal = ensureAmount(subtotalUsd);
  const commissionUsd = centsToUsd(config.patronCommissionFlatCents);
  const payoutUsd = roundUsd(Math.max(0, normalizedSubtotal - commissionUsd));

  return {
    engineVersion: QUOTE_ENGINE_VERSION,
    quoteKind: "patron",
    subtotalUsd: normalizedSubtotal,
    processingUsd: 0,
    totalUsd: normalizedSubtotal,
    commissionUsd,
    payoutUsd,
    currency: "USD",
    lineItems: [
      buildLineItem("patron_subtotal", normalizedSubtotal, "public", null),
      buildLineItem("platform_commission_patron", commissionUsd, "internal", null)
    ]
  };
}

/* ── resale settlement ─────────────────────────────────────────────── */

export type BuildResaleQuoteInput = {
  /** The agreed execution price of the resale */
  executionPriceUsd: number;
  processingUsd: number;
  currency?: "USD";
  /** The original creator's account ID — receives the royalty */
  creatorAccountId: string | null;
  /** The selling collector's account ID — receives the seller payout */
  sellerAccountId: string | null;
  /** Optional per-drop royalty override in basis points (100 = 1%) */
  creatorRoyaltyOverrideBps?: number | null;
};

export function buildResaleSettlementQuote(
  input: BuildResaleQuoteInput,
  config = resolveQuoteEngineConfigFromEnv()
): SettlementQuote {
  const subtotalUsd = ensureAmount(input.executionPriceUsd);
  const processingUsd = ensureAmount(input.processingUsd);
  const currency = input.currency ?? "USD";

  // Platform commission on resale (default 2.5%)
  const commissionUsd = roundUsd(subtotalUsd * (config.resaleCommissionRateBps / 10_000));

  // Creator royalty on resale (default 10%, overridable per-drop)
  const royaltyBps = input.creatorRoyaltyOverrideBps ?? config.resaleCreatorRoyaltyRateBps;
  const royaltyUsd = roundUsd(subtotalUsd * (royaltyBps / 10_000));

  // Seller gets the rest: subtotal - commission - royalty
  const sellerPayoutUsd = roundUsd(Math.max(0, subtotalUsd - commissionUsd - royaltyUsd));
  const totalUsd = roundUsd(subtotalUsd + processingUsd);

  // payoutUsd in SettlementQuote = total distributed (royalty + seller)
  const payoutUsd = roundUsd(royaltyUsd + sellerPayoutUsd);

  return {
    engineVersion: QUOTE_ENGINE_VERSION,
    quoteKind: "resale",
    subtotalUsd,
    processingUsd,
    totalUsd,
    commissionUsd,
    payoutUsd,
    currency,
    lineItems: [
      buildLineItem("resale_subtotal", subtotalUsd, "public", null),
      buildLineItem("resale_processing_fee", processingUsd, "public", null),
      buildLineItem("platform_commission_resale", commissionUsd, "internal", null),
      buildLineItem("creator_royalty_resale", royaltyUsd, "participant_private", input.creatorAccountId),
      buildLineItem("seller_payout_resale", sellerPayoutUsd, "participant_private", input.sellerAccountId)
    ]
  };
}
