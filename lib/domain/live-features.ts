export type LiveSessionPhase =
  | "backstage"
  | "soundcheck"
  | "live"
  | "post_processing"
  | "archived";

export type LiveSessionConfig = {
  sessionId: string;
  studioHandle: string;
  mode: "video" | "audio_only" | "screen_share";
  captionsEnabled: boolean;
  slowModeSec: number;
  maxViewers: number | null;
  qualityPreset: QualityPreset;
  replayQualityMatchesCreator: boolean;
};

export type QualityPreset = "auto" | "720p" | "1080p" | "4k";

export type CoHost = {
  sessionId: string;
  accountId: string;
  role: "co_host" | "guest_speaker";
  invitedAt: string;
  acceptedAt: string | null;
  status: "invited" | "accepted" | "declined" | "joined";
};

export type LiveTip = {
  id: string;
  sessionId: string;
  tipperAccountId: string;
  amountCents: number;
  message: string | null;
  sentAt: string;
};

export type LivePoll = {
  id: string;
  sessionId: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
  status: "open" | "closed";
  createdAt: string;
  closedAt: string | null;
};

export type LiveModerationAction = "kick" | "timeout" | "ban_from_session";

export type LiveAudienceModeration = {
  sessionId: string;
  targetAccountId: string;
  action: LiveModerationAction;
  reason: string;
  performedBy: string;
  performedAt: string;
  timeoutUntil: string | null;
};

export function isSlowModeChat(config: LiveSessionConfig): boolean {
  return config.slowModeSec > 0;
}

export type ViewerCount = {
  sessionId: string;
  current: number;
  peak: number;
  updatedAt: string;
};

export type LiveToVodWorkflow = {
  sessionId: string;
  rawRecordingUrl: string;
  status: "queued" | "processing" | "published" | "failed";
  trimStart: number | null;
  trimEnd: number | null;
  publishedDropId: string | null;
};

export type HighlightClip = {
  id: string;
  sessionId: string;
  startMs: number;
  endMs: number;
  title: string;
  createdAt: string;
  publishedAsDropId: string | null;
};

export type BackstageArea = {
  sessionId: string;
  participantIds: string[];
  chatEnabled: boolean;
  startedAt: string;
};

export type Soundcheck = {
  sessionId: string;
  audioTestPassed: boolean;
  videoTestPassed: boolean;
  latencyMs: number;
  completedAt: string | null;
};

export function isSoundcheckComplete(check: Soundcheck): boolean {
  return check.completedAt !== null && check.audioTestPassed;
}

export type RealTimeCaptions = {
  sessionId: string;
  language: string;
  provider: "auto" | "manual";
  enabled: boolean;
};

export type LiveSessionQuality = {
  sessionId: string;
  resolution: string;
  bitrate: number;
  frameRate: number;
};

export const DEFAULT_SLOW_MODE_SEC = 5;
export const MAX_LIVE_TIP_CENTS = 50000;

export function isValidTipAmount(amountCents: number): boolean {
  return amountCents > 0 && amountCents <= MAX_LIVE_TIP_CENTS;
}
