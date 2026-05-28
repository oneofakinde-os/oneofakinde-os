/**
 * Sprint 0.2 — Identity event factories.
 *
 * Pure functions that produce structured analytics payloads and audit
 * log entries for every identity-layer action. Each function returns a
 * `{ analytics, audit }` tuple so callers can forward both in a single
 * call without duplicating field mapping.
 *
 * These factories do NOT perform I/O — they build the event objects.
 * Actual dispatch (analytics ingestion, audit row insertion) is handled
 * by the caller or by a future event bus.
 */

import type { AnalyticsEventName } from "./analytics-events";
import type { AuditLogInput } from "./audit-log";
import type { AccountRole } from "./contracts";

export type IdentityAnalyticsPayload = {
  event: AnalyticsEventName;
  properties: Record<string, unknown>;
  timestamp: string;
};

export type IdentityEventPair = {
  analytics: IdentityAnalyticsPayload;
  audit: AuditLogInput;
};

function ts(): string {
  return new Date().toISOString();
}

// ── Sign-up ──────────────────────────────────────────────────────────

export function signUpSucceeded(p: {
  accountId: string;
  email: string;
  role: AccountRole;
  provider: "supabase" | "legacy";
  ip: string;
}): IdentityEventPair {
  return {
    analytics: {
      event: "account.signup.succeeded",
      properties: {
        accountId: p.accountId,
        role: p.role,
        provider: p.provider,
      },
      timestamp: ts(),
    },
    audit: {
      action: "account.created",
      actorId: p.accountId,
      actorType: "user",
      targetType: "account",
      targetId: p.accountId,
      metadata: { role: p.role, provider: p.provider, email: p.email },
      ipAddress: p.ip,
    },
  };
}

export function signUpFailed(p: {
  email: string;
  reason: string;
  provider: "supabase" | "legacy";
  ip: string;
}): IdentityEventPair {
  return {
    analytics: {
      event: "account.signup.failed",
      properties: { reason: p.reason, provider: p.provider },
      timestamp: ts(),
    },
    audit: {
      action: "account.created",
      actorId: null,
      actorType: "user",
      targetType: "account",
      targetId: "unknown",
      metadata: {
        outcome: "failed",
        reason: p.reason,
        provider: p.provider,
        email: p.email,
      },
      ipAddress: p.ip,
    },
  };
}

// ── Sign-in ──────────────────────────────────────────────────────────

export function signInSucceeded(p: {
  accountId: string;
  provider: "supabase" | "legacy";
  ip: string;
}): IdentityEventPair {
  return {
    analytics: {
      event: "account.signin.succeeded",
      properties: { accountId: p.accountId, provider: p.provider },
      timestamp: ts(),
    },
    audit: {
      action: "session.created",
      actorId: p.accountId,
      actorType: "user",
      targetType: "session",
      targetId: p.accountId,
      metadata: { provider: p.provider },
      ipAddress: p.ip,
    },
  };
}

export function signInFailed(p: {
  email: string;
  reason: string;
  provider: "supabase" | "legacy";
  ip: string;
}): IdentityEventPair {
  return {
    analytics: {
      event: "account.signin.failed",
      properties: { reason: p.reason, provider: p.provider },
      timestamp: ts(),
    },
    audit: {
      action: "session.created",
      actorId: null,
      actorType: "user",
      targetType: "session",
      targetId: "unknown",
      metadata: {
        outcome: "failed",
        reason: p.reason,
        provider: p.provider,
        email: p.email,
      },
      ipAddress: p.ip,
    },
  };
}

// ── Sign-out ─────────────────────────────────────────────────────────

export function signOutCompleted(p: {
  accountId: string;
  provider: "supabase" | "legacy" | "both";
  ip: string | null;
}): IdentityEventPair {
  return {
    analytics: {
      event: "account.signout.completed",
      properties: { accountId: p.accountId, provider: p.provider },
      timestamp: ts(),
    },
    audit: {
      action: "session.revoked",
      actorId: p.accountId,
      actorType: "user",
      targetType: "session",
      targetId: p.accountId,
      metadata: { provider: p.provider },
      ipAddress: p.ip,
    },
  };
}

// ── Profile update ───────────────────────────────────────────────────

export function profileUpdated(p: {
  accountId: string;
  fields: string[];
  ip: string | null;
}): IdentityEventPair {
  return {
    analytics: {
      event: "profile.updated",
      properties: { accountId: p.accountId, fields: p.fields },
      timestamp: ts(),
    },
    audit: {
      action: "profile.updated",
      actorId: p.accountId,
      actorType: "user",
      targetType: "profile",
      targetId: p.accountId,
      metadata: { fields: p.fields },
      ipAddress: p.ip,
    },
  };
}

export function handleChanged(p: {
  accountId: string;
  oldHandle: string;
  newHandle: string;
  ip: string | null;
}): IdentityEventPair {
  return {
    analytics: {
      event: "profile.handle.changed",
      properties: {
        accountId: p.accountId,
        oldHandle: p.oldHandle,
        newHandle: p.newHandle,
      },
      timestamp: ts(),
    },
    audit: {
      action: "profile.updated",
      actorId: p.accountId,
      actorType: "user",
      targetType: "profile",
      targetId: p.accountId,
      metadata: {
        field: "handle",
        oldHandle: p.oldHandle,
        newHandle: p.newHandle,
      },
      ipAddress: p.ip,
    },
  };
}

export function avatarUpdated(p: {
  accountId: string;
  ip: string | null;
}): IdentityEventPair {
  return {
    analytics: {
      event: "profile.avatar.updated",
      properties: { accountId: p.accountId },
      timestamp: ts(),
    },
    audit: {
      action: "profile.updated",
      actorId: p.accountId,
      actorType: "user",
      targetType: "profile",
      targetId: p.accountId,
      metadata: { field: "avatar" },
      ipAddress: p.ip,
    },
  };
}

// ── Role switching ───────────────────────────────────────────────────

export function roleSwitched(p: {
  accountId: string;
  fromRole: AccountRole;
  toRole: AccountRole;
  ip: string | null;
}): IdentityEventPair {
  return {
    analytics: {
      event: "role.switched",
      properties: {
        accountId: p.accountId,
        fromRole: p.fromRole,
        toRole: p.toRole,
      },
      timestamp: ts(),
    },
    audit: {
      action: "role.granted",
      actorId: p.accountId,
      actorType: "user",
      targetType: "role",
      targetId: p.accountId,
      metadata: { fromRole: p.fromRole, toRole: p.toRole },
      ipAddress: p.ip,
    },
  };
}

// ── Account lifecycle ────────────────────────────────────────────────

export function accountDeletionRequested(p: {
  accountId: string;
  ip: string | null;
}): IdentityEventPair {
  return {
    analytics: {
      event: "account.deleted",
      properties: { accountId: p.accountId, phase: "requested" },
      timestamp: ts(),
    },
    audit: {
      action: "account.deleted",
      actorId: p.accountId,
      actorType: "user",
      targetType: "account",
      targetId: p.accountId,
      metadata: { phase: "deletion_requested" },
      ipAddress: p.ip,
    },
  };
}

export function accountDeletionCancelled(p: {
  accountId: string;
  ip: string | null;
}): IdentityEventPair {
  return {
    analytics: {
      event: "account.deleted",
      properties: { accountId: p.accountId, phase: "cancelled" },
      timestamp: ts(),
    },
    audit: {
      action: "account.deletion_cancelled",
      actorId: p.accountId,
      actorType: "user",
      targetType: "account",
      targetId: p.accountId,
      metadata: { phase: "deletion_cancelled" },
      ipAddress: p.ip,
    },
  };
}

export function accountAnonymized(p: {
  accountId: string;
}): IdentityEventPair {
  return {
    analytics: {
      event: "account.deleted",
      properties: { accountId: p.accountId, phase: "anonymized" },
      timestamp: ts(),
    },
    audit: {
      action: "account.anonymized",
      actorId: null,
      actorType: "system",
      targetType: "account",
      targetId: p.accountId,
      metadata: { phase: "anonymized" },
      ipAddress: null,
    },
  };
}

export function dataExportRequested(p: {
  accountId: string;
  ip: string | null;
}): IdentityEventPair {
  return {
    analytics: {
      event: "data_export.requested",
      properties: { accountId: p.accountId },
      timestamp: ts(),
    },
    audit: {
      action: "account.data_exported",
      actorId: p.accountId,
      actorType: "user",
      targetType: "account",
      targetId: p.accountId,
      metadata: {},
      ipAddress: p.ip,
    },
  };
}

// ── TOTP / 2FA ───────────────────────────────────────────────────────

export function totpEnrolled(p: {
  accountId: string;
  ip: string | null;
}): IdentityEventPair {
  return {
    analytics: {
      event: "consent.updated",
      properties: { accountId: p.accountId, action: "totp_enrolled" },
      timestamp: ts(),
    },
    audit: {
      action: "totp.enrolled",
      actorId: p.accountId,
      actorType: "user",
      targetType: "account",
      targetId: p.accountId,
      metadata: {},
      ipAddress: p.ip,
    },
  };
}

export function totpVerified(p: {
  accountId: string;
  ip: string | null;
}): IdentityEventPair {
  return {
    analytics: {
      event: "consent.updated",
      properties: { accountId: p.accountId, action: "totp_verified" },
      timestamp: ts(),
    },
    audit: {
      action: "totp.verified",
      actorId: p.accountId,
      actorType: "user",
      targetType: "account",
      targetId: p.accountId,
      metadata: {},
      ipAddress: p.ip,
    },
  };
}

export function totpDisabled(p: {
  accountId: string;
  ip: string | null;
}): IdentityEventPair {
  return {
    analytics: {
      event: "consent.updated",
      properties: { accountId: p.accountId, action: "totp_disabled" },
      timestamp: ts(),
    },
    audit: {
      action: "totp.disabled",
      actorId: p.accountId,
      actorType: "user",
      targetType: "account",
      targetId: p.accountId,
      metadata: {},
      ipAddress: p.ip,
    },
  };
}
