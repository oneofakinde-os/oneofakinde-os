import assert from "node:assert/strict";
import test from "node:test";
import {
  TRANSACTIONAL_TYPES,
  isTransactional,
} from "../../lib/notifications/channels";
import {
  DEFAULT_PREFERENCES,
  isChannelEnabled,
  isTypeMuted,
  isInQuietHours,
} from "../../lib/notifications/preferences";
import { planDelivery } from "../../lib/notifications/delivery-engine";
import type { DeliveryContext } from "../../lib/notifications/delivery-engine";
import {
  getBatchRule,
  shouldBatch,
} from "../../lib/notifications/batching";
import { bucketForDigest, summarizeDigest } from "../../lib/notifications/digest";
import type { NotificationEntry } from "../../lib/domain/contracts";

function makeCtx(overrides: Partial<DeliveryContext> = {}): DeliveryContext {
  return {
    preferences: { ...DEFAULT_PREFERENCES, accountId: "test" },
    recentDeliveryCount: 0,
    pendingBatchKey: null,
    now: new Date("2026-05-18T14:00:00Z"),
    ...overrides,
  };
}

test("NTF-001: transactional types bypass quiet hours and digest", () => {
  for (const t of TRANSACTIONAL_TYPES) {
    assert.ok(isTransactional(t), `${t} should be transactional`);
  }
  assert.ok(isTransactional("drop_collected"));
  assert.ok(isTransactional("receipt_confirmed"));
  assert.ok(isTransactional("resale_completed"));
  assert.ok(isTransactional("resale_royalty_earned"));
  assert.ok(!isTransactional("comment_reply"));
});

test("NTF-002: planDelivery routes transactional through all enabled channels despite quiet hours", () => {
  const ctx = makeCtx({
    preferences: {
      ...DEFAULT_PREFERENCES,
      accountId: "test",
      quietHours: { ...DEFAULT_PREFERENCES.quietHours, enabled: true },
    },
    now: new Date("2026-05-18T23:00:00Z"),
  });
  const plan = planDelivery("drop_collected", ctx);
  assert.ok(!plan.suppressed);
  assert.ok(plan.channels.includes("email"));
});

test("NTF-003: planDelivery suppresses muted non-transactional types", () => {
  const ctx = makeCtx({
    preferences: {
      ...DEFAULT_PREFERENCES,
      accountId: "test",
      mutedTypes: ["comment_reply"],
    },
  });
  const plan = planDelivery("comment_reply", ctx);
  assert.ok(plan.suppressed);
  assert.equal(plan.suppressReason, "muted_type");
  assert.equal(plan.channels.length, 0);
});

test("NTF-004: planDelivery respects digest mode", () => {
  const ctx = makeCtx({
    preferences: {
      ...DEFAULT_PREFERENCES,
      accountId: "test",
      digestMode: "daily",
    },
  });
  const plan = planDelivery("comment_reply", ctx);
  assert.ok(!plan.suppressed);
  assert.deepEqual(plan.channels, ["in_app"]);
  assert.ok(plan.batchedInto?.startsWith("digest_"));
});

test("NTF-005: planDelivery applies frequency cap", () => {
  const ctx = makeCtx({ recentDeliveryCount: 25 });
  const plan = planDelivery("world_update", ctx);
  assert.ok(!plan.suppressed);
  assert.ok(plan.suppressReason === "frequency_cap");
  assert.deepEqual(plan.channels, ["in_app"]);
});

test("NTF-006: quiet hours block non-transactional email/push", () => {
  const ctx = makeCtx({
    preferences: {
      ...DEFAULT_PREFERENCES,
      accountId: "test",
      quietHours: {
        enabled: true,
        fromHour: 22,
        fromMinute: 0,
        toHour: 8,
        toMinute: 0,
        timezone: "UTC",
      },
    },
    now: new Date("2026-05-18T23:00:00Z"),
  });
  const plan = planDelivery("comment_reply", ctx);
  assert.ok(!plan.suppressed);
  assert.ok(plan.channels.includes("in_app"));
  assert.ok(!plan.channels.includes("email"));
  assert.ok(!plan.channels.includes("push"));
});

test("NTF-007: default preferences have sane values", () => {
  assert.ok(isChannelEnabled(DEFAULT_PREFERENCES, "in_app"));
  assert.ok(isChannelEnabled(DEFAULT_PREFERENCES, "email"));
  assert.ok(!isChannelEnabled(DEFAULT_PREFERENCES, "push"));
  assert.equal(DEFAULT_PREFERENCES.frequencyCap, 20);
  assert.equal(DEFAULT_PREFERENCES.digestMode, "none");
});

test("NTF-008: batch rules exist for comment types", () => {
  const rule = getBatchRule("comment_reply");
  assert.ok(rule);
  assert.equal(rule.groupKey, "comments");
  assert.equal(rule.maxPerWindow, 3);
  assert.ok(rule.windowMs > 0);
});

test("NTF-009: shouldBatch returns true when window is saturated", () => {
  const now = Date.now();
  const result = shouldBatch("comment_reply", [
    { groupKey: "comments", count: 5, windowStart: now - 10_000 },
  ], now);
  assert.ok(result.batched);
  assert.ok(result.batchKey?.startsWith("batch_comments_"));
});

test("NTF-010: shouldBatch returns false for types without batch rules", () => {
  const result = shouldBatch("drop_collected", [], Date.now());
  assert.ok(!result.batched);
  assert.equal(result.batchKey, null);
});

test("NTF-011: digest bucketing filters by account and time window", () => {
  const now = new Date("2026-05-18T12:00:00Z");
  const entries: NotificationEntry[] = [
    { id: "1", accountId: "a1", type: "comment_reply", title: "t1", body: "b1", href: null, read: false, createdAt: "2026-05-18T10:00:00Z" },
    { id: "2", accountId: "a1", type: "world_update", title: "t2", body: "b2", href: null, read: false, createdAt: "2026-05-10T10:00:00Z" },
    { id: "3", accountId: "a2", type: "comment_reply", title: "t3", body: "b3", href: null, read: false, createdAt: "2026-05-18T10:00:00Z" },
  ];
  const bucket = bucketForDigest(entries, "a1", "daily", now);
  assert.equal(bucket.entries.length, 1);
  assert.equal(bucket.entries[0].id, "1");
  assert.equal(bucket.mode, "daily");
});

test("NTF-012: digest summary aggregates by type", () => {
  const bucket = {
    accountId: "a1",
    mode: "daily" as const,
    entries: [
      { id: "1", accountId: "a1", type: "comment_reply" as const, title: "t1", body: "b1", href: null, read: false, createdAt: "2026-05-18T10:00:00Z" },
      { id: "2", accountId: "a1", type: "comment_reply" as const, title: "t2", body: "b2", href: null, read: false, createdAt: "2026-05-18T11:00:00Z" },
      { id: "3", accountId: "a1", type: "world_update" as const, title: "t3", body: "b3", href: null, read: false, createdAt: "2026-05-18T11:30:00Z" },
    ],
    periodStart: "2026-05-17T12:00:00Z",
    periodEnd: "2026-05-18T12:00:00Z",
  };
  const summary = summarizeDigest(bucket);
  assert.equal(summary.totalEntries, 3);
  assert.equal(summary.byType["comment_reply"], 2);
  assert.equal(summary.byType["world_update"], 1);
  assert.ok(summary.topItems.length <= 5);
});

test("NTF-013: isInQuietHours handles overnight wrap", () => {
  const prefs = {
    ...DEFAULT_PREFERENCES,
    accountId: "test",
    quietHours: {
      enabled: true,
      fromHour: 22,
      fromMinute: 0,
      toHour: 8,
      toMinute: 0,
      timezone: "UTC",
    },
  };
  assert.ok(isInQuietHours(prefs, new Date("2026-05-18T23:30:00Z")));
  assert.ok(isInQuietHours(prefs, new Date("2026-05-18T03:00:00Z")));
  assert.ok(!isInQuietHours(prefs, new Date("2026-05-18T14:00:00Z")));
  assert.ok(!isInQuietHours(prefs, new Date("2026-05-18T09:00:00Z")));
});

test("NTF-014: isTypeMuted correctly checks mutedTypes array", () => {
  const prefs = {
    ...DEFAULT_PREFERENCES,
    accountId: "test",
    mutedTypes: ["featured_lane_alert" as const, "patron_renewal" as const],
  };
  assert.ok(isTypeMuted(prefs, "featured_lane_alert"));
  assert.ok(isTypeMuted(prefs, "patron_renewal"));
  assert.ok(!isTypeMuted(prefs, "drop_collected"));
});
