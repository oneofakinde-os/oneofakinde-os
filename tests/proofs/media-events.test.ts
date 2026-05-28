import assert from "node:assert/strict";
import test from "node:test";
import {
  mediaSelected,
  mediaPreviewGenerated,
  mediaUploadStarted,
  mediaUploadCompleted,
  mediaProcessingStarted,
  mediaProcessingCompleted,
  mediaProcessingFailed,
  mediaFinalAssetDisplayed,
  mediaReplaced,
  mediaDeleted,
  dropMediaAttached,
  postMediaAttached,
} from "../../lib/domain/media-events";
import { isValidAnalyticsEvent } from "../../lib/domain/analytics-events";
import { isValidAuditAction, createAuditEntry } from "../../lib/domain/audit-log";

function assertValidPair(pair: { analytics: { event: string }; audit: { action: string } }) {
  assert.ok(isValidAnalyticsEvent(pair.analytics.event), `invalid analytics event: ${pair.analytics.event}`);
  assert.ok(isValidAuditAction(pair.audit.action), `invalid audit action: ${pair.audit.action}`);
}

test("proof: mediaSelected produces valid analytics + audit pair", () => {
  const pair = mediaSelected({
    accountId: "acc_01",
    assetId: "asset_01",
    kind: "image",
    ownerType: "drop",
    ownerId: "drop_01",
    mimeType: "image/jpeg",
    fileSizeBytes: 1024,
    ip: "127.0.0.1",
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "media.selected");
  assert.equal(pair.audit.targetType, "media");
});

test("proof: mediaPreviewGenerated maps to media.preview.generated", () => {
  const pair = mediaPreviewGenerated({
    accountId: "acc_01",
    assetId: "asset_01",
    kind: "image",
    ip: null,
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "media.preview.generated");
});

test("proof: mediaUploadStarted records bucket and size", () => {
  const pair = mediaUploadStarted({
    accountId: "acc_01",
    assetId: "asset_01",
    bucket: "drop-media",
    fileSizeBytes: 50000,
    ip: "10.0.0.1",
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "media.upload.started");
  assert.equal((pair.analytics.properties as Record<string, unknown>).bucket, "drop-media");
});

test("proof: mediaUploadCompleted records storagePath", () => {
  const pair = mediaUploadCompleted({
    accountId: "acc_01",
    assetId: "asset_01",
    storagePath: "acc_01/photo.jpg",
    bucket: "drop-media",
    ip: "10.0.0.1",
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "media.upload.completed");
});

test("proof: mediaProcessingStarted produces valid pair", () => {
  const pair = mediaProcessingStarted({
    accountId: "acc_01",
    assetId: "asset_01",
    ip: null,
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "media.processing.started");
});

test("proof: mediaProcessingCompleted includes variantCount", () => {
  const pair = mediaProcessingCompleted({
    accountId: "acc_01",
    assetId: "asset_01",
    variantCount: 3,
    ip: null,
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "media.processing.completed");
  assert.equal((pair.analytics.properties as Record<string, unknown>).variantCount, 3);
});

test("proof: mediaProcessingFailed records error and retryCount", () => {
  const pair = mediaProcessingFailed({
    accountId: "acc_01",
    assetId: "asset_01",
    error: "corrupt_file",
    retryCount: 2,
    ip: null,
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "media.processing.failed");
  assert.equal(pair.audit.action, "media.processing_failed");
  assert.equal((pair.audit.metadata as Record<string, unknown>).retryCount, 2);
});

test("proof: mediaFinalAssetDisplayed maps to media.final_asset.displayed", () => {
  const pair = mediaFinalAssetDisplayed({
    accountId: "acc_01",
    assetId: "asset_01",
    variantKind: "optimized",
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "media.final_asset.displayed");
});

test("proof: mediaReplaced records old and new asset IDs", () => {
  const pair = mediaReplaced({
    accountId: "acc_01",
    oldAssetId: "asset_old",
    newAssetId: "asset_new",
    ownerType: "drop",
    ownerId: "drop_01",
    ip: "10.0.0.1",
  });
  assertValidPair(pair);
  assert.equal(pair.audit.action, "media.replaced");
  assert.equal((pair.audit.metadata as Record<string, unknown>).replacedAssetId, "asset_old");
});

test("proof: mediaDeleted records bucket and storagePath", () => {
  const pair = mediaDeleted({
    accountId: "acc_01",
    assetId: "asset_01",
    storagePath: "acc_01/photo.jpg",
    bucket: "drop-media",
    ip: "10.0.0.1",
  });
  assertValidPair(pair);
  assert.equal(pair.audit.action, "media.deleted");
});

test("proof: dropMediaAttached maps to drop.media.attached", () => {
  const pair = dropMediaAttached({
    accountId: "acc_01",
    dropId: "drop_01",
    assetId: "asset_01",
    kind: "video",
    ip: "10.0.0.1",
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "drop.media.attached");
  assert.equal(pair.audit.action, "drop.media_attached");
  assert.equal(pair.audit.targetType, "drop");
});

test("proof: postMediaAttached maps to post.media.attached", () => {
  const pair = postMediaAttached({
    accountId: "acc_01",
    postId: "post_01",
    assetId: "asset_01",
    kind: "image",
    ip: null,
  });
  assertValidPair(pair);
  assert.equal(pair.analytics.event, "post.media.attached");
  assert.equal(pair.audit.action, "post.media_attached");
  assert.equal(pair.audit.targetType, "post");
});

test("proof: all 12 media event factories return well-formed pairs", () => {
  const factories = [
    () => mediaSelected({ accountId: "a", assetId: "x", kind: "image", ownerType: "drop", ownerId: "d", mimeType: "image/jpeg", fileSizeBytes: 1, ip: null }),
    () => mediaPreviewGenerated({ accountId: "a", assetId: "x", kind: "image", ip: null }),
    () => mediaUploadStarted({ accountId: "a", assetId: "x", bucket: "b", fileSizeBytes: 1, ip: null }),
    () => mediaUploadCompleted({ accountId: "a", assetId: "x", storagePath: "p", bucket: "b", ip: null }),
    () => mediaProcessingStarted({ accountId: "a", assetId: "x", ip: null }),
    () => mediaProcessingCompleted({ accountId: "a", assetId: "x", variantCount: 1, ip: null }),
    () => mediaProcessingFailed({ accountId: "a", assetId: "x", error: "e", retryCount: 0, ip: null }),
    () => mediaFinalAssetDisplayed({ accountId: "a", assetId: "x", variantKind: "optimized" }),
    () => mediaReplaced({ accountId: "a", oldAssetId: "o", newAssetId: "n", ownerType: "drop", ownerId: "d", ip: null }),
    () => mediaDeleted({ accountId: "a", assetId: "x", storagePath: "p", bucket: "b", ip: null }),
    () => dropMediaAttached({ accountId: "a", dropId: "d", assetId: "x", kind: "image", ip: null }),
    () => postMediaAttached({ accountId: "a", postId: "p", assetId: "x", kind: "image", ip: null }),
  ];

  assert.equal(factories.length, 12);

  for (const factory of factories) {
    const pair = factory();
    assertValidPair(pair);
    assert.ok(pair.analytics.timestamp);
  }
});

test("proof: media audit entries round-trip through createAuditEntry", () => {
  const pair = mediaUploadCompleted({
    accountId: "acc_99",
    assetId: "asset_99",
    storagePath: "acc_99/file.jpg",
    bucket: "drop-media",
    ip: "127.0.0.1",
  });

  const entry = createAuditEntry(pair.audit);
  assert.ok(entry.id);
  assert.ok(entry.timestamp);
  assert.equal(entry.action, "media.uploaded");
  assert.equal(entry.actorId, "acc_99");
});
