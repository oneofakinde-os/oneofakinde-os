import assert from "node:assert/strict";
import test from "node:test";
import {
  MEDIA_KINDS,
  MEDIA_LIFECYCLE_STATUSES,
  MEDIA_VARIANT_KINDS,
  MEDIA_OWNER_TYPES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_RETRY_COUNT,
  canTransition,
  getAllowedTransitions,
  isTerminalStatus,
  isRetryableStatus,
  isAllowedMimeType,
  getMediaKindFromMime,
  isAllowedMimeForKind,
  isWithinSizeLimit,
  buildStoragePath,
  isValidStoragePath,
  createMediaAsset,
  transitionMediaAsset,
  resolveDisplayUrl,
  resolvePosterUrl,
  isMediaInProgress,
  canRetry,
} from "../../lib/domain/media-asset";

// ── Constants ────────────────────────────────────────────────────────

test("proof: MEDIA_KINDS has 4 kinds", () => {
  assert.equal(MEDIA_KINDS.length, 4);
  for (const k of ["image", "video", "audio", "document"]) {
    assert.ok((MEDIA_KINDS as readonly string[]).includes(k), `missing kind: ${k}`);
  }
});

test("proof: MEDIA_LIFECYCLE_STATUSES has 8 statuses", () => {
  assert.equal(MEDIA_LIFECYCLE_STATUSES.length, 8);
  const expected = [
    "selected", "preview_ready", "uploading", "uploaded",
    "processing", "ready", "failed", "retrying",
  ];
  for (const s of expected) {
    assert.ok((MEDIA_LIFECYCLE_STATUSES as readonly string[]).includes(s), `missing: ${s}`);
  }
});

test("proof: MEDIA_VARIANT_KINDS has 6 variants", () => {
  assert.equal(MEDIA_VARIANT_KINDS.length, 6);
  const expected = [
    "original", "optimized", "preview", "thumbnail", "poster_frame", "waveform",
  ];
  for (const v of expected) {
    assert.ok((MEDIA_VARIANT_KINDS as readonly string[]).includes(v), `missing: ${v}`);
  }
});

test("proof: MEDIA_OWNER_TYPES has 6 owner types", () => {
  assert.equal(MEDIA_OWNER_TYPES.length, 6);
  for (const t of ["drop", "post", "profile", "studio", "world", "certificate"]) {
    assert.ok((MEDIA_OWNER_TYPES as readonly string[]).includes(t), `missing: ${t}`);
  }
});

// ── Lifecycle transitions ────────────────────────────────────────────

test("proof: allowed lifecycle transitions match state machine", () => {
  // selected can go to preview_ready, uploading, failed
  assert.equal(canTransition("selected", "preview_ready"), true);
  assert.equal(canTransition("selected", "uploading"), true);
  assert.equal(canTransition("selected", "failed"), true);
  assert.equal(canTransition("selected", "ready"), false);

  // preview_ready → uploading, failed
  assert.equal(canTransition("preview_ready", "uploading"), true);
  assert.equal(canTransition("preview_ready", "failed"), true);
  assert.equal(canTransition("preview_ready", "ready"), false);

  // uploading → uploaded, failed, retrying
  assert.equal(canTransition("uploading", "uploaded"), true);
  assert.equal(canTransition("uploading", "failed"), true);
  assert.equal(canTransition("uploading", "retrying"), true);
  assert.equal(canTransition("uploading", "ready"), false);

  // uploaded → processing, ready, failed
  assert.equal(canTransition("uploaded", "processing"), true);
  assert.equal(canTransition("uploaded", "ready"), true);
  assert.equal(canTransition("uploaded", "failed"), true);

  // processing → ready, failed
  assert.equal(canTransition("processing", "ready"), true);
  assert.equal(canTransition("processing", "failed"), true);
  assert.equal(canTransition("processing", "uploading"), false);

  // ready is terminal
  assert.equal(canTransition("ready", "failed"), false);
  assert.equal(canTransition("ready", "selected"), false);

  // failed → retrying, selected
  assert.equal(canTransition("failed", "retrying"), true);
  assert.equal(canTransition("failed", "selected"), true);
  assert.equal(canTransition("failed", "ready"), false);

  // retrying → uploading, failed
  assert.equal(canTransition("retrying", "uploading"), true);
  assert.equal(canTransition("retrying", "failed"), true);
});

test("proof: denied transitions are blocked", () => {
  assert.equal(canTransition("ready", "uploading"), false);
  assert.equal(canTransition("selected", "ready"), false);
  assert.equal(canTransition("preview_ready", "processing"), false);
  assert.equal(canTransition("uploading", "selected"), false);
});

test("proof: getAllowedTransitions returns correct next states", () => {
  const fromSelected = getAllowedTransitions("selected");
  assert.ok(fromSelected.includes("preview_ready"));
  assert.ok(fromSelected.includes("uploading"));
  assert.ok(fromSelected.includes("failed"));
  assert.equal(fromSelected.length, 3);

  const fromReady = getAllowedTransitions("ready");
  assert.equal(fromReady.length, 0);
});

test("proof: isTerminalStatus only true for ready", () => {
  assert.equal(isTerminalStatus("ready"), true);
  assert.equal(isTerminalStatus("failed"), false);
  assert.equal(isTerminalStatus("selected"), false);
  assert.equal(isTerminalStatus("uploading"), false);
});

test("proof: isRetryableStatus only true for failed", () => {
  assert.equal(isRetryableStatus("failed"), true);
  assert.equal(isRetryableStatus("ready"), false);
  assert.equal(isRetryableStatus("selected"), false);
});

// ── MIME validation ──────────────────────────────────────────────────

test("proof: common MIME types are allowed", () => {
  assert.equal(isAllowedMimeType("image/jpeg"), true);
  assert.equal(isAllowedMimeType("image/png"), true);
  assert.equal(isAllowedMimeType("image/webp"), true);
  assert.equal(isAllowedMimeType("video/mp4"), true);
  assert.equal(isAllowedMimeType("audio/mpeg"), true);
  assert.equal(isAllowedMimeType("application/pdf"), true);
});

test("proof: unsupported MIME types are rejected", () => {
  assert.equal(isAllowedMimeType("application/json"), false);
  assert.equal(isAllowedMimeType("text/html"), false);
  assert.equal(isAllowedMimeType("application/zip"), false);
  assert.equal(isAllowedMimeType(""), false);
});

test("proof: getMediaKindFromMime resolves correctly", () => {
  assert.equal(getMediaKindFromMime("image/jpeg"), "image");
  assert.equal(getMediaKindFromMime("video/mp4"), "video");
  assert.equal(getMediaKindFromMime("audio/mpeg"), "audio");
  assert.equal(getMediaKindFromMime("application/pdf"), "document");
  assert.equal(getMediaKindFromMime("text/plain"), null);
});

test("proof: isAllowedMimeForKind validates kind-specific MIME", () => {
  assert.equal(isAllowedMimeForKind("image", "image/jpeg"), true);
  assert.equal(isAllowedMimeForKind("image", "video/mp4"), false);
  assert.equal(isAllowedMimeForKind("video", "video/mp4"), true);
  assert.equal(isAllowedMimeForKind("audio", "audio/mpeg"), true);
  assert.equal(isAllowedMimeForKind("document", "application/pdf"), true);
  assert.equal(isAllowedMimeForKind("document", "image/png"), false);
});

// ── File size limits ─────────────────────────────────────────────────

test("proof: file size limits match Supabase bucket configuration", () => {
  assert.equal(MAX_FILE_SIZE_BYTES.drop, 52_428_800);
  assert.equal(MAX_FILE_SIZE_BYTES.profile, 5_242_880);
  assert.equal(MAX_FILE_SIZE_BYTES.world, 20_971_520);
});

test("proof: isWithinSizeLimit validates correctly", () => {
  assert.equal(isWithinSizeLimit("drop", 1000), true);
  assert.equal(isWithinSizeLimit("drop", 52_428_800), true);
  assert.equal(isWithinSizeLimit("drop", 52_428_801), false);
  assert.equal(isWithinSizeLimit("profile", 5_242_881), false);
  assert.equal(isWithinSizeLimit("drop", 0), false);
  assert.equal(isWithinSizeLimit("drop", -1), false);
});

// ── Storage path ─────────────────────────────────────────────────────

test("proof: buildStoragePath prefixes with account ID", () => {
  assert.equal(buildStoragePath("acc_01", "photo.jpg"), "acc_01/photo.jpg");
});

test("proof: isValidStoragePath validates format", () => {
  assert.equal(isValidStoragePath("acc_01/photo.jpg"), true);
  assert.equal(isValidStoragePath("acc_01/sub/photo.jpg"), true);
  assert.equal(isValidStoragePath(""), false);
  assert.equal(isValidStoragePath("../escape"), false);
  assert.equal(isValidStoragePath("no-slash"), false);
  assert.equal(isValidStoragePath("a/" + "x".repeat(600)), false);
});

// ── createMediaAsset factory ─────────────────────────────────────────

test("proof: createMediaAsset returns valid asset for allowed file", () => {
  const result = createMediaAsset({
    accountId: "acc_01",
    ownerType: "drop",
    ownerId: "drop_01",
    file: { name: "photo.jpg", type: "image/jpeg", size: 1024 },
    storageBucket: "drop-media",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.asset.id);
    assert.equal(result.asset.accountId, "acc_01");
    assert.equal(result.asset.kind, "image");
    assert.equal(result.asset.status, "selected");
    assert.equal(result.asset.originalFileName, "photo.jpg");
    assert.equal(result.asset.retryCount, 0);
    assert.equal(result.asset.variants.length, 0);
  }
});

test("proof: createMediaAsset with localPreviewUrl starts as preview_ready", () => {
  const result = createMediaAsset({
    accountId: "acc_01",
    ownerType: "drop",
    ownerId: "drop_01",
    file: { name: "photo.jpg", type: "image/jpeg", size: 1024 },
    storageBucket: "drop-media",
    localPreviewUrl: "blob:http://localhost/abc",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.asset.status, "preview_ready");
    assert.equal(result.asset.localPreviewUrl, "blob:http://localhost/abc");
  }
});

test("proof: createMediaAsset rejects unsupported MIME type", () => {
  const result = createMediaAsset({
    accountId: "acc_01",
    ownerType: "drop",
    ownerId: "drop_01",
    file: { name: "virus.exe", type: "application/x-msdownload", size: 1024 },
    storageBucket: "drop-media",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /unsupported_mime_type/);
});

test("proof: createMediaAsset rejects file exceeding size limit", () => {
  const result = createMediaAsset({
    accountId: "acc_01",
    ownerType: "profile",
    ownerId: "prof_01",
    file: { name: "huge.jpg", type: "image/jpeg", size: 100_000_000 },
    storageBucket: "avatars",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /file_too_large/);
});

// ── transitionMediaAsset ─────────────────────────────────────────────

test("proof: transitionMediaAsset allows valid transition", () => {
  const create = createMediaAsset({
    accountId: "acc_01",
    ownerType: "drop",
    ownerId: "drop_01",
    file: { name: "photo.jpg", type: "image/jpeg", size: 1024 },
    storageBucket: "drop-media",
  });
  assert.equal(create.ok, true);
  if (!create.ok) return;

  const transition = transitionMediaAsset(create.asset, "uploading");
  assert.equal(transition.ok, true);
  if (transition.ok) {
    assert.equal(transition.asset.status, "uploading");
    assert.ok(transition.asset.updatedAt);
  }
});

test("proof: transitionMediaAsset rejects invalid transition", () => {
  const create = createMediaAsset({
    accountId: "acc_01",
    ownerType: "drop",
    ownerId: "drop_01",
    file: { name: "photo.jpg", type: "image/jpeg", size: 1024 },
    storageBucket: "drop-media",
  });
  assert.equal(create.ok, true);
  if (!create.ok) return;

  const transition = transitionMediaAsset(create.asset, "ready");
  assert.equal(transition.ok, false);
  if (!transition.ok) assert.match(transition.reason, /invalid_transition/);
});

test("proof: transitionMediaAsset increments retryCount on retrying", () => {
  const create = createMediaAsset({
    accountId: "acc_01",
    ownerType: "drop",
    ownerId: "drop_01",
    file: { name: "photo.jpg", type: "image/jpeg", size: 1024 },
    storageBucket: "drop-media",
  });
  assert.equal(create.ok, true);
  if (!create.ok) return;

  // selected → uploading → failed → retrying
  let asset = create.asset;
  const t1 = transitionMediaAsset(asset, "uploading");
  assert.equal(t1.ok, true);
  if (!t1.ok) return;
  asset = t1.asset;

  const t2 = transitionMediaAsset(asset, "failed", { lastError: "network_timeout" });
  assert.equal(t2.ok, true);
  if (!t2.ok) return;
  asset = t2.asset;
  assert.equal(asset.lastError, "network_timeout");
  assert.equal(asset.retryCount, 0);

  const t3 = transitionMediaAsset(asset, "retrying");
  assert.equal(t3.ok, true);
  if (!t3.ok) return;
  assert.equal(t3.asset.retryCount, 1);
  assert.equal(t3.asset.lastError, undefined);
});

test("proof: transitionMediaAsset can apply storagePath and variants", () => {
  const create = createMediaAsset({
    accountId: "acc_01",
    ownerType: "drop",
    ownerId: "drop_01",
    file: { name: "photo.jpg", type: "image/jpeg", size: 1024 },
    storageBucket: "drop-media",
  });
  assert.equal(create.ok, true);
  if (!create.ok) return;

  const t1 = transitionMediaAsset(create.asset, "uploading");
  assert.equal(t1.ok, true);
  if (!t1.ok) return;

  const t2 = transitionMediaAsset(t1.asset, "uploaded", {
    storagePath: "acc_01/photo.jpg",
  });
  assert.equal(t2.ok, true);
  if (!t2.ok) return;
  assert.equal(t2.asset.storagePath, "acc_01/photo.jpg");
});

// ── Preview helpers ──────────────────────────────────────────────────

test("proof: resolveDisplayUrl prefers optimized variant", () => {
  const create = createMediaAsset({
    accountId: "acc_01",
    ownerType: "drop",
    ownerId: "drop_01",
    file: { name: "photo.jpg", type: "image/jpeg", size: 1024 },
    storageBucket: "drop-media",
    localPreviewUrl: "blob:local",
  });
  assert.equal(create.ok, true);
  if (!create.ok) return;

  // With only local preview
  assert.equal(resolveDisplayUrl(create.asset), "blob:local");

  // With variants
  const withVariants = {
    ...create.asset,
    variants: [
      { kind: "thumbnail" as const, url: "https://cdn/thumb.jpg", storagePath: "t", mimeType: "image/jpeg", fileSizeBytes: 100 },
      { kind: "optimized" as const, url: "https://cdn/opt.jpg", storagePath: "o", mimeType: "image/jpeg", fileSizeBytes: 500 },
    ],
  };
  assert.equal(resolveDisplayUrl(withVariants), "https://cdn/opt.jpg");
});

test("proof: resolvePosterUrl returns poster_frame or thumbnail", () => {
  const create = createMediaAsset({
    accountId: "acc_01",
    ownerType: "drop",
    ownerId: "drop_01",
    file: { name: "video.mp4", type: "video/mp4", size: 1024 },
    storageBucket: "drop-media",
  });
  assert.equal(create.ok, true);
  if (!create.ok) return;

  assert.equal(resolvePosterUrl(create.asset), null);

  const withPoster = {
    ...create.asset,
    variants: [
      { kind: "poster_frame" as const, url: "https://cdn/poster.jpg", storagePath: "p", mimeType: "image/jpeg", fileSizeBytes: 100 },
    ],
  };
  assert.equal(resolvePosterUrl(withPoster), "https://cdn/poster.jpg");
});

test("proof: isMediaInProgress is true for active statuses", () => {
  assert.equal(isMediaInProgress({ status: "uploading" } as never), true);
  assert.equal(isMediaInProgress({ status: "processing" } as never), true);
  assert.equal(isMediaInProgress({ status: "retrying" } as never), true);
  assert.equal(isMediaInProgress({ status: "uploaded" } as never), true);
  assert.equal(isMediaInProgress({ status: "ready" } as never), false);
  assert.equal(isMediaInProgress({ status: "failed" } as never), false);
  assert.equal(isMediaInProgress({ status: "selected" } as never), false);
});

test("proof: canRetry respects MAX_RETRY_COUNT", () => {
  assert.equal(MAX_RETRY_COUNT, 3);
  assert.equal(canRetry({ status: "failed", retryCount: 0 } as never), true);
  assert.equal(canRetry({ status: "failed", retryCount: 2 } as never), true);
  assert.equal(canRetry({ status: "failed", retryCount: 3 } as never), false);
  assert.equal(canRetry({ status: "ready", retryCount: 0 } as never), false);
});

// ── Full lifecycle walk ──────────────────────────────────────────────

test("proof: full lifecycle walk — selected → preview_ready → uploading → uploaded → processing → ready", () => {
  const create = createMediaAsset({
    accountId: "acc_01",
    ownerType: "drop",
    ownerId: "drop_01",
    file: { name: "photo.jpg", type: "image/jpeg", size: 1024 },
    storageBucket: "drop-media",
    localPreviewUrl: "blob:local",
  });
  assert.equal(create.ok, true);
  if (!create.ok) return;
  assert.equal(create.asset.status, "preview_ready");

  const steps: Array<{ to: "uploading" | "uploaded" | "processing" | "ready" }> = [
    { to: "uploading" },
    { to: "uploaded" },
    { to: "processing" },
    { to: "ready" },
  ];

  let asset = create.asset;
  for (const step of steps) {
    const result = transitionMediaAsset(asset, step.to);
    assert.equal(result.ok, true, `failed at transition to ${step.to}`);
    if (!result.ok) return;
    asset = result.asset;
    assert.equal(asset.status, step.to);
  }

  assert.equal(isTerminalStatus(asset.status), true);
});

test("proof: retry lifecycle — selected → uploading → failed → retrying → uploading → uploaded → ready", () => {
  const create = createMediaAsset({
    accountId: "acc_01",
    ownerType: "drop",
    ownerId: "drop_01",
    file: { name: "track.mp3", type: "audio/mpeg", size: 2048 },
    storageBucket: "drop-media",
  });
  assert.equal(create.ok, true);
  if (!create.ok) return;

  let asset = create.asset;
  const t1 = transitionMediaAsset(asset, "uploading");
  assert.ok(t1.ok);
  if (!t1.ok) return;
  asset = t1.asset;

  const t2 = transitionMediaAsset(asset, "failed", { lastError: "timeout" });
  assert.ok(t2.ok);
  if (!t2.ok) return;
  asset = t2.asset;
  assert.equal(canRetry(asset), true);

  const t3 = transitionMediaAsset(asset, "retrying");
  assert.ok(t3.ok);
  if (!t3.ok) return;
  asset = t3.asset;
  assert.equal(asset.retryCount, 1);

  const t4 = transitionMediaAsset(asset, "uploading");
  assert.ok(t4.ok);
  if (!t4.ok) return;
  asset = t4.asset;

  const t5 = transitionMediaAsset(asset, "uploaded");
  assert.ok(t5.ok);
  if (!t5.ok) return;
  asset = t5.asset;

  const t6 = transitionMediaAsset(asset, "ready");
  assert.ok(t6.ok);
  if (!t6.ok) return;
  assert.equal(t6.asset.status, "ready");
});
