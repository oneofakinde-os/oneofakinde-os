export type NormalizedHashtag = {
  raw: string;
  normalized: string;
};

const HASHTAG_PATTERN = /#([a-zA-Z0-9_]+)/g;

export function extractHashtags(text: string): NormalizedHashtag[] {
  const matches = text.matchAll(HASHTAG_PATTERN);
  const seen = new Set<string>();
  const results: NormalizedHashtag[] = [];

  for (const match of matches) {
    const raw = match[1]!;
    const normalized = normalizeHashtag(raw);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      results.push({ raw, normalized });
    }
  }

  return results;
}

export function normalizeHashtag(tag: string): string {
  return tag.toLowerCase().replace(/_+/g, "_").replace(/^_|_$/g, "");
}

export function suggestHashtags(
  partial: string,
  knownTags: string[],
  limit: number = 5
): string[] {
  const p = normalizeHashtag(partial);
  if (!p) return [];

  return knownTags
    .filter((t) => t.startsWith(p) || t.includes(p))
    .sort((a, b) => {
      const aStarts = a.startsWith(p) ? 0 : 1;
      const bStarts = b.startsWith(p) ? 0 : 1;
      return aStarts - bStarts || a.localeCompare(b);
    })
    .slice(0, limit);
}

export type HashtagFollow = {
  accountId: string;
  hashtag: string;
  createdAt: string;
};

export type HashtagTrend = {
  hashtag: string;
  count: number;
  velocity: number;
};

export function computeHashtagTrends(
  tagOccurrences: Array<{ hashtag: string; timestamp: string }>,
  windowMs: number,
  nowMs: number,
  limit: number = 20
): HashtagTrend[] {
  const windowStart = nowMs - windowMs;
  const halfWindow = nowMs - windowMs / 2;

  const counts = new Map<string, { total: number; recent: number; older: number }>();

  for (const { hashtag, timestamp } of tagOccurrences) {
    const ts = Date.parse(timestamp);
    if (ts < windowStart) continue;

    const entry = counts.get(hashtag) ?? { total: 0, recent: 0, older: 0 };
    entry.total++;
    if (ts >= halfWindow) {
      entry.recent++;
    } else {
      entry.older++;
    }
    counts.set(hashtag, entry);
  }

  return [...counts.entries()]
    .map(([hashtag, { total, recent, older }]) => ({
      hashtag,
      count: total,
      velocity: older > 0 ? (recent - older) / older : recent > 0 ? 1 : 0,
    }))
    .sort((a, b) => b.velocity - a.velocity || b.count - a.count)
    .slice(0, limit);
}
