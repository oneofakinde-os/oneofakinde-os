export const PLATFORM_MIN_RESALE_HOLD_DAYS = 7;
export const PLATFORM_MIN_RESALE_ROYALTY_BPS = 500;

export const RIGHTS_METADATA_SCHEMA_VERSION = "rights_metadata_v1";
export const CREATOR_TERMS_SCHEMA_VERSION = "creator_terms_v1";

export const PERMITTED_USE_TYPES = [
  "private_viewing",
  "collector_vault_display",
  "certificate_sharing",
  "creator_attributed_reference",
] as const;

export type PermittedUseType = (typeof PERMITTED_USE_TYPES)[number];

export type RightsMetadata = {
  schemaVersion: typeof RIGHTS_METADATA_SCHEMA_VERSION;
  rightsHolderHandle: string;
  licenseSummary: string;
  permittedUses: PermittedUseType[];
  attributionRequired: boolean;
  commercialUseAllowed: boolean;
  remixAllowed: boolean;
  aiTrainingAllowed: boolean;
  governingJurisdiction: string;
  updatedAt: string;
};

export type TransferKind = "none" | "gift" | "sale" | "account_migration";

export type TransferRules = {
  transferEnabled: boolean;
  resaleEnabled: boolean;
  resaleSolicitationAllowed: boolean;
  minimumHoldDays: number;
  royaltyBps: number;
  allowedTransferKinds: TransferKind[];
};

export type CreatorTerms = {
  schemaVersion: typeof CREATOR_TERMS_SCHEMA_VERSION;
  creatorHandle: string;
  termsSummary: string;
  editionPolicy: string;
  proofRequiredBeforeCollect: boolean;
  transferRules: TransferRules;
  updatedAt: string;
};

export type DropIssuanceTerms = {
  rightsMetadata: RightsMetadata;
  creatorTerms: CreatorTerms;
};

export type DropPublishValidationResult =
  | { ok: true }
  | { ok: false; reason: DropPublishValidationReason; detail: string };

export type DropPublishValidationReason =
  | "missing_rights_metadata"
  | "incomplete_rights_metadata"
  | "missing_creator_terms"
  | "incomplete_creator_terms"
  | "royalty_floor_required";

export type ResaleEligibilityInput = {
  ownershipStatus: "active" | "transferred" | "revoked" | "refunded";
  acquiredAt: string;
  transferRules: TransferRules;
  now?: Date;
  policyGateOpen?: boolean;
};

export type ResaleEligibilityReason =
  | "eligible"
  | "policy_gate_closed"
  | "ownership_not_active"
  | "resale_disabled"
  | "minimum_hold_period"
  | "royalty_floor_required"
  | "invalid_acquired_at";

export type ResaleEligibility = {
  eligible: boolean;
  reason: ResaleEligibilityReason;
  earliestEligibleAt: string | null;
  minimumHoldDays: number;
  royaltyBps: number;
  policyGateOpen: boolean;
};

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function uniquePermittedUses(uses: readonly PermittedUseType[]): PermittedUseType[] {
  return [...new Set(uses)];
}

export function createDefaultTransferRules(
  overrides: Partial<TransferRules> = {}
): TransferRules {
  return {
    transferEnabled: false,
    resaleEnabled: false,
    resaleSolicitationAllowed: false,
    minimumHoldDays: PLATFORM_MIN_RESALE_HOLD_DAYS,
    royaltyBps: PLATFORM_MIN_RESALE_ROYALTY_BPS,
    allowedTransferKinds: ["none"],
    ...overrides,
  };
}

export function createRightsMetadata(input: {
  rightsHolderHandle: string;
  licenseSummary: string;
  permittedUses?: PermittedUseType[];
  attributionRequired?: boolean;
  commercialUseAllowed?: boolean;
  remixAllowed?: boolean;
  aiTrainingAllowed?: boolean;
  governingJurisdiction?: string;
  updatedAt?: string;
}): RightsMetadata {
  return {
    schemaVersion: RIGHTS_METADATA_SCHEMA_VERSION,
    rightsHolderHandle: input.rightsHolderHandle.trim(),
    licenseSummary: input.licenseSummary.trim(),
    permittedUses: uniquePermittedUses(
      input.permittedUses ?? [
        "private_viewing",
        "collector_vault_display",
        "certificate_sharing",
      ]
    ),
    attributionRequired: input.attributionRequired ?? true,
    commercialUseAllowed: input.commercialUseAllowed ?? false,
    remixAllowed: input.remixAllowed ?? false,
    aiTrainingAllowed: input.aiTrainingAllowed ?? false,
    governingJurisdiction: input.governingJurisdiction?.trim() || "US",
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export function createCreatorTerms(input: {
  creatorHandle: string;
  termsSummary: string;
  editionPolicy: string;
  transferRules?: Partial<TransferRules>;
  proofRequiredBeforeCollect?: boolean;
  updatedAt?: string;
}): CreatorTerms {
  return {
    schemaVersion: CREATOR_TERMS_SCHEMA_VERSION,
    creatorHandle: input.creatorHandle.trim(),
    termsSummary: input.termsSummary.trim(),
    editionPolicy: input.editionPolicy.trim(),
    proofRequiredBeforeCollect: input.proofRequiredBeforeCollect ?? true,
    transferRules: createDefaultTransferRules(input.transferRules),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export function isCompleteRightsMetadata(value: RightsMetadata | null | undefined): value is RightsMetadata {
  return Boolean(
    value &&
      value.schemaVersion === RIGHTS_METADATA_SCHEMA_VERSION &&
      nonEmpty(value.rightsHolderHandle) &&
      nonEmpty(value.licenseSummary) &&
      value.permittedUses.length > 0 &&
      nonEmpty(value.governingJurisdiction) &&
      nonEmpty(value.updatedAt)
  );
}

export function isCompleteCreatorTerms(value: CreatorTerms | null | undefined): value is CreatorTerms {
  return Boolean(
    value &&
      value.schemaVersion === CREATOR_TERMS_SCHEMA_VERSION &&
      nonEmpty(value.creatorHandle) &&
      nonEmpty(value.termsSummary) &&
      nonEmpty(value.editionPolicy) &&
      value.proofRequiredBeforeCollect === true &&
      isCompleteTransferRules(value.transferRules) &&
      nonEmpty(value.updatedAt)
  );
}

export function isCompleteTransferRules(value: TransferRules | null | undefined): value is TransferRules {
  return Boolean(
    value &&
      typeof value.transferEnabled === "boolean" &&
      typeof value.resaleEnabled === "boolean" &&
      typeof value.resaleSolicitationAllowed === "boolean" &&
      Number.isInteger(value.minimumHoldDays) &&
      value.minimumHoldDays >= PLATFORM_MIN_RESALE_HOLD_DAYS &&
      Number.isInteger(value.royaltyBps) &&
      value.royaltyBps >= 0 &&
      Array.isArray(value.allowedTransferKinds) &&
      value.allowedTransferKinds.length > 0
  );
}

export function validateDropPublishReadiness(input: {
  rightsMetadata?: RightsMetadata | null;
  creatorTerms?: CreatorTerms | null;
}): DropPublishValidationResult {
  if (!input.rightsMetadata) {
    return {
      ok: false,
      reason: "missing_rights_metadata",
      detail: "rights metadata is required before a drop can be issued",
    };
  }

  if (!isCompleteRightsMetadata(input.rightsMetadata)) {
    return {
      ok: false,
      reason: "incomplete_rights_metadata",
      detail: "rights metadata must include rights holder, license summary, permitted uses, and jurisdiction",
    };
  }

  if (!input.creatorTerms) {
    return {
      ok: false,
      reason: "missing_creator_terms",
      detail: "creator terms are required before a drop can be issued",
    };
  }

  if (!isCompleteCreatorTerms(input.creatorTerms)) {
    return {
      ok: false,
      reason: "incomplete_creator_terms",
      detail: "creator terms must include summary, edition policy, transfer rules, and proof requirement",
    };
  }

  if (
    input.creatorTerms.transferRules.resaleEnabled &&
    input.creatorTerms.transferRules.royaltyBps < PLATFORM_MIN_RESALE_ROYALTY_BPS
  ) {
    return {
      ok: false,
      reason: "royalty_floor_required",
      detail: "resale-enabled drops must keep the platform royalty floor",
    };
  }

  return { ok: true };
}

export function evaluateResaleEligibility(input: ResaleEligibilityInput): ResaleEligibility {
  const policyGateOpen = input.policyGateOpen === true;
  const minimumHoldDays = input.transferRules.minimumHoldDays;
  const royaltyBps = input.transferRules.royaltyBps;

  if (!policyGateOpen) {
    return {
      eligible: false,
      reason: "policy_gate_closed",
      earliestEligibleAt: null,
      minimumHoldDays,
      royaltyBps,
      policyGateOpen,
    };
  }

  if (input.ownershipStatus !== "active") {
    return {
      eligible: false,
      reason: "ownership_not_active",
      earliestEligibleAt: null,
      minimumHoldDays,
      royaltyBps,
      policyGateOpen,
    };
  }

  if (!input.transferRules.resaleEnabled) {
    return {
      eligible: false,
      reason: "resale_disabled",
      earliestEligibleAt: null,
      minimumHoldDays,
      royaltyBps,
      policyGateOpen,
    };
  }

  if (royaltyBps < PLATFORM_MIN_RESALE_ROYALTY_BPS) {
    return {
      eligible: false,
      reason: "royalty_floor_required",
      earliestEligibleAt: null,
      minimumHoldDays,
      royaltyBps,
      policyGateOpen,
    };
  }

  const acquiredAtMs = Date.parse(input.acquiredAt);
  if (!Number.isFinite(acquiredAtMs)) {
    return {
      eligible: false,
      reason: "invalid_acquired_at",
      earliestEligibleAt: null,
      minimumHoldDays,
      royaltyBps,
      policyGateOpen,
    };
  }

  const earliestMs = acquiredAtMs + minimumHoldDays * 86_400_000;
  const nowMs = (input.now ?? new Date()).valueOf();
  const earliestEligibleAt = new Date(earliestMs).toISOString();

  if (nowMs < earliestMs) {
    return {
      eligible: false,
      reason: "minimum_hold_period",
      earliestEligibleAt,
      minimumHoldDays,
      royaltyBps,
      policyGateOpen,
    };
  }

  return {
    eligible: true,
    reason: "eligible",
    earliestEligibleAt,
    minimumHoldDays,
    royaltyBps,
    policyGateOpen,
  };
}
