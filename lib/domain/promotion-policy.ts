export type PromotionPlacementInput = {
  label?: string;
  creatorOptIn?: boolean;
  usesResaleVelocityRanking?: boolean;
  usesMostResoldSurface?: boolean;
  usesSpeculativeSignals?: boolean;
  usesOpaqueAdNetwork?: boolean;
};

export type PromotionPolicyValidationResult = {
  valid: boolean;
  violations: string[];
};

const PLATFORM_PROMOTION_POLICY = {
  requiresCreatorOptIn: true,
  requiresApprovedLabel: true,
  allowsResaleVelocityRanking: false,
  allowsMostResoldSurface: false,
  allowsSpeculativeSignals: false,
  allowsOpaqueAdNetwork: false
} as const;

export function validatePromotionPlacement(
  input: PromotionPlacementInput
): PromotionPolicyValidationResult {
  const violations: string[] = [];

  if (!input.label || !input.label.trim()) {
    violations.push("promotion placement requires an approved label.");
  }

  if (!input.creatorOptIn) {
    violations.push(
      "promotion placement requires explicit creator opt-in."
    );
  }

  if (input.usesResaleVelocityRanking) {
    violations.push(
      "resale velocity ranking is prohibited in promotion placements."
    );
  }

  if (input.usesMostResoldSurface) {
    violations.push(
      "most-resold surface is prohibited in promotion placements."
    );
  }

  if (input.usesSpeculativeSignals) {
    violations.push(
      "speculative market signals are prohibited in promotion placements."
    );
  }

  if (input.usesOpaqueAdNetwork) {
    violations.push(
      "opaque ad-network logic is prohibited — all placement must be transparent to creators."
    );
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

export { PLATFORM_PROMOTION_POLICY };
