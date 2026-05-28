/**
 * Sprint 0.4 — Provenance domain model.
 *
 * An append-only ledger of events recording how an asset (drop, certificate,
 * ownership record) moved through its lifecycle. Each event is immutable once
 * created — the ledger only grows.
 *
 * Sprint 0.4R adds the durable `bff_provenance_events` table. These helpers
 * remain storage-agnostic so routes and services can validate append-only
 * behavior before writing records.
 */

// ── Provenance event types ───────────────────────────────────────────

export const PROVENANCE_EVENT_TYPES = [
  "created",
  "published",
  "collected",
  "transferred",
  "resold",
  "revoked",
  "refunded",
  "certificate_issued",
  "certificate_revoked",
  "certificate_transferred",
  "media_attached",
  "media_replaced",
  "version_created",
  "rights_updated",
  "metadata_updated",
] as const;

export type ProvenanceEventType = (typeof PROVENANCE_EVENT_TYPES)[number];

// ── Subject types ────────────────────────────────────────────────────

export const PROVENANCE_SUBJECT_TYPES = [
  "drop",
  "certificate",
  "ownership",
  "media_asset",
  "world",
] as const;

export type ProvenanceSubjectType = (typeof PROVENANCE_SUBJECT_TYPES)[number];

// ── Provenance event record ─────────────────────────────────────────

export type ProvenanceEvent = {
  id: string;
  eventType: ProvenanceEventType;
  subjectType: ProvenanceSubjectType;
  subjectId: string;
  actorAccountId: string | null;
  studioHandle: string | null;
  ownershipId: string | null;
  certificateId: string | null;
  mediaAssetId: string | null;
  receiptId: string | null;
  previousEventId: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

// ── Factory ──────────────────────────────────────────────────────────

export type CreateProvenanceEventInput = {
  eventType: ProvenanceEventType;
  subjectType: ProvenanceSubjectType;
  subjectId: string;
  actorAccountId?: string;
  studioHandle?: string;
  ownershipId?: string;
  certificateId?: string;
  mediaAssetId?: string;
  receiptId?: string;
  previousEventId?: string;
  metadata?: Record<string, unknown>;
};

export function createProvenanceEvent(
  input: CreateProvenanceEventInput
): ProvenanceEvent {
  return {
    id: crypto.randomUUID(),
    eventType: input.eventType,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    actorAccountId: input.actorAccountId ?? null,
    studioHandle: input.studioHandle ?? null,
    ownershipId: input.ownershipId ?? null,
    certificateId: input.certificateId ?? null,
    mediaAssetId: input.mediaAssetId ?? null,
    receiptId: input.receiptId ?? null,
    previousEventId: input.previousEventId ?? null,
    metadata: input.metadata ?? {},
    occurredAt: new Date().toISOString(),
  };
}

// ── Append-only chain helpers ────────────────────────────────────────

/**
 * Validates that a new event correctly references the previous event
 * in a chain for a given subject.
 */
export function isValidChainAppend(
  chain: readonly ProvenanceEvent[],
  newEvent: ProvenanceEvent
): boolean {
  if (chain.length === 0) {
    return newEvent.previousEventId === null;
  }

  const lastEvent = chain[chain.length - 1]!;
  return (
    newEvent.previousEventId === lastEvent.id &&
    newEvent.subjectType === lastEvent.subjectType &&
    newEvent.subjectId === lastEvent.subjectId
  );
}

/**
 * Builds an ordered chain of provenance events for a subject,
 * following the `previousEventId` links.
 */
export function buildProvenanceChain(
  events: readonly ProvenanceEvent[],
  subjectType: ProvenanceSubjectType,
  subjectId: string
): ProvenanceEvent[] {
  const subjectEvents = events.filter(
    (e) => e.subjectType === subjectType && e.subjectId === subjectId
  );

  if (subjectEvents.length === 0) return [];

  // Find the root (no previous event)
  const root = subjectEvents.find((e) => e.previousEventId === null);
  if (!root) return [];

  const byPrevId = new Map<string, ProvenanceEvent>();
  for (const e of subjectEvents) {
    if (e.previousEventId) {
      byPrevId.set(e.previousEventId, e);
    }
  }

  const chain: ProvenanceEvent[] = [root];
  let current = root;
  while (byPrevId.has(current.id)) {
    current = byPrevId.get(current.id)!;
    chain.push(current);
  }

  return chain;
}

/**
 * True when the event type represents an ownership change.
 */
export function isOwnershipEvent(eventType: ProvenanceEventType): boolean {
  return (
    eventType === "collected" ||
    eventType === "transferred" ||
    eventType === "resold" ||
    eventType === "revoked" ||
    eventType === "refunded"
  );
}

/**
 * True when the event type represents a certificate action.
 */
export function isCertificateEvent(eventType: ProvenanceEventType): boolean {
  return (
    eventType === "certificate_issued" ||
    eventType === "certificate_revoked" ||
    eventType === "certificate_transferred"
  );
}
