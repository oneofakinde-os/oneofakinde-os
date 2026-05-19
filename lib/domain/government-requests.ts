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

export type PseudonymousAccount = {
  accountId: string;
  pseudonymousHandle: string;
  realIdentityVerified: boolean;
  identityHeldBy: "platform" | "none";
};

export type GovernmentRequest = {
  id: string;
  jurisdiction: string;
  tier: GovernmentRequestTier;
  requestType: "data_disclosure" | "content_removal" | "account_information" | "emergency";
  targetAccountId: string | null;
  legalBasis: string;
  gagOrdered: boolean;
  status: "received" | "evaluating" | "complied" | "refused" | "appealing";
  creatorNotified: boolean;
  creatorNotificationDelayed: boolean;
  receivedAt: string;
  resolvedAt: string | null;
  reviewerHandle: string | null;
};

export type AtRiskCreatorDeclaration = {
  accountId: string;
  declaredAt: string;
  riskContext: string;
  digitalRightsOrgReferral: string | null;
  enhancedProtections: AtRiskProtection[];
};

export type AtRiskProtection =
  | "pseudonymous_default"
  | "enhanced_account_security"
  | "expedited_safety_response"
  | "reduced_data_retention"
  | "legal_referral";

export const TIER_C_JURISDICTIONS: readonly string[] = [
  "CN", "RU", "SA", "IR", "KP", "SY", "BY", "MM",
];

export function isTierCJurisdiction(iso: string): boolean {
  return TIER_C_JURISDICTIONS.includes(iso.toUpperCase());
}

export function classifyRequestTier(jurisdiction: string): GovernmentRequestTier {
  if (isTierAJurisdiction(jurisdiction)) return "A";
  if (isTierCJurisdiction(jurisdiction)) return "C";
  return "B";
}

export function shouldNotifyCreator(request: GovernmentRequest): boolean {
  if (request.gagOrdered) return false;
  return true;
}

export function shouldDelayNotification(request: GovernmentRequest): boolean {
  return request.gagOrdered;
}

export type GovernmentRequestAuditEntry = {
  requestId: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details: string;
};

export type TransparencyReportAggregate = {
  period: string;
  totalRequests: number;
  complied: number;
  refused: number;
  byTier: Record<GovernmentRequestTier, number>;
  byType: Record<string, number>;
};

export const EXECUTIVE_REVIEW_THRESHOLD =
  "requests that are novel, precedent-setting, or involve at-risk creators " +
  "require executive review before compliance or refusal.";

export const LEGAL_DEFENSE_RESERVE_COMMITMENT =
  "the platform maintains a legal defense reserve to challenge overbroad or " +
  "politically motivated government requests on behalf of creators.";

export const REFUSAL_DOCUMENTATION_STANDARD =
  "every refusal must document: the legal basis for refusal, the policy rationale, " +
  "and the jurisdiction classification that triggered the refusal.";

export const E2E_ENCRYPTION_COMMITMENT =
  "the platform implements end-to-end encryption for direct messages where feasible. " +
  "the platform cannot read encrypted message content.";

export type GeographicConditionalHiding = {
  accountId: string;
  hiddenFromJurisdictions: string[];
  enabled: boolean;
  optedInAt: string;
};

export function isHiddenInJurisdiction(
  hiding: GeographicConditionalHiding | null,
  jurisdiction: string
): boolean {
  if (!hiding || !hiding.enabled) return false;
  return hiding.hiddenFromJurisdictions.includes(jurisdiction);
}

export type EmergencyStudioMigration = {
  accountId: string;
  studioHandle: string;
  reason: string;
  newPseudonymousHandle: string | null;
  requestedAt: string;
  status: "requested" | "in_progress" | "completed";
};
