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
