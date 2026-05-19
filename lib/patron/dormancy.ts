import type { Patron, PatronStatus } from "@/lib/domain/contracts";

export type DormancyThresholds = {
  detectionDays: number;
  patronNotificationDays: number;
  autoPauseDays: number;
  relationshipEndDays: number;
};

export const DEFAULT_THRESHOLDS: DormancyThresholds = {
  detectionDays: 60,
  patronNotificationDays: 90,
  autoPauseDays: 180,
  relationshipEndDays: 365,
};

export type DormancySignal = {
  patronId: string;
  daysSinceActivity: number;
  currentStatus: PatronStatus;
  nextStatus: PatronStatus | null;
  action: DormancyAction;
};

export type DormancyAction =
  | "none"
  | "detect_dormancy"
  | "notify_creator_60"
  | "notify_patron_90"
  | "notify_creator_90"
  | "auto_pause_billing"
  | "notify_both_180"
  | "end_relationship"
  | "resume_invitation";

export function evaluateDormancy(
  patron: Patron,
  nowMs: number,
  thresholds: DormancyThresholds = DEFAULT_THRESHOLDS
): DormancySignal {
  const lastActivity = patron.lastActivityAt
    ? Date.parse(patron.lastActivityAt)
    : Date.parse(patron.committedAt);
  const daysSince = Math.floor((nowMs - lastActivity) / 86_400_000);

  const base = {
    patronId: patron.id,
    daysSinceActivity: daysSince,
    currentStatus: patron.status,
  };

  if (patron.voluntaryDormancy && patron.status === "active") {
    return {
      ...base,
      nextStatus: "dormant_60",
      action: "detect_dormancy",
    };
  }

  if (patron.status === "ended") {
    return { ...base, nextStatus: null, action: "none" };
  }

  if (patron.status === "paused_180" && daysSince >= thresholds.relationshipEndDays) {
    return { ...base, nextStatus: "ended", action: "end_relationship" };
  }

  if (patron.status === "dormant_90" && daysSince >= thresholds.autoPauseDays) {
    return { ...base, nextStatus: "paused_180", action: "auto_pause_billing" };
  }

  if (patron.status === "dormant_60" && daysSince >= thresholds.patronNotificationDays) {
    return { ...base, nextStatus: "dormant_90", action: "notify_patron_90" };
  }

  if (patron.status === "active" && daysSince >= thresholds.detectionDays) {
    return { ...base, nextStatus: "dormant_60", action: "detect_dormancy" };
  }

  return { ...base, nextStatus: null, action: "none" };
}

export type DormancyTransitionResult = {
  patron: Patron;
  transitioned: boolean;
  previousStatus: PatronStatus;
  action: DormancyAction;
};

export function applyDormancyTransition(
  patron: Patron,
  signal: DormancySignal,
  nowIso: string
): DormancyTransitionResult {
  if (!signal.nextStatus || signal.action === "none") {
    return {
      patron,
      transitioned: false,
      previousStatus: patron.status,
      action: signal.action,
    };
  }

  const previous = patron.status;
  const updated: Patron = { ...patron, status: signal.nextStatus };

  if (signal.nextStatus === "dormant_60" && !patron.dormancyDetectedAt) {
    updated.dormancyDetectedAt = nowIso;
  }
  if (signal.nextStatus === "paused_180") {
    updated.pausedAt = nowIso;
  }
  if (signal.nextStatus === "ended") {
    updated.endedAt = nowIso;
  }

  return {
    patron: updated,
    transitioned: true,
    previousStatus: previous,
    action: signal.action,
  };
}

export function canResumePatron(patron: Patron): boolean {
  return (
    patron.status === "dormant_60" ||
    patron.status === "dormant_90" ||
    patron.status === "paused_180"
  );
}

export function resumePatron(patron: Patron, nowIso: string): Patron {
  if (!canResumePatron(patron)) return patron;
  return {
    ...patron,
    status: "active",
    lastActivityAt: nowIso,
    dormancyDetectedAt: undefined,
    pausedAt: undefined,
    voluntaryDormancy: false,
  };
}

export function declareVoluntaryDormancy(patron: Patron): Patron {
  if (patron.status !== "active") return patron;
  return { ...patron, voluntaryDormancy: true };
}

export type DormancyNotification = {
  recipientAccountId: string;
  recipientRole: "patron" | "creator";
  action: DormancyAction;
  patronHandle: string;
  studioHandle: string;
  daysSinceActivity: number;
};

export function buildDormancyNotifications(
  patron: Patron,
  creatorAccountId: string,
  signal: DormancySignal
): DormancyNotification[] {
  const base = {
    patronHandle: patron.handle,
    studioHandle: patron.studioHandle,
    daysSinceActivity: signal.daysSinceActivity,
  };

  switch (signal.action) {
    case "detect_dormancy":
    case "notify_creator_60":
      return [
        { ...base, recipientAccountId: creatorAccountId, recipientRole: "creator", action: signal.action },
      ];
    case "notify_patron_90":
      return [
        { ...base, recipientAccountId: patron.accountId, recipientRole: "patron", action: signal.action },
      ];
    case "notify_creator_90":
      return [
        { ...base, recipientAccountId: creatorAccountId, recipientRole: "creator", action: signal.action },
      ];
    case "auto_pause_billing":
    case "notify_both_180":
      return [
        { ...base, recipientAccountId: patron.accountId, recipientRole: "patron", action: signal.action },
        { ...base, recipientAccountId: creatorAccountId, recipientRole: "creator", action: signal.action },
      ];
    case "end_relationship":
      return [
        { ...base, recipientAccountId: patron.accountId, recipientRole: "patron", action: signal.action },
        { ...base, recipientAccountId: creatorAccountId, recipientRole: "creator", action: signal.action },
      ];
    case "resume_invitation":
      return [
        { ...base, recipientAccountId: patron.accountId, recipientRole: "patron", action: signal.action },
      ];
    default:
      return [];
  }
}
