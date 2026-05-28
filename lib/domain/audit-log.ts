export const AUDIT_ACTIONS = [
  "account.created",
  "account.deleted",
  "account.anonymized",
  "account.deletion_cancelled",
  "account.data_exported",
  "session.created",
  "session.revoked",
  "profile.updated",
  "role.granted",
  "role.revoked",
  "totp.enrolled",
  "totp.verified",
  "totp.disabled",
  "wallet.connected",
  "wallet.verified",
  "wallet.disconnected",
  "drop.created",
  "drop.published",
  "drop.updated",
  "drop.unpublished",
  "drop.retired",
  "drop.version_created",
  "world.created",
  "world.updated",
  "post.created",
  "post.deleted",
  "media.uploaded",
  "media.replaced",
  "media.deleted",
  "media.processing_failed",
  "drop.media_attached",
  "post.media_attached",
  "saved_intent.created",
  "saved_intent.removed",
  "ownership.created",
  "ownership.status_changed",
  "provenance.event.recorded",
  "rights.updated",
  "creator_terms.updated",
  "vault.visibility.changed",
  "policy_gate.blocked",
  "purchase.completed",
  "purchase.refunded",
  "certificate.previewed",
  "certificate.issued",
  "certificate.revoked",
  "certificate.transferred",
  "payout.requested",
  "payout.completed",
  "resale.listed",
  "resale.completed",
  "moderation.report_submitted",
  "moderation.action_taken",
  "moderation.appeal_submitted",
  "moderation.appeal_resolved",
  "user.blocked",
  "user.unblocked",
  "user.muted",
  "user.unmuted",
  "consent.updated",
  "feature_flag.toggled",
  "admin.user_lookup",
  "admin.moderation_action",
  "admin.feature_flag_override",
  "migration.executed",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditActorType = "user" | "system" | "admin" | "webhook";

export type AuditTargetType =
  | "account"
  | "session"
  | "profile"
  | "role"
  | "drop"
  | "world"
  | "post"
  | "media"
  | "saved_intent"
  | "ownership"
  | "provenance"
  | "rights"
  | "creator_terms"
  | "vault"
  | "policy_gate"
  | "certificate"
  | "transaction"
  | "payout"
  | "report"
  | "moderation_case"
  | "feature_flag"
  | "notification"
  | "message"
  | "thread"
  | "comment"
  | "consent";

export type AuditLogEntry = {
  id: string;
  action: AuditAction;
  actorId: string | null;
  actorType: AuditActorType;
  targetType: AuditTargetType;
  targetId: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  timestamp: string;
};

export type AuditLogInput = Omit<AuditLogEntry, "id" | "timestamp">;

const SENSITIVE_KEY_PATTERN = /(token|secret|signature|password|cookie)/i;

function redactSensitive(metadata: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    safe[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : value;
  }
  return safe;
}

export function createAuditEntry(input: AuditLogInput): AuditLogEntry {
  return {
    id: crypto.randomUUID(),
    action: input.action,
    actorId: input.actorId,
    actorType: input.actorType,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: redactSensitive(input.metadata),
    ipAddress: input.ipAddress,
    timestamp: new Date().toISOString(),
  };
}

export function isValidAuditAction(action: string): action is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(action);
}
