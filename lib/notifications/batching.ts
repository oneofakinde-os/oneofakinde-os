import type { NotificationType } from "@/lib/domain/contracts";

export type BatchRule = {
  type: NotificationType;
  windowMs: number;
  maxPerWindow: number;
  groupKey: string;
};

const BATCH_RULES: BatchRule[] = [
  { type: "comment_reply", windowMs: 300_000, maxPerWindow: 3, groupKey: "comments" },
  { type: "comment_mention", windowMs: 300_000, maxPerWindow: 3, groupKey: "comments" },
  { type: "membership_change", windowMs: 600_000, maxPerWindow: 5, groupKey: "membership" },
  { type: "world_update", windowMs: 600_000, maxPerWindow: 5, groupKey: "world" },
];

export function getBatchRule(type: NotificationType): BatchRule | null {
  return BATCH_RULES.find((r) => r.type === type) ?? null;
}

export type BatchWindow = {
  groupKey: string;
  count: number;
  windowStart: number;
};

export function shouldBatch(
  type: NotificationType,
  recentWindows: BatchWindow[],
  nowMs: number
): { batched: boolean; batchKey: string | null } {
  const rule = getBatchRule(type);
  if (!rule) {
    return { batched: false, batchKey: null };
  }

  const activeWindow = recentWindows.find(
    (w) => w.groupKey === rule.groupKey && nowMs - w.windowStart < rule.windowMs
  );

  if (activeWindow && activeWindow.count >= rule.maxPerWindow) {
    return { batched: true, batchKey: `batch_${rule.groupKey}_${activeWindow.windowStart}` };
  }

  return { batched: false, batchKey: null };
}
