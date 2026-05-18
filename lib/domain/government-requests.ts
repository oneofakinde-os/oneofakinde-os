/**
 * Government request handling tiers.
 *
 * Implements GRH-001 (data minimization principle) and GRH-010 (Tier D absolute refusal).
 * Tier definitions from PP-16 (Government Requests and Creator Sovereignty).
 */

export type GovernmentRequestTier = "A" | "B" | "C" | "D";

export type TierDisposition =
  | { tier: "A"; action: "comply_narrow"; notifyCreator: true; gag_override: "delayed" }
  | { tier: "B"; action: "evaluate"; refusalCriteria: TierBRefusalReason[] }
  | { tier: "C"; action: "refuse"; basis: "authoritarian_regime"; publicRefusal: true }
  | { tier: "D"; action: "refuse_absolute"; basis: "sanctioned_or_nonstate" };

export type TierBRefusalReason =
  | "politically_motivated"
  | "crime_is_speech"
  | "crime_is_journalism"
  | "crime_is_opposition"
  | "crime_is_religious_expression"
  | "crime_is_lgbtq_identity"
  | "identify_pseudonymous_critics"
  | "blanket_data_request";

export const TIER_A_JURISDICTIONS = [
  "US", "EU", "UK", "CA", "AU", "NZ", "JP", "KR",
] as const;

export const DATA_MINIMIZATION_PRINCIPLES = [
  "collect_minimum_required",
  "pseudonymous_accounts_first_class",
  "no_speculative_collection",
  "encryption_where_feasible",
] as const;

export function classifyTierD(): TierDisposition {
  return { tier: "D", action: "refuse_absolute", basis: "sanctioned_or_nonstate" };
}

export function isTierAJurisdiction(iso: string): boolean {
  return (TIER_A_JURISDICTIONS as readonly string[]).includes(iso.toUpperCase());
}
