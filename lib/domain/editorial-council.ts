export type CouncilSeatRole = "creator" | "external" | "guest";

export type CouncilSeat = {
  id: string;
  memberId: string;
  memberHandle: string;
  role: CouncilSeatRole;
  termStartDate: string;
  termEndDate: string;
  active: boolean;
  ethicsAttestationDate: string | null;
};

export type TermDuration = {
  role: CouncilSeatRole;
  months: number;
};

export const TERM_DURATIONS: readonly TermDuration[] = [
  { role: "creator", months: 24 },
  { role: "external", months: 12 },
  { role: "guest", months: 3 },
] as const;

export function getTermDuration(role: CouncilSeatRole): number {
  return TERM_DURATIONS.find((t) => t.role === role)!.months;
}

export const COUNCIL_SIZE = 5;
export const COUNCIL_SIZE_WITH_GUEST = 6;

export function pinDecisionQuorum(hasGuest: boolean): number {
  return hasGuest ? 4 : 3;
}

export type PinDecision = {
  id: string;
  dropId: string;
  proposedBy: string;
  votes: PinVote[];
  result: "approved" | "rejected" | "pending";
  duration: PinDuration;
  createdAt: string;
  decidedAt: string | null;
};

export type PinVote = {
  memberId: string;
  vote: "approve" | "reject" | "recuse";
  reason: string | null;
};

export type PinDuration = "1_week" | "2_weeks" | "1_month";

export const PIN_DURATION_DAYS: Record<PinDuration, number> = {
  "1_week": 7,
  "2_weeks": 14,
  "1_month": 30,
};

export type ConflictOfInterest = {
  memberId: string;
  dropId: string;
  relationship: string;
  disclosedAt: string;
  autoRecused: boolean;
};

export function hasConflict(memberId: string, dropCreatorId: string, disclosures: ConflictOfInterest[]): boolean {
  return disclosures.some((d) => d.memberId === memberId);
}

export function isSelfPin(memberId: string, dropCreatorId: string): boolean {
  return memberId === dropCreatorId;
}

export function mustRecuse(memberId: string, dropCreatorId: string, disclosures: ConflictOfInterest[]): boolean {
  return isSelfPin(memberId, dropCreatorId) || hasConflict(memberId, dropCreatorId, disclosures);
}

export function evaluatePinDecision(
  votes: PinVote[],
  hasGuest: boolean
): "approved" | "rejected" {
  const approvals = votes.filter((v) => v.vote === "approve").length;
  return approvals >= pinDecisionQuorum(hasGuest) ? "approved" : "rejected";
}

export type PinVolumeCap = {
  maxActivePins: number;
  maxPinsPerWeek: number;
};

export const DEFAULT_PIN_VOLUME_CAP: PinVolumeCap = {
  maxActivePins: 10,
  maxPinsPerWeek: 5,
};

export function isWithinPinCap(activePins: number, pinsThisWeek: number, cap: PinVolumeCap): boolean {
  return activePins < cap.maxActivePins && pinsThisWeek < cap.maxPinsPerWeek;
}

export type PinAuditEntry = {
  id: string;
  dropId: string;
  action: "pinned" | "unpinned" | "expired";
  decisionId: string;
  performedAt: string;
};

export type CreatorSubmission = {
  id: string;
  studioHandle: string;
  dropId: string;
  submittedAt: string;
  status: "pending" | "reviewed" | "pinned" | "declined";
  reviewedBy: string | null;
};

export type CouncilRetrospective = {
  quarter: string;
  totalPins: number;
  totalSubmissions: number;
  pinsByMode: Record<string, number>;
  diversityMetrics: Record<string, number>;
  publishedAt: string;
};

export const ETHICS_CODE =
  "council members receive no compensation, gifts, or special treatment from the platform " +
  "or from creators. the editorial function is an honor role, not a paid position.";

export const NO_DOWNSTREAM_AMPLIFICATION =
  "editorial pins do not feed into any ranking signal. a pin is a curatorial highlight " +
  "only — it does not boost consumption score, townhall position, or discovery weight.";

export const PIN_VISUAL_LABEL = "Editorial Pick";
