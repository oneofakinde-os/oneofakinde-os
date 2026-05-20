import assert from "node:assert/strict";
import test from "node:test";
import {
  validateDraft,
  isPublishIdempotent,
  canRollback,
  rollbackSteps,
  canRetryPublish,
  computeVersionDiff,
  canReschedule,
  reschedule,
  PUBLISH_STEPS_ORDER,
  MAX_PUBLISH_RETRIES,
  AUTO_SAVE_INTERVAL_MS,
  ALT_TEXT_REQUIRED_AT_PUBLISH,
} from "../../lib/domain/authoring-pipeline";
import type { DropDraft, PublishAttempt, PublishRetryEntry, ScheduledDrop } from "../../lib/domain/authoring-pipeline";
import {
  VIDEO_TRANSCODE_PROFILES,
  AUDIO_TRANSCODE_PROFILES,
  DEFAULT_ABR_CONFIG,
  selectImageFormat,
  canRetryEncoding,
  isSupportedVideoFormat,
  isSupportedAudioFormat,
  isSupportedImageFormat,
  isSupportedTextFormat,
  getUploadLimit,
  exceedsUploadLimit,
  uploadProgress,
  UPLOAD_SIZE_LIMITS,
  MAX_ENCODING_RETRIES,
  CDN_REGIONS,
  IMAGE_FORMAT_PRIORITY,
} from "../../lib/domain/content-pipeline";
import type { EncodingJob, ResumableUpload } from "../../lib/domain/content-pipeline";
import {
  computeAnomalyScore,
  isAnomalyFlagged,
  isCreativeCommons,
  CREATIVE_COMMONS_OPTIONS,
  canFileCounterNotice,
  advanceTakedownLifecycle,
  isRepeatInfringer,
  isUnderCounterNoticeStay,
  ANOMALY_THRESHOLD,
  REPEAT_INFRINGER_THRESHOLD,
  CLAIMANT_RESPONSE_WINDOW_DAYS,
  COUNTER_NOTICE_STAY_ACTIVE,
  DRM_OPEN_LICENSE_COMMITMENT,
} from "../../lib/domain/drm-ip-rights";
import type { TakedownRequest, WatchTokenAnomalyScore } from "../../lib/domain/drm-ip-rights";

// ── Authoring Pipeline (AUTH-001 through AUTH-046) ──

const makeDraft = (overrides?: Partial<DropDraft>): DropDraft => ({
  id: "d1",
  studioHandle: "creator",
  accountId: "acc_1",
  status: "in_progress",
  title: "Test Drop",
  description: "desc",
  mode: "watch",
  worldId: "w1",
  altText: "alt text",
  captions: null,
  scheduledAt: null,
  scheduledTimezone: null,
  createdAt: "2026-05-18T00:00:00Z",
  updatedAt: "2026-05-18T00:00:00Z",
  lastAutoSavedAt: null,
  version: 1,
  ...overrides,
});

test("AUTH-001: draft is a durable object with correct fields", () => {
  const draft = makeDraft();
  assert.equal(draft.status, "in_progress");
  assert.ok(draft.id);
  assert.ok(draft.createdAt);
});

test("AUTH-029: pre-publish validation checks", () => {
  const valid = validateDraft(makeDraft(), ["title_present", "mode_selected", "alt_text_present"]);
  assert.ok(valid.passed);

  const invalid = validateDraft(makeDraft({ title: null }), ["title_present"]);
  assert.ok(!invalid.passed);
  assert.equal(invalid.checks[0].message, "title is required");
});

test("AUTH-041: alt-text accessibility gate at publish", () => {
  const noAlt = validateDraft(makeDraft({ altText: null }), ["alt_text_present"]);
  assert.ok(!noAlt.passed);
  assert.ok(ALT_TEXT_REQUIRED_AT_PUBLISH.includes("accessibility gate"));
});

test("AUTH-002.7: publish idempotency guarantee", () => {
  const attempt: PublishAttempt = {
    dropId: "d1",
    idempotencyToken: "tok_1",
    steps: [...PUBLISH_STEPS_ORDER],
    completedSteps: [],
    failedStep: null,
    status: "pending",
    startedAt: "2026-05-18T00:00:00Z",
    completedAt: null,
  };
  assert.ok(isPublishIdempotent(attempt, "tok_1"));
  assert.ok(!isPublishIdempotent(attempt, "tok_2"));
  assert.ok(!isPublishIdempotent(null, "tok_1"));
});

test("AUTH-002.8: failure rollback reverses completed steps", () => {
  const attempt: PublishAttempt = {
    dropId: "d1",
    idempotencyToken: "tok_1",
    steps: [...PUBLISH_STEPS_ORDER],
    completedSteps: ["validation", "transcoding_trigger"],
    failedStep: "ledger_emission",
    status: "failed",
    startedAt: "2026-05-18T00:00:00Z",
    completedAt: null,
  };
  assert.ok(canRollback(attempt));
  const steps = rollbackSteps(attempt);
  assert.deepEqual(steps, ["transcoding_trigger", "validation"]);
});

test("AUTH-030: publish steps have correct order", () => {
  assert.equal(PUBLISH_STEPS_ORDER.length, 5);
  assert.equal(PUBLISH_STEPS_ORDER[0], "validation");
  assert.equal(PUBLISH_STEPS_ORDER[4], "finalize");
});

test("AUTH-031: retry queue respects max retries", () => {
  const entry: PublishRetryEntry = {
    dropId: "d1",
    attemptNumber: 2,
    failedStep: "transcoding_trigger",
    error: "timeout",
    nextRetryAt: "2026-05-18T01:00:00Z",
    status: "pending",
  };
  assert.ok(canRetryPublish(entry));
  assert.ok(!canRetryPublish({ ...entry, attemptNumber: MAX_PUBLISH_RETRIES }));
});

test("AUTH-032: version diff detects changed fields", () => {
  const changed = computeVersionDiff(
    { title: "old", description: "same" },
    { title: "new", description: "same" }
  );
  assert.deepEqual(changed, ["title"]);
});

test("AUTH-037/038: scheduling and rescheduling", () => {
  const scheduled: ScheduledDrop = {
    dropId: "d1",
    scheduledAt: "2026-05-20T10:00:00Z",
    timezone: "America/New_York",
    status: "scheduled",
    originalScheduledAt: null,
  };
  assert.ok(canReschedule(scheduled));
  const rescheduled = reschedule(scheduled, "2026-05-21T10:00:00Z", "America/Chicago");
  assert.equal(rescheduled.status, "rescheduled");
  assert.equal(rescheduled.originalScheduledAt, "2026-05-20T10:00:00Z");
  assert.ok(!canReschedule(rescheduled));
});

test("AUTH-039: auto-save interval is 30 seconds", () => {
  assert.equal(AUTO_SAVE_INTERVAL_MS, 30_000);
});

// ── Content Pipeline (PIPE-001 through PIPE-020) ──

test("PIPE-001/002: video transcode profiles cover standard resolutions", () => {
  assert.equal(VIDEO_TRANSCODE_PROFILES.length, 4);
  assert.equal(VIDEO_TRANSCODE_PROFILES[0].id, "360p");
  assert.equal(VIDEO_TRANSCODE_PROFILES[3].id, "4k");
});

test("PIPE-002: adaptive bitrate config defaults to HLS", () => {
  assert.equal(DEFAULT_ABR_CONFIG.protocol, "hls");
  assert.equal(DEFAULT_ABR_CONFIG.segmentDurationSec, 6);
});

test("PIPE-003: audio transcode profiles include lossless", () => {
  assert.equal(AUDIO_TRANSCODE_PROFILES.length, 4);
  assert.ok(AUDIO_TRANSCODE_PROFILES.some((p) => p.id === "lossless"));
});

test("PIPE-005: image format selection by accept header", () => {
  assert.equal(selectImageFormat("image/avif, image/webp"), "avif");
  assert.equal(selectImageFormat("image/webp"), "webp");
  assert.equal(selectImageFormat("image/jpeg"), "jpeg");
  assert.deepEqual([...IMAGE_FORMAT_PRIORITY], ["avif", "webp", "jpeg"]);
});

test("PIPE-009: encoding job retry limit", () => {
  const job: EncodingJob = {
    id: "j1", dropId: "d1", profile: "720p", status: "failed",
    attempt: 2, maxAttempts: MAX_ENCODING_RETRIES,
    queuedAt: "2026-05-18T00:00:00Z", startedAt: null, completedAt: null, error: "timeout",
  };
  assert.ok(canRetryEncoding(job));
  assert.ok(!canRetryEncoding({ ...job, attempt: MAX_ENCODING_RETRIES }));
});

test("PIPE-015/016/017/018: format support covers all required types", () => {
  assert.ok(isSupportedVideoFormat("mp4"));
  assert.ok(isSupportedVideoFormat("webm"));
  assert.ok(!isSupportedVideoFormat("avi"));
  assert.ok(isSupportedAudioFormat("flac"));
  assert.ok(isSupportedAudioFormat("ogg"));
  assert.ok(isSupportedImageFormat("heic"));
  assert.ok(isSupportedImageFormat("raw"));
  assert.ok(isSupportedTextFormat("epub"));
  assert.ok(isSupportedTextFormat("markdown"));
  assert.ok(!isSupportedTextFormat("docx"));
});

test("PIPE-019: upload size limits per mode", () => {
  assert.equal(UPLOAD_SIZE_LIMITS.length, 4);
  assert.ok(getUploadLimit("watch") > getUploadLimit("listen"));
  assert.ok(exceedsUploadLimit("read", 600 * 1024 * 1024));
  assert.ok(!exceedsUploadLimit("read", 100 * 1024 * 1024));
});

test("PIPE-020: resumable upload progress", () => {
  const upload: ResumableUpload = {
    uploadId: "u1", dropId: "d1", totalBytes: 1000,
    uploadedBytes: 500, chunkSize: 100, status: "uploading",
  };
  assert.equal(uploadProgress(upload), 0.5);
  assert.equal(uploadProgress({ ...upload, totalBytes: 0 }), 0);
});

test("PIPE-013: CDN regions defined", () => {
  assert.equal(CDN_REGIONS.length, 4);
});

// ── DRM & IP Rights (DRM-001 through DRM-040) ──

test("DRM-001.8: watch token anomaly scoring", () => {
  const score = computeAnomalyScore(["device_mismatch", "geo_impossible_travel"]);
  assert.ok(score > ANOMALY_THRESHOLD);
  const low = computeAnomalyScore(["unusual_hours"]);
  assert.ok(low < ANOMALY_THRESHOLD);
  const flagged: WatchTokenAnomalyScore = {
    tokenId: "t1", score, factors: ["device_mismatch", "geo_impossible_travel"], flagged: true,
  };
  assert.ok(isAnomalyFlagged(flagged));
});

test("DRM-028: Creative Commons license options", () => {
  assert.equal(CREATIVE_COMMONS_OPTIONS.length, 7);
  assert.ok(isCreativeCommons("cc_by"));
  assert.ok(isCreativeCommons("cc0"));
  assert.ok(!isCreativeCommons("all_rights_reserved"));
  assert.ok(!isCreativeCommons("custom"));
});

test("DRM-009/010/011: takedown lifecycle", () => {
  const request: TakedownRequest = {
    id: "t1", claimantAccountId: "c1", targetDropId: "d1",
    targetStudioHandle: "creator", reason: "copyright", evidenceUrls: [],
    status: "pending", submittedAt: "2026-05-18T00:00:00Z",
    reviewedAt: null, reviewerHandle: null,
  };
  const removed = advanceTakedownLifecycle(request, "approve", "2026-05-18T01:00:00Z");
  assert.equal(removed.status, "removed");
  assert.ok(canFileCounterNotice(removed));

  const counterFiled = advanceTakedownLifecycle(removed, "counter_notice", "2026-05-18T02:00:00Z");
  assert.equal(counterFiled.status, "counter_notice_filed");
  assert.ok(isUnderCounterNoticeStay(counterFiled));
});

test("DRM-033: counter-notice stay is active by default", () => {
  assert.ok(COUNTER_NOTICE_STAY_ACTIVE);
});

test("DRM-040: claimant response window is 14 days", () => {
  assert.equal(CLAIMANT_RESPONSE_WINDOW_DAYS, 14);
});

test("DRM-012/032: repeat infringer threshold", () => {
  const record = {
    accountId: "a1", studioHandle: "creator",
    upheldTakedowns: 2, threshold: REPEAT_INFRINGER_THRESHOLD,
    designated: false, designatedAt: null,
  };
  assert.ok(!isRepeatInfringer(record));
  assert.ok(isRepeatInfringer({ ...record, upheldTakedowns: 3 }));
});

test("DRM-017: open license commitment exists", () => {
  assert.ok(DRM_OPEN_LICENSE_COMMITMENT.includes("openly"));
});
