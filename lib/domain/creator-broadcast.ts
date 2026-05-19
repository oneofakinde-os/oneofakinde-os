export type BroadcastType =
  | "newsletter"
  | "world_announcement"
  | "drop_launch"
  | "patron_update"
  | "tier_targeted";

export type BroadcastStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

export type Broadcast = {
  id: string;
  studioHandle: string;
  type: BroadcastType;
  subject: string;
  body: string;
  audienceScope: AudienceScope;
  scheduledAt: string | null;
  sentAt: string | null;
  status: BroadcastStatus;
  recipientCount: number | null;
  createdAt: string;
};

export type AudienceScope =
  | { kind: "all_followers" }
  | { kind: "world_members"; worldId: string }
  | { kind: "patrons_only" }
  | { kind: "tier_targeted"; tierIds: string[] };

export type BroadcastUnsubscribe = {
  accountId: string;
  scope: "per_creator" | "global";
  studioHandle: string | null;
  unsubscribedAt: string;
};

export function isUnsubscribedFromBroadcast(
  records: BroadcastUnsubscribe[],
  studioHandle: string
): boolean {
  return records.some(
    (r) => r.scope === "global" || (r.scope === "per_creator" && r.studioHandle === studioHandle)
  );
}

export type BroadcastRateLimit = {
  maxPerDay: number;
  maxPerWeek: number;
};

export const DEFAULT_BROADCAST_RATE_LIMIT: BroadcastRateLimit = {
  maxPerDay: 2,
  maxPerWeek: 7,
};

export function isBroadcastRateLimited(
  sentToday: number,
  sentThisWeek: number,
  limit: BroadcastRateLimit
): boolean {
  return sentToday >= limit.maxPerDay || sentThisWeek >= limit.maxPerWeek;
}

export type AudiencePreview = {
  broadcastId: string;
  totalRecipients: number;
  byChannel: { email: number; inApp: number; push: number };
  previewedAt: string;
};

export function buildAudiencePreview(
  broadcastId: string,
  emailCount: number,
  inAppCount: number,
  pushCount: number
): AudiencePreview {
  return {
    broadcastId,
    totalRecipients: emailCount + inAppCount + pushCount,
    byChannel: { email: emailCount, inApp: inAppCount, push: pushCount },
    previewedAt: new Date().toISOString(),
  };
}

export type DropLaunchDraft = {
  dropId: string;
  autoSubject: string;
  autoBody: string;
  creatorEdited: boolean;
};

export function generateDropLaunchDraft(
  dropId: string,
  dropTitle: string,
  studioHandle: string
): DropLaunchDraft {
  return {
    dropId,
    autoSubject: `new drop from ${studioHandle}: ${dropTitle}`,
    autoBody: `${studioHandle} just published "${dropTitle}". check it out now.`,
    creatorEdited: false,
  };
}

export type ExternalListImport = {
  id: string;
  studioHandle: string;
  emailCount: number;
  importedAt: string;
  consentVerified: boolean;
};

export function canImportExternalList(import_: ExternalListImport): boolean {
  return import_.consentVerified && import_.emailCount > 0;
}
