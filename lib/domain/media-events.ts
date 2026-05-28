/**
 * Sprint 0.3 — Media event factories.
 *
 * Pure functions producing `{analytics, audit}` tuples for every
 * media-pipeline action, following the pattern established by
 * `identity-events.ts` in Sprint 0.2.
 */

import type { AnalyticsEventName } from "./analytics-events";
import type { AuditLogInput } from "./audit-log";
import type { MediaKind, MediaOwnerType } from "./media-asset";

export type MediaAnalyticsPayload = {
  event: AnalyticsEventName;
  properties: Record<string, unknown>;
  timestamp: string;
};

export type MediaEventPair = {
  analytics: MediaAnalyticsPayload;
  audit: AuditLogInput;
};

function ts(): string {
  return new Date().toISOString();
}

// ── Media selection ──────────────────────────────────────────────────

export function mediaSelected(p: {
  accountId: string;
  assetId: string;
  kind: MediaKind;
  ownerType: MediaOwnerType;
  ownerId: string;
  mimeType: string;
  fileSizeBytes: number;
  ip: string | null;
}): MediaEventPair {
  return {
    analytics: {
      event: "media.selected",
      properties: {
        assetId: p.assetId,
        kind: p.kind,
        ownerType: p.ownerType,
        mimeType: p.mimeType,
        fileSizeBytes: p.fileSizeBytes,
      },
      timestamp: ts(),
    },
    audit: {
      action: "media.uploaded",
      actorId: p.accountId,
      actorType: "user",
      targetType: "media",
      targetId: p.assetId,
      metadata: {
        phase: "selected",
        kind: p.kind,
        ownerType: p.ownerType,
        ownerId: p.ownerId,
        mimeType: p.mimeType,
        fileSizeBytes: p.fileSizeBytes,
      },
      ipAddress: p.ip,
    },
  };
}

// ── Preview generated ────────────────────────────────────────────────

export function mediaPreviewGenerated(p: {
  accountId: string;
  assetId: string;
  kind: MediaKind;
  ip: string | null;
}): MediaEventPair {
  return {
    analytics: {
      event: "media.preview.generated",
      properties: { assetId: p.assetId, kind: p.kind },
      timestamp: ts(),
    },
    audit: {
      action: "media.uploaded",
      actorId: p.accountId,
      actorType: "user",
      targetType: "media",
      targetId: p.assetId,
      metadata: { phase: "preview_generated", kind: p.kind },
      ipAddress: p.ip,
    },
  };
}

// ── Upload started ───────────────────────────────────────────────────

export function mediaUploadStarted(p: {
  accountId: string;
  assetId: string;
  bucket: string;
  fileSizeBytes: number;
  ip: string | null;
}): MediaEventPair {
  return {
    analytics: {
      event: "media.upload.started",
      properties: {
        assetId: p.assetId,
        bucket: p.bucket,
        fileSizeBytes: p.fileSizeBytes,
      },
      timestamp: ts(),
    },
    audit: {
      action: "media.uploaded",
      actorId: p.accountId,
      actorType: "user",
      targetType: "media",
      targetId: p.assetId,
      metadata: { phase: "upload_started", bucket: p.bucket },
      ipAddress: p.ip,
    },
  };
}

// ── Upload completed ─────────────────────────────────────────────────

export function mediaUploadCompleted(p: {
  accountId: string;
  assetId: string;
  storagePath: string;
  bucket: string;
  ip: string | null;
}): MediaEventPair {
  return {
    analytics: {
      event: "media.upload.completed",
      properties: {
        assetId: p.assetId,
        storagePath: p.storagePath,
        bucket: p.bucket,
      },
      timestamp: ts(),
    },
    audit: {
      action: "media.uploaded",
      actorId: p.accountId,
      actorType: "user",
      targetType: "media",
      targetId: p.assetId,
      metadata: {
        phase: "upload_completed",
        storagePath: p.storagePath,
        bucket: p.bucket,
      },
      ipAddress: p.ip,
    },
  };
}

// ── Processing started ───────────────────────────────────────────────

export function mediaProcessingStarted(p: {
  accountId: string;
  assetId: string;
  ip: string | null;
}): MediaEventPair {
  return {
    analytics: {
      event: "media.processing.started",
      properties: { assetId: p.assetId },
      timestamp: ts(),
    },
    audit: {
      action: "media.uploaded",
      actorId: p.accountId,
      actorType: "user",
      targetType: "media",
      targetId: p.assetId,
      metadata: { phase: "processing_started" },
      ipAddress: p.ip,
    },
  };
}

// ── Processing completed ─────────────────────────────────────────────

export function mediaProcessingCompleted(p: {
  accountId: string;
  assetId: string;
  variantCount: number;
  ip: string | null;
}): MediaEventPair {
  return {
    analytics: {
      event: "media.processing.completed",
      properties: {
        assetId: p.assetId,
        variantCount: p.variantCount,
      },
      timestamp: ts(),
    },
    audit: {
      action: "media.uploaded",
      actorId: p.accountId,
      actorType: "user",
      targetType: "media",
      targetId: p.assetId,
      metadata: { phase: "processing_completed", variantCount: p.variantCount },
      ipAddress: p.ip,
    },
  };
}

// ── Processing failed ────────────────────────────────────────────────

export function mediaProcessingFailed(p: {
  accountId: string;
  assetId: string;
  error: string;
  retryCount: number;
  ip: string | null;
}): MediaEventPair {
  return {
    analytics: {
      event: "media.processing.failed",
      properties: {
        assetId: p.assetId,
        error: p.error,
        retryCount: p.retryCount,
      },
      timestamp: ts(),
    },
    audit: {
      action: "media.processing_failed",
      actorId: p.accountId,
      actorType: "user",
      targetType: "media",
      targetId: p.assetId,
      metadata: { error: p.error, retryCount: p.retryCount },
      ipAddress: p.ip,
    },
  };
}

// ── Final asset displayed ────────────────────────────────────────────

export function mediaFinalAssetDisplayed(p: {
  accountId: string;
  assetId: string;
  variantKind: string;
}): MediaEventPair {
  return {
    analytics: {
      event: "media.final_asset.displayed",
      properties: { assetId: p.assetId, variantKind: p.variantKind },
      timestamp: ts(),
    },
    audit: {
      action: "media.uploaded",
      actorId: p.accountId,
      actorType: "user",
      targetType: "media",
      targetId: p.assetId,
      metadata: { phase: "final_displayed", variantKind: p.variantKind },
      ipAddress: null,
    },
  };
}

// ── Media replaced ───────────────────────────────────────────────────

export function mediaReplaced(p: {
  accountId: string;
  oldAssetId: string;
  newAssetId: string;
  ownerType: MediaOwnerType;
  ownerId: string;
  ip: string | null;
}): MediaEventPair {
  return {
    analytics: {
      event: "media.upload.completed",
      properties: {
        assetId: p.newAssetId,
        replacedAssetId: p.oldAssetId,
        ownerType: p.ownerType,
      },
      timestamp: ts(),
    },
    audit: {
      action: "media.replaced",
      actorId: p.accountId,
      actorType: "user",
      targetType: "media",
      targetId: p.newAssetId,
      metadata: {
        replacedAssetId: p.oldAssetId,
        ownerType: p.ownerType,
        ownerId: p.ownerId,
      },
      ipAddress: p.ip,
    },
  };
}

// ── Media deleted ────────────────────────────────────────────────────

export function mediaDeleted(p: {
  accountId: string;
  assetId: string;
  storagePath: string;
  bucket: string;
  ip: string | null;
}): MediaEventPair {
  return {
    analytics: {
      event: "media.uploaded",
      properties: {
        assetId: p.assetId,
        action: "deleted",
        bucket: p.bucket,
      },
      timestamp: ts(),
    },
    audit: {
      action: "media.deleted",
      actorId: p.accountId,
      actorType: "user",
      targetType: "media",
      targetId: p.assetId,
      metadata: { storagePath: p.storagePath, bucket: p.bucket },
      ipAddress: p.ip,
    },
  };
}

// ── Drop/post media attachment ───────────────────────────────────────

export function dropMediaAttached(p: {
  accountId: string;
  dropId: string;
  assetId: string;
  kind: MediaKind;
  ip: string | null;
}): MediaEventPair {
  return {
    analytics: {
      event: "drop.media.attached",
      properties: {
        dropId: p.dropId,
        assetId: p.assetId,
        kind: p.kind,
      },
      timestamp: ts(),
    },
    audit: {
      action: "drop.media_attached",
      actorId: p.accountId,
      actorType: "user",
      targetType: "drop",
      targetId: p.dropId,
      metadata: { assetId: p.assetId, kind: p.kind },
      ipAddress: p.ip,
    },
  };
}

export function postMediaAttached(p: {
  accountId: string;
  postId: string;
  assetId: string;
  kind: MediaKind;
  ip: string | null;
}): MediaEventPair {
  return {
    analytics: {
      event: "post.media.attached",
      properties: {
        postId: p.postId,
        assetId: p.assetId,
        kind: p.kind,
      },
      timestamp: ts(),
    },
    audit: {
      action: "post.media_attached",
      actorId: p.accountId,
      actorType: "user",
      targetType: "post",
      targetId: p.postId,
      metadata: { assetId: p.assetId, kind: p.kind },
      ipAddress: p.ip,
    },
  };
}
