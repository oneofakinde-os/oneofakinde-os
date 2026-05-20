import type { NotificationEntry } from "@/lib/domain/contracts";
import type { DigestMode } from "@/lib/notifications/preferences";

export type DigestBucket = {
  accountId: string;
  mode: DigestMode;
  entries: NotificationEntry[];
  periodStart: string;
  periodEnd: string;
};

export function bucketForDigest(
  entries: NotificationEntry[],
  accountId: string,
  mode: DigestMode,
  now: Date
): DigestBucket {
  const periodMs = mode === "daily" ? 86_400_000 : 604_800_000;
  const periodStart = new Date(now.getTime() - periodMs);

  const filtered = entries.filter(
    (e) =>
      e.accountId === accountId &&
      Date.parse(e.createdAt) >= periodStart.getTime() &&
      Date.parse(e.createdAt) <= now.getTime()
  );

  return {
    accountId,
    mode,
    entries: filtered,
    periodStart: periodStart.toISOString(),
    periodEnd: now.toISOString(),
  };
}

export type DigestSummary = {
  totalEntries: number;
  byType: Record<string, number>;
  topItems: Array<{ title: string; type: string }>;
};

export function summarizeDigest(bucket: DigestBucket): DigestSummary {
  const byType: Record<string, number> = {};
  for (const entry of bucket.entries) {
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;
  }

  const topItems = bucket.entries.slice(0, 5).map((e) => ({
    title: e.title,
    type: e.type,
  }));

  return {
    totalEntries: bucket.entries.length,
    byType,
    topItems,
  };
}
