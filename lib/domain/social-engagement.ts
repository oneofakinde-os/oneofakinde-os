export type MentionContext = {
  mentionerId: string;
  mentionedId: string;
  surfaceType: "post" | "comment" | "drop_description";
  surfaceId: string;
  mentionedAt: string;
};

export type Repost = {
  id: string;
  originalDropId: string;
  reposterAccountId: string;
  quoteText: string | null;
  repostedAt: string;
};

export type CommentSort = "chronological" | "top_rated";

export type CommentPin = {
  commentId: string;
  threadId: string;
  pinnedBy: string;
  pinnedAt: string;
};

export type ReportCategory =
  | "spam"
  | "harassment"
  | "copyright"
  | "hate_speech"
  | "self_harm"
  | "misinformation"
  | "impersonation"
  | "other";

export const REPORT_CATEGORIES: readonly ReportCategory[] = [
  "spam",
  "harassment",
  "copyright",
  "hate_speech",
  "self_harm",
  "misinformation",
  "impersonation",
  "other",
] as const;

export type ContentReport = {
  id: string;
  reporterAccountId: string;
  targetType: "drop" | "comment" | "message" | "studio" | "world";
  targetId: string;
  category: ReportCategory;
  description: string;
  status: "submitted" | "under_review" | "actioned" | "dismissed";
  assignedTo: string | null;
  submittedAt: string;
  resolvedAt: string | null;
  resolution: string | null;
};

export function isReportCategory(value: unknown): value is ReportCategory {
  return typeof value === "string" && (REPORT_CATEGORIES as readonly string[]).includes(value);
}

export type ReportSla = {
  category: ReportCategory;
  firstReviewHours: number;
};

export const REPORT_SLAS: readonly ReportSla[] = [
  { category: "self_harm", firstReviewHours: 1 },
  { category: "harassment", firstReviewHours: 4 },
  { category: "hate_speech", firstReviewHours: 4 },
  { category: "copyright", firstReviewHours: 24 },
  { category: "spam", firstReviewHours: 24 },
  { category: "impersonation", firstReviewHours: 24 },
  { category: "misinformation", firstReviewHours: 48 },
  { category: "other", firstReviewHours: 48 },
] as const;

export function getReportSla(category: ReportCategory): number {
  return REPORT_SLAS.find((s) => s.category === category)!.firstReviewHours;
}

export type AutocompleteResult = {
  type: "user" | "hashtag" | "world";
  value: string;
  displayLabel: string;
};

export type DropCommentConfig = {
  dropId: string;
  commentsDisabled: boolean;
  keywordFilters: string[];
  hideLikeCounts: boolean;
  slowModeSeconds: number;
  autoHideNewAccountReplies: boolean;
  newAccountThresholdDays: number;
};

export const DEFAULT_COMMENT_CONFIG: DropCommentConfig = {
  dropId: "",
  commentsDisabled: false,
  keywordFilters: [],
  hideLikeCounts: false,
  slowModeSeconds: 0,
  autoHideNewAccountReplies: false,
  newAccountThresholdDays: 7,
};

export function isSlowModeActive(config: DropCommentConfig): boolean {
  return config.slowModeSeconds > 0;
}

export function shouldAutoHideReply(
  config: DropCommentConfig,
  accountCreatedAt: string,
  nowMs: number
): boolean {
  if (!config.autoHideNewAccountReplies) return false;
  const ageMs = nowMs - Date.parse(accountCreatedAt);
  return ageMs < config.newAccountThresholdDays * 86_400_000;
}

export type ShowroomComment = {
  id: string;
  collectorAccountId: string;
  dropId: string;
  commenterAccountId: string;
  body: string;
  createdAt: string;
};

export function canCommentOnShowroom(
  collectorSettings: DropCommentConfig,
  isFollower: boolean
): boolean {
  return !collectorSettings.commentsDisabled;
}
