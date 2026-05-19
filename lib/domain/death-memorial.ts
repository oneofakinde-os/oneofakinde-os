export type DeathVerificationStatus =
  | "reported"
  | "documentation_requested"
  | "under_review"
  | "verified"
  | "disputed"
  | "rejected";

export type DeathReport = {
  id: string;
  deceasedAccountId: string;
  reporterName: string;
  reporterRelationship: string;
  reporterEmail: string;
  verificationStatus: DeathVerificationStatus;
  documentationUrls: string[];
  reportedAt: string;
  verifiedAt: string | null;
  reviewerHandle: string | null;
};

export type MemorialStudioState = {
  accountId: string;
  studioHandle: string;
  inMemoriam: boolean;
  markerAppliedAt: string | null;
  successorAccountId: string | null;
  royaltyEstateAccountId: string | null;
};

export function isVerified(report: DeathReport): boolean {
  return report.verificationStatus === "verified";
}

export function shouldPauseAccount(report: DeathReport): boolean {
  return (
    report.verificationStatus === "reported" ||
    report.verificationStatus === "documentation_requested" ||
    report.verificationStatus === "under_review"
  );
}

export type SuccessorManagementRight =
  | "view_analytics"
  | "manage_pricing"
  | "manage_worlds"
  | "respond_messages"
  | "withdraw_royalties"
  | "update_studio_bio";

export const DEFAULT_SUCCESSOR_RIGHTS: readonly SuccessorManagementRight[] = [
  "view_analytics",
  "manage_pricing",
  "withdraw_royalties",
] as const;

export type WorldSuccession = {
  worldId: string;
  originalCreatorAccountId: string;
  successorAccountId: string | null;
  status: "active" | "successor_managing" | "dormant" | "archived";
};

export type DormancyEscheatment = {
  accountId: string;
  noDesignationDetectedAt: string;
  dormancyStartedAt: string;
  escheatmentDate: string | null;
  status: "dormant" | "escheated";
};

export const NO_DESIGNATION_DORMANCY_DAYS = 365;
export const ESCHEATMENT_AFTER_DORMANCY_DAYS = 730;

export function computeEscheatmentDate(dormancyStartIso: string): string {
  const d = new Date(dormancyStartIso);
  d.setDate(d.getDate() + ESCHEATMENT_AFTER_DORMANCY_DAYS);
  return d.toISOString().slice(0, 10);
}

export type DisputedSuccession = {
  accountId: string;
  claimants: SuccessionClaimant[];
  status: "holding" | "resolved" | "external_arbitration";
  holdingSince: string;
};

export type SuccessionClaimant = {
  name: string;
  relationship: string;
  documentationUrls: string[];
  claimedAt: string;
};

export function isDisputedSuccession(claimants: SuccessionClaimant[]): boolean {
  return claimants.length > 1;
}

export type PatronDeathNotification = {
  patronAccountId: string;
  deceasedStudioHandle: string;
  message: string;
  options: ("continue_support_to_estate" | "pause" | "end")[];
};

export function buildPatronDeathNotification(
  patronAccountId: string,
  studioHandle: string
): PatronDeathNotification {
  return {
    patronAccountId,
    deceasedStudioHandle: studioHandle,
    message: `the creator behind ${studioHandle} has passed away. your existing access to their work is preserved. ` +
      `you may continue supporting their estate, pause your patronage, or end it.`,
    options: ["continue_support_to_estate", "pause", "end"],
  };
}

export const IN_MEMORIAM_MARKER = "in memoriam";
