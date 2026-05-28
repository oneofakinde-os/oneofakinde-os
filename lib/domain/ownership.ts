/**
 * Sprint 0.4 — Ownership domain model.
 *
 * Typed contracts and helpers for the `bff_ownerships` table and the
 * broader ownership concept across drops, worlds, and future collectibles.
 *
 * The DB schema (migration 0001) stores the ownership as:
 *   (account_id, drop_id) PK, certificate_id, receipt_id, acquired_at
 *
 * This module adds typed lifecycle, acquisition method tracking,
 * ownership status, and helper functions that future API routes and
 * services can use without duplicating logic.
 */

// ── Ownership status ─────────────────────────────────────────────────

export const OWNERSHIP_STATUSES = [
  "active",
  "transferred",
  "revoked",
  "refunded",
] as const;

export type OwnershipStatus = (typeof OWNERSHIP_STATUSES)[number];

// ── Acquisition methods ──────────────────────────────────────────────

export const ACQUISITION_METHODS = [
  "purchase",
  "claim",
  "gift",
  "resale",
  "creator_grant",
  "system",
] as const;

export type AcquisitionMethod = (typeof ACQUISITION_METHODS)[number];

// ── Owned object types ───────────────────────────────────────────────

export const OWNED_OBJECT_TYPES = [
  "drop",
  "world_bundle",
] as const;

export type OwnedObjectType = (typeof OWNED_OBJECT_TYPES)[number];

// ── Ownership record ─────────────────────────────────────────────────

export type OwnershipRecord = {
  id: string;
  accountId: string;
  objectType: OwnedObjectType;
  objectId: string;
  dropId: string | null;
  certificateId: string | null;
  receiptId: string | null;
  status: OwnershipStatus;
  acquisitionMethod: AcquisitionMethod;
  acquiredAt: string;
  updatedAt: string;
  revokedAt?: string;
  transferredAt?: string;
  transferredToAccountId?: string;
  metadata: Record<string, unknown>;
};

// ── Factory ──────────────────────────────────────────────────────────

export type CreateOwnershipInput = {
  accountId: string;
  objectType: OwnedObjectType;
  objectId: string;
  dropId?: string;
  certificateId?: string;
  receiptId?: string;
  acquisitionMethod: AcquisitionMethod;
  metadata?: Record<string, unknown>;
};

export function createOwnershipRecord(
  input: CreateOwnershipInput
): OwnershipRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    accountId: input.accountId,
    objectType: input.objectType,
    objectId: input.objectId,
    dropId: input.dropId ?? null,
    certificateId: input.certificateId ?? null,
    receiptId: input.receiptId ?? null,
    status: "active",
    acquisitionMethod: input.acquisitionMethod,
    acquiredAt: now,
    updatedAt: now,
    metadata: input.metadata ?? {},
  };
}

// ── Status transitions ───────────────────────────────────────────────

const OWNERSHIP_TRANSITIONS: Record<OwnershipStatus, ReadonlySet<OwnershipStatus>> = {
  active:      new Set(["transferred", "revoked", "refunded"]),
  transferred: new Set([]),
  revoked:     new Set([]),
  refunded:    new Set([]),
};

export function canTransitionOwnership(
  from: OwnershipStatus,
  to: OwnershipStatus
): boolean {
  return OWNERSHIP_TRANSITIONS[from]?.has(to) ?? false;
}

export function isOwnershipTerminal(status: OwnershipStatus): boolean {
  return status === "transferred" || status === "revoked" || status === "refunded";
}

export type OwnershipTransitionResult =
  | { ok: true; record: OwnershipRecord }
  | { ok: false; reason: string };

export function transitionOwnership(
  record: OwnershipRecord,
  to: OwnershipStatus,
  update?: {
    transferredToAccountId?: string;
    metadata?: Record<string, unknown>;
  }
): OwnershipTransitionResult {
  if (!canTransitionOwnership(record.status, to)) {
    return {
      ok: false,
      reason: `invalid_transition: ${record.status} → ${to}`,
    };
  }

  const now = new Date().toISOString();
  const next: OwnershipRecord = {
    ...record,
    status: to,
    updatedAt: now,
    revokedAt: to === "revoked" ? now : record.revokedAt,
    transferredAt: to === "transferred" ? now : record.transferredAt,
    transferredToAccountId:
      to === "transferred"
        ? (update?.transferredToAccountId ?? record.transferredToAccountId)
        : record.transferredToAccountId,
    metadata: update?.metadata
      ? { ...record.metadata, ...update.metadata }
      : record.metadata,
  };

  return { ok: true, record: next };
}

// ── Access checks ────────────────────────────────────────────────────

export function isOwner(
  record: OwnershipRecord,
  accountId: string
): boolean {
  return record.accountId === accountId && record.status === "active";
}

export function isActiveOwnership(record: OwnershipRecord): boolean {
  return record.status === "active";
}
