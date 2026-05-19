export type DmRestriction = "anyone" | "followers_only" | "mutual_only" | "no_one";

export type CommentRestriction = "anyone" | "followers_only" | "collectors_only" | "no_one";

export type MentionPrivacy = "anyone" | "followers_only" | "no_one";

export type CreatorSafetySettings = {
  accountId: string;
  dmRestriction: DmRestriction;
  commentRestrictionGlobal: CommentRestriction;
  mentionPrivacy: MentionPrivacy;
  presenceHidden: boolean;
  noPublicLocationSignals: boolean;
};

export const DEFAULT_CREATOR_SAFETY_SETTINGS: CreatorSafetySettings = {
  accountId: "",
  dmRestriction: "anyone",
  commentRestrictionGlobal: "anyone",
  mentionPrivacy: "anyone",
  presenceHidden: false,
  noPublicLocationSignals: true,
};

export type PerDropCommentRestriction = {
  dropId: string;
  restriction: CommentRestriction;
};

export type ConversationTimeout = {
  threadId: string;
  timeoutUntil: string;
  reason: string;
};

export function isDmAllowed(
  settings: CreatorSafetySettings,
  senderIsFollower: boolean,
  senderIsMutual: boolean
): boolean {
  switch (settings.dmRestriction) {
    case "anyone":
      return true;
    case "followers_only":
      return senderIsFollower;
    case "mutual_only":
      return senderIsMutual;
    case "no_one":
      return false;
  }
}

export function isCommentAllowed(
  restriction: CommentRestriction,
  isFollower: boolean,
  isCollector: boolean
): boolean {
  switch (restriction) {
    case "anyone":
      return true;
    case "followers_only":
      return isFollower;
    case "collectors_only":
      return isCollector;
    case "no_one":
      return false;
  }
}

export function isMentionAllowed(
  settings: CreatorSafetySettings,
  mentionerIsFollower: boolean
): boolean {
  switch (settings.mentionPrivacy) {
    case "anyone":
      return true;
    case "followers_only":
      return mentionerIsFollower;
    case "no_one":
      return false;
  }
}

export type DmRateLimit = {
  maxMessagesPerHour: number;
  maxNewThreadsPerDay: number;
};

export const DEFAULT_DM_RATE_LIMIT: DmRateLimit = {
  maxMessagesPerHour: 30,
  maxNewThreadsPerDay: 10,
};

export const NEW_ACCOUNT_INTERACTION_LIMITS = {
  accountAgeDays: 30,
  maxDmsPerDay: 5,
  maxCommentsPerDay: 20,
  maxFollowsPerDay: 50,
} as const;

export function isNewAccount(accountCreatedAt: string, nowMs: number): boolean {
  const ageMs = nowMs - Date.parse(accountCreatedAt);
  return ageMs < NEW_ACCOUNT_INTERACTION_LIMITS.accountAgeDays * 86_400_000;
}

export const PATRONAGE_LANGUAGE_COMMITMENT =
  "patron relationships are financial support relationships only. the platform's language, UI, and " +
  "documentation never imply personal intimacy, parasocial obligation, or access to the creator's " +
  "private life. 'patron' means 'supporter of the work,' nothing more.";
