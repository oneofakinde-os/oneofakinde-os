export type ConsumeHistoryEntry = {
  accountId: string;
  dropId: string;
  mode: string;
  progressPercent: number;
  lastPositionMs: number | null;
  completed: boolean;
  consumedAt: string;
  updatedAt: string;
};

export type ConsumeHistoryPreference = {
  accountId: string;
  trackingEnabled: boolean;
  historyVisible: boolean;
};

export const DEFAULT_CONSUME_HISTORY_PREFERENCE: ConsumeHistoryPreference = {
  accountId: "",
  trackingEnabled: true,
  historyVisible: true,
};

export type ResumePoint = {
  dropId: string;
  accountId: string;
  positionMs: number;
  deviceId: string;
  savedAt: string;
};

export function canResumePlayback(point: ResumePoint | null): boolean {
  return point !== null && point.positionMs > 0;
}

export type NotInterestedEntry = {
  accountId: string;
  dropId: string;
  markedAt: string;
};

export type ReadingTimeEstimate = {
  dropId: string;
  wordCount: number;
  estimatedMinutes: number;
};

export const WORDS_PER_MINUTE = 238;

export function estimateReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

export type ExternalEmbed = {
  dropId: string;
  iframeUrl: string;
  provenanceLink: string;
  allowedDomains: string[] | null;
};

export function buildEmbedUrl(dropId: string, baseUrl: string): string {
  return `${baseUrl}/embed/${dropId}`;
}

export type TalkModeFilter = {
  subMode: "spoken_word" | "podcast" | "interview" | "lecture" | "all";
};

export type BotDetectionSignal = {
  accountId: string;
  signalType: "rapid_consumption" | "identical_patterns" | "no_variance" | "api_abuse";
  confidence: number;
  detectedAt: string;
};

export type WashEngagementDetection = {
  accountId: string;
  targetDropId: string;
  pattern: "self_collect" | "ring_collect" | "bot_farm";
  confidence: number;
  detectedAt: string;
};

export const BOT_CONFIDENCE_THRESHOLD = 0.85;
export const WASH_CONFIDENCE_THRESHOLD = 0.9;

export function isBotLikely(confidence: number): boolean {
  return confidence >= BOT_CONFIDENCE_THRESHOLD;
}

export function isWashEngagement(confidence: number): boolean {
  return confidence >= WASH_CONFIDENCE_THRESHOLD;
}

export type SpoilerTag = {
  id: string;
  surfaceType: "post" | "comment";
  surfaceId: string;
  reason: string;
  taggedBy: string;
  taggedAt: string;
};

export function isSpoilerTagged(tags: SpoilerTag[], surfaceId: string): boolean {
  return tags.some((t) => t.surfaceId === surfaceId);
}
