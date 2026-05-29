import type { BffDatabase } from "@/lib/bff/persistence";
import type { NotificationType, RelationshipContext } from "@/lib/domain/contracts";

export const FORBIDDEN_NOTIFICATION_TYPES = new Set<string>([
  "resale_value_increased",
  "price_appreciation",
  "most_resold",
  "most_profitable",
  "bid_received",
  "ask_placed",
  "order_matched",
  "market_cap_alert",
  "resale_velocity_alert",
  "speculative_ranking",
  "profit_alert",
  "investment_return",
]);

export function isSpeculativeNotificationType(type: string): boolean {
  return FORBIDDEN_NOTIFICATION_TYPES.has(type);
}

// Proof-safety and governance alerts must never be suppressed by user preference.
const SAFETY_NOTICE_TYPES = new Set<NotificationType>([
  "governance_alert",
]);

export function isSafetyNoticeType(type: NotificationType): boolean {
  return SAFETY_NOTICE_TYPES.has(type);
}

export function canAccessCollectorOnlyContent(
  accountId: string,
  dropId: string,
  db: BffDatabase
): boolean {
  const ownership = db.ownerships.find(
    (o) => o.accountId === accountId && o.dropId === dropId
  );
  if (!ownership) return false;
  if (ownership.status === "revoked") return false;

  const cert = db.certificates.find((c) => c.id === ownership.certificateId);
  if (cert && cert.status === "revoked") return false;

  return true;
}

export function buildRelationshipContext(
  viewerAccountId: string,
  studioHandle: string,
  db: BffDatabase
): RelationshipContext {
  const studioDropIds = new Set(
    db.catalog.drops.filter((d) => d.studioHandle === studioHandle).map((d) => d.id)
  );

  const hasCollectedFromStudio = db.ownerships.some(
    (o) => o.accountId === viewerAccountId && studioDropIds.has(o.dropId) && o.status !== "revoked"
  );

  const hasSavedFromStudio = db.savedIntents.some(
    (si) => si.accountId === viewerAccountId && studioDropIds.has(si.dropId)
  );

  const isFollowingStudio = db.studioFollows.some(
    (sf) => sf.accountId === viewerAccountId && sf.studioHandle === studioHandle
  );

  const isActivePatron = db.patrons.some(
    (p) =>
      p.accountId === viewerAccountId &&
      p.studioHandle === studioHandle &&
      p.status === "active"
  );

  return {
    viewerAccountId,
    studioHandle,
    hasCollectedFromStudio,
    hasSavedFromStudio,
    isFollowingStudio,
    isActivePatron,
  };
}

// Validation: recognition notes must not contain speculation language
const PROHIBITED_RECOGNITION_PATTERNS = [
  /\bresale\b/i,
  /\bprofit\b/i,
  /\bprice\s*(went|going|goes|increased|dropped|pumped)/i,
  /\bmarket\s*cap\b/i,
  /\binvestment\b/i,
  /\bflip\b/i,
  /\bsell\b/i,
  /\bselling\b/i,
];

export function validateRecognitionNoteText(text: string): { ok: boolean; reason?: string } {
  for (const pattern of PROHIBITED_RECOGNITION_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, reason: `recognition note contains prohibited language` };
    }
  }
  return { ok: true };
}
