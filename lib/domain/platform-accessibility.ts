export type AccessibilityFeature =
  | "screen_reader_support"
  | "keyboard_navigation"
  | "high_contrast_mode"
  | "reduced_motion"
  | "font_size_adjustment"
  | "caption_support"
  | "alt_text"
  | "aria_landmarks"
  | "focus_management"
  | "skip_links"
  | "color_blind_safe"
  | "time_zone_aware_dates";

export type WcagLevel = "A" | "AA" | "AAA";

export type AccessibilityAudit = {
  pageUrl: string;
  wcagLevel: WcagLevel;
  violations: AccessibilityViolation[];
  auditedAt: string;
  passed: boolean;
};

export type AccessibilityViolation = {
  rule: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  element: string;
  description: string;
};

export const WCAG_TARGET_LEVEL: WcagLevel = "AA";

export function isAuditPassing(audit: AccessibilityAudit): boolean {
  return audit.violations.filter((v) => v.impact === "critical" || v.impact === "serious").length === 0;
}

export type ReducedMotionPreference = {
  accountId: string;
  enabled: boolean;
};

export type FontSizePreference = {
  accountId: string;
  scaleFactor: number;
};

export const MIN_FONT_SCALE = 0.8;
export const MAX_FONT_SCALE = 2.0;

export function clampFontScale(scale: number): number {
  return Math.max(MIN_FONT_SCALE, Math.min(MAX_FONT_SCALE, scale));
}

export const ACCESSIBILITY_COMMITMENT =
  "the platform targets WCAG 2.1 AA compliance across all surfaces. " +
  "accessibility is a cross-cutting charter, not an afterthought.";
