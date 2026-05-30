/**
 * gate-registry.ts
 *
 * Pure validation for the constitutional market-law feature gates.
 *
 * A "gated" flag is one that carries an `approval` metadata block: a dark,
 * approval-controlled flag that must never activate in any environment without
 * complete, unexpired approval metadata. Today these are the four Sprint 0.5H
 * market-law gates (resale settlement, auto-routed resale royalty, public studio
 * value index, creator promotion lane).
 *
 * Extracted from scripts/check-gate-registry.ts in Sprint 0.5J so that:
 *   - the production-activation and expiry branches are unit-testable with synthetic
 *     contracts (previously unreachable: every real gate is false in production); and
 *   - a selector regression can never again silently validate ZERO flags. The pre-0.5J
 *     bug filtered `rollout === "off"` — a value no flag holds against the dark|beta|ga
 *     taxonomy — so the selector matched nothing and the entire check passed vacuously.
 */

export type ApprovalMetadata = {
  owner: string | null;
  decision_source: string | null;
  approved_at: string | null;
  expires_at: string | null;
  notes: string | null;
};

export type FlagEntry = {
  key: string;
  owner?: string;
  rollout: string;
  description?: string;
  approval?: ApprovalMetadata;
};

export type FlagContract = {
  version?: string;
  flags: FlagEntry[];
  defaults: {
    development: Record<string, boolean>;
    preview: Record<string, boolean>;
    production: Record<string, boolean>;
  };
};

export type GateRegistryReport = {
  errors: string[];
  warnings: string[];
  gatedFlags: FlagEntry[];
};

/**
 * Constitutional market-law gates that MUST always be present and validated.
 * Graduating one of these (when a feature is actually built and the flag moves to
 * beta/ga) is a deliberate constitutional decision — remove it from this list
 * explicitly. Do not let a gate fall out of validation silently.
 */
export const REQUIRED_GATE_KEYS = [
  "resale_settlement_live",
  "auto_routed_resale_royalty_live",
  "public_studio_value_index_live",
  "creator_promotion_lane_live",
] as const;

const REQUIRED_APPROVAL_FIELDS: (keyof ApprovalMetadata)[] = [
  "owner",
  "decision_source",
  "approved_at",
  "expires_at",
  "notes",
];

/**
 * A gated flag is one carrying an approval-metadata block. The four constitutional
 * gates are dark + approval-gated; no ga/beta flag carries an approval block, so this
 * selector captures exactly the gates and never the released surfaces.
 */
export function selectGatedFlags(contract: FlagContract): FlagEntry[] {
  return contract.flags.filter((f) => f.approval != null);
}

export function validateGateRegistry(
  contract: FlagContract,
  options: { now?: Date } = {},
): GateRegistryReport {
  const now = options.now ?? new Date();
  const errors: string[] = [];
  const warnings: string[] = [];

  const gatedFlags = selectGatedFlags(contract);

  // Non-vacuity guard: the selector must capture every constitutional gate. This is
  // the specific defense against the pre-0.5J failure mode where the check passed
  // while validating nothing.
  const gatedKeys = new Set(gatedFlags.map((f) => f.key));
  for (const key of REQUIRED_GATE_KEYS) {
    if (!gatedKeys.has(key)) {
      errors.push(
        `constitutional gate [${key}] is not being validated by the gate registry — ` +
          `selector regression, or the gate lost its approval block`,
      );
    }
  }
  if (gatedFlags.length === 0) {
    errors.push(
      "gate registry selected ZERO gated flags — the selector is broken " +
        "(expected the dark, approval-gated market-law flags)",
    );
  }

  for (const flag of gatedFlags) {
    // 1. Must default to false in every environment.
    for (const env of ["development", "preview", "production"] as const) {
      const value = contract.defaults[env]?.[flag.key];
      if (value !== false) {
        errors.push(
          `gate [${flag.key}] must default to false in ${env} (found: ${JSON.stringify(value)})`,
        );
      }
    }

    // 2. Approval metadata shape.
    if (!flag.approval) {
      errors.push(`gate [${flag.key}] is missing approval metadata block`);
      continue;
    }
    for (const field of REQUIRED_APPROVAL_FIELDS) {
      if (!(field in flag.approval)) {
        errors.push(`gate [${flag.key}] approval metadata is missing field: ${field}`);
      }
    }

    // 3. Null approval fields → production activation blocked (warning while dark).
    const nullFields = REQUIRED_APPROVAL_FIELDS.filter((f) => flag.approval![f] === null);
    if (nullFields.length > 0) {
      warnings.push(
        `gate [${flag.key}] has null approval fields (${nullFields.join(", ")}) — production activation blocked`,
      );
    }

    // 4. Production activation: enabling in prod requires complete, unexpired approval.
    const prodValue = contract.defaults.production?.[flag.key];
    if (prodValue === true) {
      const missingApproval =
        !flag.approval.owner || !flag.approval.decision_source || !flag.approval.approved_at;
      if (missingApproval) {
        errors.push(
          `gate [${flag.key}] is enabled in production but approval metadata is incomplete — activation blocked`,
        );
      }
      if (flag.approval.expires_at && new Date(flag.approval.expires_at) < now) {
        errors.push(`gate [${flag.key}] is enabled in production but approval has expired`);
      }
    }
  }

  return { errors, warnings, gatedFlags };
}
