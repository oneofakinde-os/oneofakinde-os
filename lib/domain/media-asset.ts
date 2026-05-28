/**
 * Sprint 0.3 — MediaAsset domain model.
 *
 * Defines the contract for every media file managed by oneofakinde:
 * drop media, post attachments, avatars, banners, world covers, and
 * certificates. Each MediaAsset tracks its lifecycle from file
 * selection through processing to a final ready state, with separate
 * variant records for thumbnail/preview/optimized/original forms.
 *
 * This is a domain-layer scaffold — no I/O. A future `bff_media_assets`
 * migration will back it with a PostgreSQL table when the platform
 * needs server-side media queries (Sprint 0.5+). Until then, the
 * client-side `use-progressive-upload` hook drives the lifecycle and
 * the existing Supabase Storage layer handles bytes.
 */

// ── Media kinds ──────────────────────────────────────────────────────

export const MEDIA_KINDS = [
  "image",
  "video",
  "audio",
  "document",
] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];

// ── Media lifecycle statuses ─────────────────────────────────────────

export const MEDIA_LIFECYCLE_STATUSES = [
  "selected",
  "preview_ready",
  "uploading",
  "uploaded",
  "processing",
  "ready",
  "failed",
  "retrying",
] as const;

export type MediaLifecycleStatus = (typeof MEDIA_LIFECYCLE_STATUSES)[number];

/**
 * State machine: allowed transitions.
 *
 *   selected      → preview_ready | uploading | failed
 *   preview_ready → uploading | failed
 *   uploading     → uploaded | failed | retrying
 *   uploaded      → processing | ready | failed
 *   processing    → ready | failed
 *   ready         → (terminal)
 *   failed        → retrying | selected
 *   retrying      → uploading | failed
 */
const ALLOWED_TRANSITIONS: Record<MediaLifecycleStatus, ReadonlySet<MediaLifecycleStatus>> = {
  selected:      new Set(["preview_ready", "uploading", "failed"]),
  preview_ready: new Set(["uploading", "failed"]),
  uploading:     new Set(["uploaded", "failed", "retrying"]),
  uploaded:      new Set(["processing", "ready", "failed"]),
  processing:    new Set(["ready", "failed"]),
  ready:         new Set([]),
  failed:        new Set(["retrying", "selected"]),
  retrying:      new Set(["uploading", "failed"]),
};

export function canTransition(
  from: MediaLifecycleStatus,
  to: MediaLifecycleStatus
): boolean {
  return ALLOWED_TRANSITIONS[from]?.has(to) ?? false;
}

export function getAllowedTransitions(
  status: MediaLifecycleStatus
): readonly MediaLifecycleStatus[] {
  return [...(ALLOWED_TRANSITIONS[status] ?? [])];
}

export function isTerminalStatus(status: MediaLifecycleStatus): boolean {
  return status === "ready";
}

export function isRetryableStatus(status: MediaLifecycleStatus): boolean {
  return status === "failed";
}

// ── Media variant ────────────────────────────────────────────────────

export const MEDIA_VARIANT_KINDS = [
  "original",
  "optimized",
  "preview",
  "thumbnail",
  "poster_frame",
  "waveform",
] as const;

export type MediaVariantKind = (typeof MEDIA_VARIANT_KINDS)[number];

export type MediaVariant = {
  kind: MediaVariantKind;
  url: string;
  storagePath: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationMs?: number;
  fileSizeBytes: number;
};

// ── Media owner context ──────────────────────────────────────────────

export const MEDIA_OWNER_TYPES = [
  "drop",
  "post",
  "profile",
  "studio",
  "world",
  "certificate",
] as const;

export type MediaOwnerType = (typeof MEDIA_OWNER_TYPES)[number];

// ── MediaAsset contract ──────────────────────────────────────────────

export type MediaAsset = {
  id: string;
  accountId: string;
  ownerType: MediaOwnerType;
  ownerId: string;
  kind: MediaKind;
  status: MediaLifecycleStatus;
  originalFileName: string;
  originalMimeType: string;
  originalFileSizeBytes: number;
  variants: MediaVariant[];
  /** Local preview data URI (blob: or data:) — client-side only, never persisted. */
  localPreviewUrl?: string;
  /** Number of upload/processing retries attempted. */
  retryCount: number;
  /** Last error message if status is "failed". */
  lastError?: string;
  /** Storage bucket where the original was uploaded. */
  storageBucket: string;
  /** Path inside the bucket. */
  storagePath?: string;
  /** ISO timestamp when the asset was first selected. */
  createdAt: string;
  /** ISO timestamp of the last status change. */
  updatedAt: string;
};

// ── MIME validation ──────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES: Record<MediaKind, ReadonlySet<string>> = {
  image: new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
  ]),
  video: new Set([
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ]),
  audio: new Set([
    "audio/mpeg",
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
  ]),
  document: new Set([
    "application/pdf",
  ]),
};

const ALL_ALLOWED_MIMES = new Set(
  Object.values(ALLOWED_MIME_TYPES).flatMap((s) => [...s])
);

export function isAllowedMimeType(mimeType: string): boolean {
  return ALL_ALLOWED_MIMES.has(mimeType);
}

export function getMediaKindFromMime(mimeType: string): MediaKind | null {
  for (const [kind, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (mimes.has(mimeType)) {
      return kind as MediaKind;
    }
  }
  return null;
}

export function isAllowedMimeForKind(kind: MediaKind, mimeType: string): boolean {
  return ALLOWED_MIME_TYPES[kind]?.has(mimeType) ?? false;
}

// ── File size limits ─────────────────────────────────────────────────

export const MAX_FILE_SIZE_BYTES: Record<MediaOwnerType, number> = {
  drop:        52_428_800,   // 50 MB — matches Supabase bucket
  post:        10_485_760,   // 10 MB
  profile:      5_242_880,   //  5 MB — matches avatars bucket
  studio:      10_485_760,   // 10 MB
  world:       20_971_520,   // 20 MB — matches world-media bucket
  certificate: 10_485_760,   // 10 MB
};

export function isWithinSizeLimit(
  ownerType: MediaOwnerType,
  fileSizeBytes: number
): boolean {
  return fileSizeBytes > 0 && fileSizeBytes <= MAX_FILE_SIZE_BYTES[ownerType];
}

// ── Storage path builder ─────────────────────────────────────────────

const STORAGE_PATH_PATTERN = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.\-/]+$/;

export function buildStoragePath(
  accountId: string,
  fileName: string
): string {
  return `${accountId}/${fileName}`;
}

export function isValidStoragePath(path: string): boolean {
  if (!path || path.length > 512) return false;
  if (path.includes("..")) return false;
  return STORAGE_PATH_PATTERN.test(path);
}

// ── MediaAsset factory ───────────────────────────────────────────────

export type CreateMediaAssetInput = {
  accountId: string;
  ownerType: MediaOwnerType;
  ownerId: string;
  file: {
    name: string;
    type: string;
    size: number;
  };
  storageBucket: string;
  localPreviewUrl?: string;
};

export type CreateMediaAssetResult =
  | { ok: true; asset: MediaAsset }
  | { ok: false; reason: string };

export function createMediaAsset(
  input: CreateMediaAssetInput
): CreateMediaAssetResult {
  const kind = getMediaKindFromMime(input.file.type);
  if (!kind) {
    return { ok: false, reason: `unsupported_mime_type: ${input.file.type}` };
  }

  if (!isWithinSizeLimit(input.ownerType, input.file.size)) {
    const max = MAX_FILE_SIZE_BYTES[input.ownerType];
    return { ok: false, reason: `file_too_large: max ${max} bytes for ${input.ownerType}` };
  }

  const now = new Date().toISOString();
  const asset: MediaAsset = {
    id: crypto.randomUUID(),
    accountId: input.accountId,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    kind,
    status: input.localPreviewUrl ? "preview_ready" : "selected",
    originalFileName: input.file.name,
    originalMimeType: input.file.type,
    originalFileSizeBytes: input.file.size,
    variants: [],
    localPreviewUrl: input.localPreviewUrl,
    retryCount: 0,
    storageBucket: input.storageBucket,
    createdAt: now,
    updatedAt: now,
  };

  return { ok: true, asset };
}

// ── Lifecycle transition ─────────────────────────────────────────────

export type TransitionResult =
  | { ok: true; asset: MediaAsset }
  | { ok: false; reason: string };

export function transitionMediaAsset(
  asset: MediaAsset,
  to: MediaLifecycleStatus,
  update?: Partial<Pick<MediaAsset, "storagePath" | "lastError" | "variants">>
): TransitionResult {
  if (!canTransition(asset.status, to)) {
    return {
      ok: false,
      reason: `invalid_transition: ${asset.status} → ${to}`,
    };
  }

  const next: MediaAsset = {
    ...asset,
    status: to,
    updatedAt: new Date().toISOString(),
    retryCount: to === "retrying" ? asset.retryCount + 1 : asset.retryCount,
    lastError: to === "failed" ? (update?.lastError ?? asset.lastError) : undefined,
    storagePath: update?.storagePath ?? asset.storagePath,
    variants: update?.variants ?? asset.variants,
  };

  return { ok: true, asset: next };
}

// ── Preview helpers (client-safe) ────────────────────────────────────

/**
 * Returns the best available URL for display, preferring processed
 * variants over local previews, and local previews over nothing.
 */
export function resolveDisplayUrl(asset: MediaAsset): string | null {
  // 1. Ready variant: prefer optimized → preview → thumbnail → original
  const preferenceOrder: MediaVariantKind[] = [
    "optimized",
    "preview",
    "thumbnail",
    "original",
  ];

  for (const kind of preferenceOrder) {
    const variant = asset.variants.find((v) => v.kind === kind);
    if (variant?.url) return variant.url;
  }

  // 2. Local preview (while upload/processing is happening)
  if (asset.localPreviewUrl) return asset.localPreviewUrl;

  return null;
}

/**
 * Returns a poster-frame URL for video/audio assets, or null.
 */
export function resolvePosterUrl(asset: MediaAsset): string | null {
  const poster = asset.variants.find((v) => v.kind === "poster_frame");
  if (poster?.url) return poster.url;

  const thumb = asset.variants.find((v) => v.kind === "thumbnail");
  if (thumb?.url) return thumb.url;

  return null;
}

/**
 * True when the asset is in a state where the UI should show
 * upload/processing activity indicators.
 */
export function isMediaInProgress(asset: MediaAsset): boolean {
  return (
    asset.status === "uploading" ||
    asset.status === "uploaded" ||
    asset.status === "processing" ||
    asset.status === "retrying"
  );
}

/**
 * Maximum number of retries before the asset should be abandoned.
 */
export const MAX_RETRY_COUNT = 3;

export function canRetry(asset: MediaAsset): boolean {
  return asset.status === "failed" && asset.retryCount < MAX_RETRY_COUNT;
}
