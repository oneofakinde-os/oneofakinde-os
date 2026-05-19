export type SuspensionTrigger =
  | "conviction"
  | "admission"
  | "voluntary"
  | "ops_action";

export type SuspensionStatus =
  | "active"
  | "suspended"
  | "appealing"
  | "reinstated";

export type CreatorSuspension = {
  id: string;
  studioHandle: string;
  accountId: string;
  trigger: SuspensionTrigger;
  status: SuspensionStatus;
  reason: string;
  documentedEvidence: string;
  suspendedAt: string;
  reinstatedAt: string | null;
  appealId: string | null;
};

export const DOCUMENTED_ACTION_STANDARD =
  "no suspension without documented evidence meeting the conviction or admission standard. " +
  "accusation alone is never sufficient for account action.";

export const ACCUSATION_ONLY_INACTION_COMMITMENT =
  "the platform will not suspend, restrict, or take adverse action against a creator based solely on " +
  "an accusation. action requires either a legal conviction, a voluntary creator admission, or " +
  "first-party evidence reviewed under the documented-action standard.";

export type SuspensionEconomicPreservation = {
  existingDropsAccessible: boolean;
  newCollectsBlocked: boolean;
  futureRoyaltiesEscrowed: boolean;
  patronCommitmentsPaused: boolean;
};

export const SUSPENSION_ECONOMIC_RULES: SuspensionEconomicPreservation = {
  existingDropsAccessible: true,
  newCollectsBlocked: true,
  futureRoyaltiesEscrowed: true,
  patronCommitmentsPaused: true,
};

export function canTriggerSuspension(trigger: SuspensionTrigger): boolean {
  return trigger === "conviction" || trigger === "admission" || trigger === "voluntary";
}

export function isAccusationOnly(trigger: string): boolean {
  return trigger === "accusation";
}

export type CollectorSuspensionNotification = {
  collectorAccountId: string;
  studioHandle: string;
  message: string;
  dropsAffected: string[];
  accessPreserved: boolean;
};

export function buildCollectorNotifications(
  suspension: CreatorSuspension,
  collectorAccountIds: string[],
  affectedDropIds: string[]
): CollectorSuspensionNotification[] {
  return collectorAccountIds.map((id) => ({
    collectorAccountId: id,
    studioHandle: suspension.studioHandle,
    message: `a creator whose work you've collected has been suspended. your existing access to their drops is preserved.`,
    dropsAffected: affectedDropIds,
    accessPreserved: SUSPENSION_ECONOMIC_RULES.existingDropsAccessible,
  }));
}
