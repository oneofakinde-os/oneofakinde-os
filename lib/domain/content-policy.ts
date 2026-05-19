/**
 * Content policy layer definitions.
 *
 * Implements CP-010 (Layer 1 hard exclusions), CP-018 (protected criticism),
 * PN-006 (no platform endorsements), PN-007 (political art viewpoint-neutral).
 *
 * These constants are the single source of truth for moderation triage and the
 * public /transparency/content-policy page.
 */

export type ContentPolicyLayer = 1 | 2 | 3 | 4;

export type HardExclusionKind =
  | "csam"
  | "direct_incitement"
  | "defamation_finding"
  | "ip_violation_no_defense"
  | "sanctions_violation";

export type AestheticExclusionKind =
  | "dehumanization"
  | "glorification_real_violence"
  | "coordinated_harassment"
  | "harm_specific_person"
  | "undisclosed_synthetic_media";

export const HARD_EXCLUSIONS: readonly HardExclusionKind[] = [
  "csam",
  "direct_incitement",
  "defamation_finding",
  "ip_violation_no_defense",
  "sanctions_violation",
] as const;

export const AESTHETIC_EXCLUSIONS: readonly AestheticExclusionKind[] = [
  "dehumanization",
  "glorification_real_violence",
  "coordinated_harassment",
  "harm_specific_person",
  "undisclosed_synthetic_media",
] as const;

export const PROTECTED_SPEECH_CATEGORIES = [
  "platform_criticism",
  "founder_criticism",
  "company_criticism",
  "political_art_any_viewpoint",
  "religious_critique",
  "satire_public_figures",
] as const;

export type ProtectedSpeechCategory = (typeof PROTECTED_SPEECH_CATEGORIES)[number];

export function isHardExclusion(kind: string): kind is HardExclusionKind {
  return (HARD_EXCLUSIONS as readonly string[]).includes(kind);
}

export function isProtectedSpeech(category: string): category is ProtectedSpeechCategory {
  return (PROTECTED_SPEECH_CATEGORIES as readonly string[]).includes(category);
}

export type ModerationDisposition =
  | { action: "remove"; layer: 1; kind: HardExclusionKind }
  | { action: "remove"; layer: 2; kind: AestheticExclusionKind; reasoning: string }
  | { action: "rate"; layer: 3; sensitivityLevel: "advisory" | "mature" }
  | { action: "allow"; layer: 3 | 4 }
  | { action: "protect"; category: ProtectedSpeechCategory };

// ── CP-001 through CP-005: Adult content gates ────────────────────

export type AdultContentDeclaration = {
  studioHandle: string;
  declared: boolean;
  declaredAt: string | null;
};

export type AgeVerificationMethod = "document" | "third_party_service";

export type AgeVerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export type AdultContentGeographicRule = {
  countryCode: string;
  blocked: boolean;
  reason: string;
};

export const ADULT_CONTENT_BLOCKED_JURISDICTIONS: AdultContentGeographicRule[] = [
  { countryCode: "SA", blocked: true, reason: "legal prohibition" },
  { countryCode: "IR", blocked: true, reason: "legal prohibition" },
  { countryCode: "CN", blocked: true, reason: "legal prohibition" },
  { countryCode: "KR", blocked: true, reason: "legal requirement for age-gated platform registration" },
];

export type AdultContentClassification = "artistic_adult" | "commercial_pornography";

export function classifyAdultContent(
  isStudioDeclaredAdult: boolean,
  hasArtisticStatement: boolean
): AdultContentClassification {
  if (isStudioDeclaredAdult && hasArtisticStatement) return "artistic_adult";
  return "commercial_pornography";
}

export function isAdultContentDefaultHidden(): boolean {
  return true;
}

export function requiresAgeVerification(hasAdultContent: boolean): boolean {
  return hasAdultContent;
}

export function isBlockedJurisdiction(countryCode: string): boolean {
  return ADULT_CONTENT_BLOCKED_JURISDICTIONS.some(
    (r) => r.countryCode === countryCode && r.blocked
  );
}

// ── CP-011 through CP-014: Layer 2 aesthetic exclusions (appealable) ──

export const LAYER_2_EXCLUSION_DEFINITIONS: Record<AestheticExclusionKind, string> = {
  dehumanization: "content that systematically portrays identifiable groups as subhuman",
  glorification_real_violence: "content that celebrates or glorifies specific real-world atrocities",
  coordinated_harassment: "content created as part of a coordinated campaign targeting a specific individual",
  harm_specific_person: "content designed to cause direct harm to a specific identifiable person",
  undisclosed_synthetic_media: "synthetic media (deepfakes) presented without disclosure as authentic",
};

// ── CP-015: Layer 3 sensitivity-rated content ──

export type SensitivityRating = "none" | "advisory" | "mature";

export const SENSITIVITY_RATING_LABELS: Record<SensitivityRating, string> = {
  none: "no content advisory",
  advisory: "content advisory — may contain themes some viewers find challenging",
  mature: "mature content — intended for adult audiences",
};

// ── CP-016: Layer 4 individual filtering tools ──

export type UserFilterAction = "hide" | "blur" | "show";

export type UserContentFilter = {
  accountId: string;
  filterType: "sensitivity_rating" | "studio" | "hashtag" | "ai_level";
  filterValue: string;
  action: UserFilterAction;
};

export function resolveFilterAction(
  filters: UserContentFilter[],
  dropAttributes: { sensitivityRating?: string; studioHandle: string; aiLevel?: number; hashtags?: string[] }
): UserFilterAction {
  for (const filter of filters) {
    if (filter.filterType === "sensitivity_rating" && filter.filterValue === dropAttributes.sensitivityRating) {
      return filter.action;
    }
    if (filter.filterType === "studio" && filter.filterValue === dropAttributes.studioHandle) {
      return filter.action;
    }
    if (filter.filterType === "ai_level" && dropAttributes.aiLevel !== undefined && filter.filterValue === String(dropAttributes.aiLevel)) {
      return filter.action;
    }
    if (filter.filterType === "hashtag" && dropAttributes.hashtags?.includes(filter.filterValue)) {
      return filter.action;
    }
  }
  return "show";
}

export const CURATION_PIVOT_COMMITMENT =
  "the platform will not silently change its curation or content-policy stance. " +
  "any material change to editorial direction, content moderation thresholds, or " +
  "curation criteria must be announced publicly before taking effect.";

export type Layer2TransparencyAggregate = {
  quarter: string;
  totalRemovals: number;
  byCategory: Record<string, number>;
  appealed: number;
  overturned: number;
  publishedAt: string;
};
