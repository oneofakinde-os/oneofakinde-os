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
};

export type BuildCollectQuoteInput = {
  subtotalUsd: number;
  processingUsd: number;
  currency?: "USD";
  artistAccountId?: string | null;
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
      buildLineItem("artist_payout_collect", payoutUsd, "participant_private", artistAccountId)
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

