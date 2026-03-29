import type {
  AccountRole,
  AuthorizedDerivative,
  AuthorizedDerivativeKind,
  Certificate,
  CaptureWorkshopLiveSessionArtifactInput,
  CollectLiveSessionSnapshot,
  CollectEnforcementSignal,
  CollectEnforcementSignalType,
  CollectIntegrityFlag,
  CollectIntegrityFlagSeverity,
  CollectIntegritySnapshot,
  CollectInventoryListing,
  CollectMarketLane,
  CollectOffer,
  CollectOfferAction,
  CheckoutPreview,
  CreateWorkshopWorldReleaseInput,
  CreateWorkshopLiveSessionInput,
  CreateAuthorizedDerivativeInput,
  CreateDropInput,
  CreateDropVersionInput,
  CreateSessionInput,
  CreateWorldInput,
  Drop,
  DropLiveArtifactEntry,
  DropLiveArtifactsSnapshot,
  DropLineageSnapshot,
  DropPreviewMap,
  DropPreviewMode,
  DropVersion,
  DropVersionLabel,
  LibraryEligibilitySnapshot,
  LibraryDrop,
  LibraryQueueItem,
  LibraryQueueProgressState,
  LibraryRecallDelta,
  LibraryRecallState,
  LibrarySavedDrop,
  LibrarySnapshot,
  LedgerTransaction,
  LiveSession,
  LiveSessionConversationMessage,
  LiveSessionConversationModerationCaseResolveResult,
  LiveSessionConversationModerationQueueItem,
  LiveSessionConversationModerationResolution,
  LiveSessionConversationThread,
  LiveSessionArtifact,
  LiveSessionArtifactKind,
  LiveSessionEligibility,
  LiveSessionJoinSnapshot,
  LiveSessionType,
  MyCollectionAnalyticsPanel,
  DropOwnershipHistory,
  MyCollectionSnapshot,
  MembershipEntitlement,
  NotificationEntry,
  NotificationFeed,
  NotificationType,
  OpsAnalyticsPanel,
  OwnedDrop,
  OwnershipHistoryEntry,
  PatronCommitmentCadence,
  Patron,
  PatronTierConfig,
  PatronTierStatus,
  PatronRosterEntry,
  WorldPatronRosterSnapshot,
  WorldPatronRosterViewerAccess,
  PurchaseReceipt,
  ReceiptBadge,
  SettlementLineItem,
  SettlementQuote,
  Session,
  Studio,
  TownhallModerationCaseResolution,
  TownhallModerationCaseResolveResult,
  TownhallComment,
  TownhallPost,
  TownhallPostLinkedObject,
  TownhallPostLinkedObjectKind,
  TownhallPostModerationCaseState,
  TownhallPostsFilter,
  TownhallPostsSnapshot,
  TownhallDropSocialSnapshot,
  TownhallModerationQueueItem,
  TownhallShareChannel,
  TownhallSocialSnapshot,
  TownhallTelemetryMetadata,
  TownhallTelemetryEventType,
  TownhallTelemetrySignals,
  WorkshopAnalyticsPanel,
  WorkshopProProfile,
  WorkshopProState,
  WatchQualityLevel,
  WatchQualityMode,
  WatchTelemetryEventType,
  WatchTelemetryLogEntry,
  WatchSessionEndReason,
  WatchSessionSnapshot,
  WorldReleaseQueueItem,
  WorldReleaseQueuePacingMode,
  WorldReleaseQueueStatus,
  WorldConversationMessage,
  WorldConversationModerationCaseResolveResult,
  WorldConversationModerationQueueItem,
  WorldConversationModerationResolution,
  WorldConversationThread,
  WorldCollectBundleCollectResult,
  WorldCollectBundleSnapshot,
  WorldCollectBundleType,
  WorldCollectOwnership,
  WorldCollectUpgradePreview,
  SetupCreatorStudioInput,
  SetupCreatorStudioResult,
  UpdateDropPreviewMediaInput,
  UpsertWorkshopPatronTierConfigInput,
  World
} from "@/lib/domain/contracts";
import type { CheckoutSessionResult, CreateCheckoutSessionInput, StripeWebhookApplyResult } from "@/lib/bff/contracts";
import {
  buildCollectInventorySnapshotFromOffers,
  listCollectInventoryByLane,
  resolveCollectListingTypeByDropId
} from "@/lib/collect/market-lanes";
import { resolveOnboardingDiscoverySeed } from "@/lib/onboarding/discovery-cards";
import {
  buildWorldCollectBundleOptions,
  getActiveWorldCollectOwnership
} from "@/lib/collect/world-bundles";
import { sortDropsForStudioSurface, sortDropsForWorldSurface } from "@/lib/catalog/drop-curation";
import { applyCollectOfferAction, canApplyCollectOfferAction } from "@/lib/collect/offer-state-machine";
import { createCheckoutSession, parseStripeWebhook, type ParsedStripeWebhookEvent } from "@/lib/bff/payments";
import { buildCollectSettlementQuote, buildPatronSettlementQuote, buildResaleSettlementQuote } from "@/lib/domain/quote-engine";
import {
  type AuthorizedDerivativeRecord,
  type DropVersionRecord,
  type CollectEnforcementSignalRecord,
  type CollectOfferRecord,
  type LibraryEligibilityStateRecord,
  type LedgerLineItemRecord,
  type LedgerTransactionRecord,
  type LiveSessionRecord,
  type LiveSessionAttendeeRecord,
  type LiveSessionConversationMessageRecord,
  type LiveSessionArtifactRecord,
  type MembershipEntitlementRecord,
  type PatronCommitmentRecord,
  type PatronRecord,
  type PatronTierConfigRecord,
  type WorkshopProProfileRecord,
  type WorldConversationMessageRecord,
  type WorldReleaseQueueRecord,
  type WorldCollectOwnershipRecord,
  type WatchAccessGrantRecord,
  type WatchSessionRecord,
  createAccountFromEmail,
  normalizeEmail,
  toHandle,
  withDatabase,
  type AccountRecord,
  type BffDatabase,
  type CertificateRecord,
  type ReceiptBadgeRecord,
  type PaymentRecord,
  type TownhallCommentRecord,
  type TownhallPostFollowRecord,
  type TownhallPostRecord,
  type TownhallPostSaveRecord,
  type TownhallPostShareRecord,
  type NotificationEntryRecord,
  type TownhallTelemetryEventRecord
} from "@/lib/bff/persistence";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const PROCESSING_FEE_USD = 1.99;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const STRIPE_WEBHOOK_EVENT_LOG_LIMIT = 1000;
const TOWNHALL_COMMENT_MAX_LENGTH = 600;
const TOWNHALL_COMMENTS_PREVIEW_LIMIT = 24;
const TOWNHALL_POST_MAX_LENGTH = 1200;
const TOWNHALL_POSTS_PREVIEW_LIMIT = 40;
const TOWNHALL_POST_LOG_LIMIT = 50_000;
const TOWNHALL_POST_SAVE_LOG_LIMIT = 50_000;
const TOWNHALL_POST_FOLLOW_LOG_LIMIT = 50_000;
const TOWNHALL_POST_SHARE_LOG_LIMIT = 100_000;
const WORLD_CONVERSATION_MESSAGE_MAX_LENGTH = 600;
const WORLD_CONVERSATION_MESSAGES_PREVIEW_LIMIT = 200;
const WORLD_CONVERSATION_MESSAGE_LOG_LIMIT = 50_000;
const LIVE_SESSION_CONVERSATION_MESSAGE_MAX_LENGTH = 600;
const LIVE_SESSION_CONVERSATION_MESSAGES_PREVIEW_LIMIT = 200;
const LIVE_SESSION_CONVERSATION_MESSAGE_LOG_LIMIT = 50_000;
const WORLD_CONVERSATION_MODERATION_QUEUE_LIMIT = 500;
const LIVE_SESSION_CONVERSATION_MODERATION_QUEUE_LIMIT = 500;
const COLLECT_OFFERS_LOG_LIMIT = 50_000;
const COLLECT_ENFORCEMENT_SIGNAL_LOG_LIMIT = 10_000;
const COLLECT_INTEGRITY_RECENT_SIGNAL_LIMIT = 100;
const WORLD_COLLECT_OWNERSHIP_LOG_LIMIT = 20_000;
const WORLD_RELEASE_QUEUE_LOG_LIMIT = 20_000;
const WATCH_ACCESS_GRANTS_LOG_LIMIT = 20_000;
const WATCH_SESSION_LOG_LIMIT = 50_000;
const PATRON_ROSTER_LOG_LIMIT = 20_000;
const PATRON_COMMITMENT_LOG_LIMIT = 50_000;
const PATRON_TIER_CONFIG_LOG_LIMIT = 2_000;
const LIVE_SESSION_ARTIFACT_LOG_LIMIT = 20_000;
const LIVE_SESSION_ATTENDANCE_LOG_LIMIT = 50_000;
const WORKSHOP_PRO_PROFILE_LOG_LIMIT = 2_000;
const DEFAULT_PATRON_COMMITMENT_AMOUNT_CENTS = 500;
const DEFAULT_PATRON_COMMITMENT_PERIOD_DAYS = 30;
const DEFAULT_PATRON_TIER_TITLE = "studio patron";
const PATRON_EARLY_ACCESS_WINDOW_HOURS_MIN = 1;
const PATRON_EARLY_ACCESS_WINDOW_HOURS_MAX = 168;
const PATRON_COMMITMENT_CADENCE_TO_PERIOD_DAYS: Record<PatronCommitmentCadence, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90
};
const WORKSHOP_PRO_GRACE_PERIOD_DAYS = 7;
const WATCH_ACCESS_TOKEN_VERSION = 1 as const;
const WATCH_ACCESS_TOKEN_DEFAULT_TTL_SECONDS = 300;
const WATCH_ACCESS_TOKEN_MIN_TTL_SECONDS = 1;
const WATCH_ACCESS_TOKEN_MAX_TTL_SECONDS = 3600;
const LIVE_SESSION_JOIN_TOKEN_VERSION = 1 as const;
const LIVE_SESSION_JOIN_TOKEN_DEFAULT_TTL_SECONDS = 1800;
const LIVE_SESSION_JOIN_TOKEN_MIN_TTL_SECONDS = 60;
const LIVE_SESSION_JOIN_TOKEN_MAX_TTL_SECONDS = 86_400;
const LIVE_SESSION_EXCLUSIVE_WINDOW_HOURS_DEFAULT = 2;
const LIVE_SESSION_EXCLUSIVE_WINDOW_HOURS_MIN = 1;
const LIVE_SESSION_EXCLUSIVE_WINDOW_HOURS_MAX = 48;
const LIVE_SESSION_PUBLIC_RELEASE_DELAY_MINUTES_MIN = 1440;
const WATCH_TELEMETRY_LOG_LIMIT_DEFAULT = 50;
const WATCH_TELEMETRY_LOG_LIMIT_MIN = 1;
const WATCH_TELEMETRY_LOG_LIMIT_MAX = 200;
const LIBRARY_QUEUE_DEFAULT_LIMIT = 24;
const LIBRARY_QUEUE_MAX_LIMIT = 200;

const COLLECT_ENFORCEMENT_SIGNAL_TYPES: CollectEnforcementSignalType[] = [
  "invalid_listing_action_blocked",
  "invalid_amount_rejected",
  "invalid_transition_blocked",
  "unauthorized_transition_blocked",
  "cross_drop_transition_blocked",
  "invalid_settle_price_rejected",
  "reaward_blocked"
];

const WORKSHOP_PRO_STATES: WorkshopProState[] = ["active", "past_due", "grace", "locked"];

const COLLECT_SIGNAL_SEVERITY: Record<CollectEnforcementSignalType, CollectIntegrityFlagSeverity> = {
  invalid_listing_action_blocked: "warning",
  invalid_amount_rejected: "warning",
  invalid_transition_blocked: "warning",
  unauthorized_transition_blocked: "critical",
  cross_drop_transition_blocked: "critical",
  invalid_settle_price_rejected: "warning",
  reaward_blocked: "info"
};

const TOWNHALL_SHARE_CHANNEL_SET = new Set<TownhallShareChannel>([
  "sms",
  "internal_dm",
  "whatsapp",
  "telegram"
]);
const TOWNHALL_MODERATION_RESOLUTION_SET = new Set<TownhallModerationCaseResolution>([
  "hide",
  "restrict",
  "delete",
  "restore",
  "dismiss"
]);
const TOWNHALL_POST_LINKED_OBJECT_KIND_SET = new Set<TownhallPostLinkedObjectKind>([
  "drop",
  "world",
  "studio"
]);
const LIVE_SESSION_ARTIFACT_KIND_SET = new Set<LiveSessionArtifactKind>([
  "recording",
  "transcript",
  "highlight"
]);
const TOWNHALL_POSTS_FILTER_SET = new Set<TownhallPostsFilter>(["all", "following", "saved"]);
const WORLD_CONVERSATION_MODERATION_RESOLUTION_SET = new Set<WorldConversationModerationResolution>([
  "hide",
  "restrict",
  "delete",
  "restore",
  "dismiss"
]);
const LIVE_SESSION_CONVERSATION_MODERATION_RESOLUTION_SET =
  new Set<LiveSessionConversationModerationResolution>([
    "hide",
    "restrict",
    "delete",
    "restore",
    "dismiss"
  ]);
const TOWNHALL_TELEMETRY_EVENT_SET = new Set<TownhallTelemetryEventType>([
  "watch_time",
  "completion",
  "collect_intent",
  "quality_change",
  "rebuffer",
  "impression",
  "showroom_impression",
  "drop_opened",
  "drop_dwell_time",
  "preview_start",
  "preview_complete",
  "access_start",
  "access_complete",
  "interaction_like",
  "interaction_comment",
  "interaction_share",
  "interaction_save"
]);
const DROP_VERSION_LABEL_SET = new Set<DropVersionLabel>([
  "v1",
  "v2",
  "v3",
  "director_cut",
  "remaster"
]);
const AUTHORIZED_DERIVATIVE_KIND_SET = new Set<AuthorizedDerivativeKind>([
  "remix",
  "translation",
  "anthology_world",
  "collaborative_season"
]);
const WATCH_TELEMETRY_EVENT_SET = new Set<WatchTelemetryEventType>([
  "watch_time",
  "completion",
  "access_start",
  "access_complete",
  "quality_change",
  "rebuffer"
]);
const TOWNHALL_TELEMETRY_EVENT_LOG_LIMIT = 100_000;
const MAX_WATCH_TIME_SECONDS_PER_EVENT = 600;
const WORLD_RELEASE_PACING_WINDOW_HOURS: Record<WorldReleaseQueuePacingMode, number> = {
  manual: 0,
  daily: 24,
  weekly: 168
};

type CompletePendingPaymentOptions = {
  expectedAccountId?: string;
  allowedProviders?: PaymentRecord["provider"][];
};

type StripeWebhookMutationResult = {
  persist: boolean;
  result: StripeWebhookApplyResult;
};

type TownhallSocialMutationResult = {
  persist: boolean;
  result: TownhallDropSocialSnapshot | null;
};

type TownhallTelemetryMutationResult = {
  persist: boolean;
  result: boolean;
};

type TownhallPostMutationResult = {
  persist: boolean;
  result: TownhallPost | null;
};

type StudioConversationLinkedObjectInput = {
  kind: TownhallPostLinkedObjectKind;
  id: string;
};

type StudioConversationThread = {
  studioHandle: string;
  studioTitle: string;
  posts: TownhallPost[];
};

type TownhallCommentModerationResult =
  | {
      ok: true;
      social: TownhallDropSocialSnapshot;
    }
  | {
      ok: false;
      reason: "not_found" | "forbidden";
    };

type WatchAccessTokenClaims = {
  v: typeof WATCH_ACCESS_TOKEN_VERSION;
  jti: string;
  accountId: string;
  dropId: string;
  exp: number;
};

type WatchAccessTokenIssueResult = {
  token: string;
  tokenId: string;
  expiresAt: string;
};

type WatchAccessTokenConsumeReason =
  | "invalid_token"
  | "expired"
  | "binding_mismatch"
  | "not_found"
  | "replayed"
  | "entitlement_revoked";

type WatchAccessTokenConsumeResult =
  | {
      granted: true;
      tokenId: string;
      expiresAt: string;
    }
  | {
      granted: false;
      reason: WatchAccessTokenConsumeReason;
    };

type LiveSessionJoinTokenClaims = {
  v: typeof LIVE_SESSION_JOIN_TOKEN_VERSION;
  jti: string;
  accountId: string;
  sessionId: string;
  dropId: string;
  exp: number;
};

type LiveSessionJoinIssueResult =
  | {
      ok: true;
      result: LiveSessionJoinSnapshot;
    }
  | {
      ok: false;
      reason:
        | "not_found"
        | "not_eligible"
        | "session_inactive"
        | "window_closed"
        | "drop_unavailable"
        | "at_capacity";
    };

type LiveSessionJoinConsumeResult =
  | {
      granted: true;
      liveSession: LiveSession;
    }
  | {
      granted: false;
      reason: "invalid_token" | "expired" | "binding_mismatch" | "window_closed" | "not_found";
    };

type WatchSessionLifecycleFailureReason = "not_found" | "session_ended";

type WatchSessionLifecycleMutationResult =
  | {
      ok: true;
      session: WatchSessionSnapshot;
    }
  | {
      ok: false;
      reason: WatchSessionLifecycleFailureReason;
    };

type WatchSessionHeartbeatInput = {
  accountId: string;
  sessionId: string;
  watchTimeSeconds?: number;
  completionPercent?: number;
  qualityMode?: WatchQualityMode;
  qualityLevel?: WatchQualityLevel;
  qualityReason?: TownhallTelemetryMetadata["qualityReason"];
  rebufferReason?: TownhallTelemetryMetadata["rebufferReason"];
};

type WatchSessionEndInput = {
  accountId: string;
  sessionId: string;
  watchTimeSeconds?: number;
  completionPercent?: number;
  qualityMode?: WatchQualityMode;
  qualityLevel?: WatchQualityLevel;
  qualityReason?: TownhallTelemetryMetadata["qualityReason"];
  rebufferReason?: TownhallTelemetryMetadata["rebufferReason"];
  endReason?: WatchSessionEndReason;
};

function isProductionRuntime(): boolean {
  const appEnv = process.env.OOK_APP_ENV?.trim().toLowerCase();
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  return appEnv === "production" || vercelEnv === "production";
}

function resolveWatchAccessSecret(): string {
  const explicit = process.env.OOK_WATCH_ACCESS_SECRET?.trim();
  if (explicit) {
    return explicit;
  }

  if (isProductionRuntime()) {
    throw new Error("OOK_WATCH_ACCESS_SECRET is required in production");
  }

  return "ook_watch_access_dev_secret";
}

function resolveWatchAccessTokenTtlSeconds(): number {
  const configured = Number(process.env.OOK_WATCH_ACCESS_TOKEN_TTL_SECONDS ?? "");
  if (Number.isFinite(configured)) {
    return Math.min(
      WATCH_ACCESS_TOKEN_MAX_TTL_SECONDS,
      Math.max(WATCH_ACCESS_TOKEN_MIN_TTL_SECONDS, Math.floor(configured))
    );
  }

  return WATCH_ACCESS_TOKEN_DEFAULT_TTL_SECONDS;
}

function resolveLiveSessionJoinSecret(): string {
  const explicit = process.env.OOK_LIVE_SESSION_JOIN_SECRET?.trim();
  if (explicit) {
    return explicit;
  }

  if (isProductionRuntime()) {
    throw new Error("OOK_LIVE_SESSION_JOIN_SECRET is required in production");
  }

  return "ook_live_session_join_dev_secret";
}

function resolveLiveSessionJoinTokenTtlSeconds(): number {
  const configured = Number(process.env.OOK_LIVE_SESSION_JOIN_TOKEN_TTL_SECONDS ?? "");
  if (Number.isFinite(configured)) {
    return Math.min(
      LIVE_SESSION_JOIN_TOKEN_MAX_TTL_SECONDS,
      Math.max(LIVE_SESSION_JOIN_TOKEN_MIN_TTL_SECONDS, Math.floor(configured))
    );
  }

  return LIVE_SESSION_JOIN_TOKEN_DEFAULT_TTL_SECONDS;
}

function resolveLiveSessionExclusiveWindowHours(): number {
  const configured = Number(process.env.OOK_LIVE_SESSION_EXCLUSIVE_WINDOW_HOURS ?? "");
  if (Number.isFinite(configured)) {
    return Math.min(
      LIVE_SESSION_EXCLUSIVE_WINDOW_HOURS_MAX,
      Math.max(LIVE_SESSION_EXCLUSIVE_WINDOW_HOURS_MIN, Math.floor(configured))
    );
  }

  return LIVE_SESSION_EXCLUSIVE_WINDOW_HOURS_DEFAULT;
}

function resolvePatronCommitmentAmountCents(): number {
  const configured = Number.parseInt(process.env.OOK_PATRON_COMMITMENT_AMOUNT_CENTS ?? "", 10);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_PATRON_COMMITMENT_AMOUNT_CENTS;
}

function resolvePatronCommitmentPeriodDays(): number {
  const configured = Number.parseInt(process.env.OOK_PATRON_COMMITMENT_PERIOD_DAYS ?? "", 10);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return DEFAULT_PATRON_COMMITMENT_PERIOD_DAYS;
}

function isPatronCommitmentCadence(value: unknown): value is PatronCommitmentCadence {
  return value === "weekly" || value === "monthly" || value === "quarterly";
}

function resolvePatronCommitmentPeriodDaysForCadence(cadence: PatronCommitmentCadence): number {
  return PATRON_COMMITMENT_CADENCE_TO_PERIOD_DAYS[cadence] ?? DEFAULT_PATRON_COMMITMENT_PERIOD_DAYS;
}

function normalizePatronEarlyAccessWindowHours(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.floor(value);
  if (
    normalized < PATRON_EARLY_ACCESS_WINDOW_HOURS_MIN ||
    normalized > PATRON_EARLY_ACCESS_WINDOW_HOURS_MAX
  ) {
    return null;
  }

  return normalized;
}

function isPatronTierStatus(value: unknown): value is PatronTierStatus {
  return value === "active" || value === "disabled";
}

function isWorkshopProState(value: unknown): value is WorkshopProState {
  return (
    value === "active" ||
    value === "past_due" ||
    value === "grace" ||
    value === "locked"
  );
}

function createWatchAccessSignature(payloadEncoded: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadEncoded, "utf8").digest("base64url");
}

function encodeWatchAccessToken(claims: WatchAccessTokenClaims): string {
  const payloadEncoded = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = createWatchAccessSignature(payloadEncoded, resolveWatchAccessSecret());
  return `${payloadEncoded}.${signature}`;
}

function decodeWatchAccessToken(token: string): WatchAccessTokenClaims | null {
  const normalized = token.trim();
  const [payloadEncoded, signature] = normalized.split(".");
  if (!payloadEncoded || !signature) {
    return null;
  }

  const expected = createWatchAccessSignature(payloadEncoded, resolveWatchAccessSecret());
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== providedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8")) as unknown;
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Partial<WatchAccessTokenClaims>;
  if (
    candidate.v !== WATCH_ACCESS_TOKEN_VERSION ||
    typeof candidate.jti !== "string" ||
    !candidate.jti.trim() ||
    typeof candidate.accountId !== "string" ||
    !candidate.accountId.trim() ||
    typeof candidate.dropId !== "string" ||
    !candidate.dropId.trim() ||
    typeof candidate.exp !== "number" ||
    !Number.isFinite(candidate.exp)
  ) {
    return null;
  }

  return {
    v: WATCH_ACCESS_TOKEN_VERSION,
    jti: candidate.jti,
    accountId: candidate.accountId,
    dropId: candidate.dropId,
    exp: Math.floor(candidate.exp)
  };
}

function createLiveSessionJoinSignature(payloadEncoded: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadEncoded, "utf8").digest("base64url");
}

function encodeLiveSessionJoinToken(claims: LiveSessionJoinTokenClaims): string {
  const payloadEncoded = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = createLiveSessionJoinSignature(payloadEncoded, resolveLiveSessionJoinSecret());
  return `${payloadEncoded}.${signature}`;
}

function decodeLiveSessionJoinToken(token: string): LiveSessionJoinTokenClaims | null {
  const normalized = token.trim();
  const [payloadEncoded, signature] = normalized.split(".");
  if (!payloadEncoded || !signature) {
    return null;
  }

  const expected = createLiveSessionJoinSignature(payloadEncoded, resolveLiveSessionJoinSecret());
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== providedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8")) as unknown;
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Partial<LiveSessionJoinTokenClaims>;
  if (
    candidate.v !== LIVE_SESSION_JOIN_TOKEN_VERSION ||
    typeof candidate.jti !== "string" ||
    !candidate.jti.trim() ||
    typeof candidate.accountId !== "string" ||
    !candidate.accountId.trim() ||
    typeof candidate.sessionId !== "string" ||
    !candidate.sessionId.trim() ||
    typeof candidate.dropId !== "string" ||
    !candidate.dropId.trim() ||
    typeof candidate.exp !== "number" ||
    !Number.isFinite(candidate.exp)
  ) {
    return null;
  }

  return {
    v: LIVE_SESSION_JOIN_TOKEN_VERSION,
    jti: candidate.jti,
    accountId: candidate.accountId,
    sessionId: candidate.sessionId,
    dropId: candidate.dropId,
    exp: Math.floor(candidate.exp)
  };
}

function getLiveSessionExclusiveWindowEndMs(liveSession: LiveSessionRecord): number {
  const explicitEndsAtMs = liveSession.endsAt ? Date.parse(liveSession.endsAt) : Number.NaN;
  if (Number.isFinite(explicitEndsAtMs)) {
    return explicitEndsAtMs;
  }

  const startsAtMs = Date.parse(liveSession.startsAt);
  if (!Number.isFinite(startsAtMs)) {
    return Number.NaN;
  }

  const explicitDelayMinutes =
    typeof liveSession.exclusiveDropWindowDelay === "number" &&
    Number.isFinite(liveSession.exclusiveDropWindowDelay) &&
    liveSession.exclusiveDropWindowDelay >= 1
      ? Math.floor(liveSession.exclusiveDropWindowDelay)
      : null;
  if (explicitDelayMinutes !== null) {
    return startsAtMs + explicitDelayMinutes * 60 * 1000;
  }

  return startsAtMs + resolveLiveSessionExclusiveWindowHours() * 60 * 60 * 1000;
}

function isLiveSessionExclusiveWindowClosed(liveSession: LiveSessionRecord, nowMs: number): boolean {
  const windowEndMs = getLiveSessionExclusiveWindowEndMs(liveSession);
  if (!Number.isFinite(windowEndMs)) {
    return true;
  }

  return nowMs > windowEndMs;
}

function trimWatchAccessGrants(db: BffDatabase): void {
  if (db.watchAccessGrants.length > WATCH_ACCESS_GRANTS_LOG_LIMIT) {
    db.watchAccessGrants.length = WATCH_ACCESS_GRANTS_LOG_LIMIT;
  }
}

function pruneExpiredWatchAccessGrants(db: BffDatabase, nowMs: number): void {
  db.watchAccessGrants = db.watchAccessGrants.filter((grant) => {
    const expiresAtMs = Date.parse(grant.expiresAt);
    if (!Number.isFinite(expiresAtMs)) {
      return false;
    }

    return expiresAtMs >= nowMs;
  });
}

function trimWatchSessions(db: BffDatabase): void {
  if (db.watchSessions.length > WATCH_SESSION_LOG_LIMIT) {
    db.watchSessions.length = WATCH_SESSION_LOG_LIMIT;
  }
}

function normalizeWatchSessionEndReason(
  value: WatchSessionEndInput["endReason"]
): WatchSessionEndReason | null {
  if (
    value === "completed" ||
    value === "user_exit" ||
    value === "network_error" ||
    value === "stalled" ||
    value === "error"
  ) {
    return value;
  }

  return null;
}

function toWatchSessionSnapshot(record: WatchSessionRecord): WatchSessionSnapshot {
  return {
    id: record.id,
    dropId: record.dropId,
    status: record.status,
    startedAt: record.startedAt,
    lastHeartbeatAt: record.lastHeartbeatAt,
    endedAt: record.endedAt,
    endReason: record.endReason,
    heartbeatCount: record.heartbeatCount,
    totalWatchTimeSeconds: Number(record.totalWatchTimeSeconds.toFixed(2)),
    completionPercent: Number(record.completionPercent.toFixed(2)),
    rebufferCount: record.rebufferCount,
    qualityStepDownCount: record.qualityStepDownCount,
    lastQualityMode: record.lastQualityMode,
    lastQualityLevel: record.lastQualityLevel
  };
}

function toSession(account: AccountRecord, sessionToken: string): Session {
  return {
    accountId: account.id,
    email: account.email,
    handle: account.handle,
    displayName: account.displayName,
    roles: account.roles,
    sessionToken,
    avatarUrl: account.avatarUrl,
    bio: account.bio
  };
}

function toPublicCertificate(record: CertificateRecord): Certificate {
  return {
    id: record.id,
    dropId: record.dropId,
    dropTitle: record.dropTitle,
    ownerHandle: record.ownerHandle,
    issuedAt: record.issuedAt,
    receiptId: record.receiptId,
    status: record.status
  };
}

function toPublicReceiptBadge(record: ReceiptBadgeRecord): ReceiptBadge {
  return {
    id: record.id,
    dropTitle: record.dropTitle,
    worldTitle: record.worldTitle,
    collectDate: record.collectDate,
    editionPosition: record.editionPosition,
    collectorHandle: record.collectorHandle,
    createdAt: record.createdAt
  };
}

function resolveReceiptBadgeCollectDate(receipt: PurchaseReceipt): string {
  const collectDate = new Date(receipt.purchasedAt);
  if (Number.isNaN(collectDate.valueOf())) {
    return receipt.purchasedAt;
  }

  return collectDate.toISOString();
}

function resolveReceiptBadgeEditionPosition(
  db: BffDatabase,
  receipt: PurchaseReceipt
): string | undefined {
  const orderedReceipts = db.receipts
    .filter((entry) => entry.dropId === receipt.dropId && entry.status === "completed")
    .sort((a, b) => {
      const byDate = Date.parse(a.purchasedAt) - Date.parse(b.purchasedAt);
      if (byDate !== 0) {
        return byDate;
      }
      return a.id.localeCompare(b.id);
    });

  if (orderedReceipts.length === 0) {
    return undefined;
  }

  const position = orderedReceipts.findIndex((entry) => entry.id === receipt.id);
  if (position < 0) {
    return undefined;
  }

  return `${position + 1} of ${orderedReceipts.length}`;
}

function getDropMap(db: BffDatabase): Map<string, Drop> {
  return new Map(db.catalog.drops.map((drop) => [drop.id, drop]));
}

function getOwnedDrops(db: BffDatabase, accountId: string): OwnedDrop[] {
  const dropsById = getDropMap(db);

  return db.ownerships
    .filter((entry) => entry.accountId === accountId)
    .map((entry) => {
      const drop = dropsById.get(entry.dropId);
      if (!drop) {
        return null;
      }

      return {
        drop,
        certificateId: entry.certificateId,
        acquiredAt: entry.acquiredAt,
        receiptId: entry.receiptId
      } satisfies OwnedDrop;
    })
    .filter((entry): entry is OwnedDrop => entry !== null)
    .sort((a, b) => Date.parse(b.acquiredAt) - Date.parse(a.acquiredAt));
}

function getSavedDrops(db: BffDatabase, accountId: string): LibraryDrop[] {
  const dropsById = getDropMap(db);

  return db.savedDrops
    .filter((entry) => entry.accountId === accountId)
    .map((entry) => {
      const drop = dropsById.get(entry.dropId);
      if (!drop) {
        return null;
      }

      return {
        drop,
        savedAt: entry.savedAt
      } satisfies LibraryDrop;
    })
    .filter((entry): entry is LibraryDrop => entry !== null)
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
}

type LibraryModeSurface = "read" | "listen";

const LIBRARY_QUEUE_STATE_WEIGHT: Record<LibraryQueueProgressState, number> = {
  in_progress: 0,
  pending: 1,
  completed: 2
};

function normalizeLibraryQueueLimit(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return LIBRARY_QUEUE_DEFAULT_LIMIT;
  }

  return Math.min(LIBRARY_QUEUE_MAX_LIMIT, Math.max(1, Math.floor(value)));
}

function toLibraryRecallDelta(
  previousState: LibraryRecallState | null,
  nextState: LibraryRecallState
): LibraryRecallDelta {
  if (!previousState) {
    return "initial";
  }

  if (previousState === nextState) {
    return "stable";
  }

  const previousUnlocked = previousState === "unlocked" || previousState === "owned";
  const nextUnlocked = nextState === "unlocked" || nextState === "owned";
  if (!previousUnlocked && nextUnlocked) {
    return "unlocked";
  }
  if (previousUnlocked && !nextUnlocked) {
    return "relocked";
  }

  return "changed";
}

function evaluateLibraryEligibilitySnapshot(
  db: BffDatabase,
  account: AccountRecord,
  drop: Drop,
  previousState: LibraryRecallState | null,
  evaluatedAt: string
): LibraryEligibilitySnapshot {
  const hasEntitlement = Boolean(findOwnershipByDrop(db, account.id, drop.id));
  const canDiscover = canAccountDiscoverDrop(db, account, drop);
  const canCollectNow = canAccountCollectDropNow(db, account, drop);
  const state: LibraryRecallState = hasEntitlement
    ? "owned"
    : canDiscover && canCollectNow
      ? "unlocked"
      : canDiscover
        ? "scheduled"
        : "gated";

  return {
    state,
    delta: toLibraryRecallDelta(previousState, state),
    previousState,
    canDiscover,
    canCollectNow,
    hasEntitlement,
    evaluatedAt
  };
}

function summarizeLibraryModeResume(
  db: BffDatabase,
  accountId: string,
  dropId: string,
  mode: LibraryModeSurface
): LibraryQueueItem["resume"] {
  const relevantEvents = db.townhallTelemetryEvents.filter(
    (entry) =>
      entry.accountId === accountId &&
      entry.dropId === dropId &&
      entry.metadata?.surface === mode
  );

  let completionPercent = 0;
  let consumedSeconds = 0;
  let positionHint: number | null = null;
  let lastActivityAt: string | null = null;
  let hasActivity = false;
  let hasCompletionSignal = false;

  for (const event of relevantEvents) {
    hasActivity = true;
    if (!lastActivityAt || parseIsoTime(event.occurredAt) > parseIsoTime(lastActivityAt)) {
      lastActivityAt = event.occurredAt;
    }

    completionPercent = Math.max(
      completionPercent,
      Number.isFinite(event.completionPercent) ? event.completionPercent : 0
    );

    if (event.eventType === "watch_time" || event.eventType === "drop_dwell_time") {
      consumedSeconds += Math.max(0, Number(event.watchTimeSeconds) || 0);
    }

    if (typeof event.metadata?.position === "number" && Number.isFinite(event.metadata.position)) {
      positionHint = Math.max(positionHint ?? 0, Math.max(1, Math.floor(event.metadata.position)));
    }

    if (
      (event.eventType === "completion" || event.eventType === "access_complete") &&
      (event.completionPercent >= 100 || event.metadata?.action === "complete")
    ) {
      hasCompletionSignal = true;
    }
  }

  const normalizedCompletionPercent = Math.min(100, Math.max(0, Math.round(completionPercent)));
  const progressState: LibraryQueueProgressState = hasCompletionSignal || normalizedCompletionPercent >= 100
    ? "completed"
    : hasActivity
      ? "in_progress"
      : "pending";
  const normalizedConsumedSeconds = Number(consumedSeconds.toFixed(2));

  const resumeLabel =
    progressState === "completed"
      ? mode === "read"
        ? "read complete"
        : "listen complete"
      : mode === "read"
        ? positionHint !== null
          ? `resume at section ${positionHint}`
          : hasActivity
            ? "resume where you left off"
            : "start reading"
        : normalizedConsumedSeconds > 0
          ? `resume at ${Math.floor(normalizedConsumedSeconds)}s`
          : hasActivity
            ? "resume playback"
            : "start listening";

  return {
    completionPercent: normalizedCompletionPercent,
    progressState,
    lastActivityAt,
    resumeLabel,
    progressLabel: `${normalizedCompletionPercent}% complete`,
    consumedSeconds: normalizedConsumedSeconds,
    positionHint
  };
}

function rankLibraryQueue(
  items: Array<Omit<LibraryQueueItem, "queuePosition">>,
  limit: number
): LibraryQueueItem[] {
  return [...items]
    .sort((left, right) => {
      const leftStateWeight = LIBRARY_QUEUE_STATE_WEIGHT[left.resume.progressState] ?? 99;
      const rightStateWeight = LIBRARY_QUEUE_STATE_WEIGHT[right.resume.progressState] ?? 99;
      if (leftStateWeight !== rightStateWeight) {
        return leftStateWeight - rightStateWeight;
      }

      const leftActivityRank = left.resume.lastActivityAt ? parseIsoTime(left.resume.lastActivityAt) : 0;
      const rightActivityRank = right.resume.lastActivityAt ? parseIsoTime(right.resume.lastActivityAt) : 0;
      if (leftActivityRank !== rightActivityRank) {
        return rightActivityRank - leftActivityRank;
      }

      const leftSavedRank = parseIsoTime(left.savedAt);
      const rightSavedRank = parseIsoTime(right.savedAt);
      if (leftSavedRank !== rightSavedRank) {
        return rightSavedRank - leftSavedRank;
      }

      return left.drop.id.localeCompare(right.drop.id);
    })
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      queuePosition: index + 1
    }));
}

function toLatestTimestamp(values: Array<string | null | undefined>): string {
  const parsed = values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  if (parsed.length === 0) {
    return new Date().toISOString();
  }

  return new Date(Math.max(...parsed)).toISOString();
}

function toWorkshopAnalyticsPanel(db: BffDatabase, account: AccountRecord): WorkshopAnalyticsPanel {
  const studioDrops = db.catalog.drops.filter((drop) => drop.studioHandle === account.handle);
  const studioDropIds = new Set(studioDrops.map((drop) => drop.id));
  const telemetry = db.townhallTelemetryEvents.filter((entry) => studioDropIds.has(entry.dropId));
  const completedReceipts = db.receipts.filter(
    (receipt) => receipt.status === "completed" && studioDropIds.has(receipt.dropId)
  );
  const discoveryImpressions = telemetry.filter(
    (entry) => entry.eventType === "impression" || entry.eventType === "showroom_impression"
  ).length;
  const previewStarts = telemetry.filter((entry) => entry.eventType === "preview_start").length;
  const accessStarts = telemetry.filter((entry) => entry.eventType === "access_start").length;
  const completions = telemetry.filter((entry) => entry.eventType === "completion").length;
  const collectIntents = telemetry.filter((entry) => entry.eventType === "collect_intent").length;
  const completedCollects = completedReceipts.length;
  const collectConversionRate =
    collectIntents > 0 ? Number((completedCollects / collectIntents).toFixed(4)) : 0;

  const payoutUsd = clampCurrencyAmount(
    completedReceipts.reduce((sum, receipt) => sum + (receipt.payoutUsd ?? 0), 0)
  );
  const grossUsd = clampCurrencyAmount(
    completedReceipts.reduce((sum, receipt) => sum + receipt.amountUsd, 0)
  );
  const processingUsd = clampCurrencyAmount(
    completedReceipts.reduce((sum, receipt) => sum + (receipt.processingUsd ?? 0), 0)
  );
  const commissionUsd = clampCurrencyAmount(
    completedReceipts.reduce((sum, receipt) => sum + (receipt.commissionUsd ?? 0), 0)
  );

  const collectTransactionById = new Map<string, LedgerTransactionRecord>(
    db.ledgerTransactions
      .filter((entry) => entry.kind === "collect")
      .map((entry) => [entry.id, entry])
  );
  const payoutLineItemsByTransactionId = db.ledgerLineItems
    .filter((entry) => entry.kind === "artist_payout_collect")
    .reduce<Map<string, LedgerLineItemRecord[]>>((acc, entry) => {
      const current = acc.get(entry.transactionId) ?? [];
      current.push(entry);
      acc.set(entry.transactionId, current);
      return acc;
    }, new Map<string, LedgerLineItemRecord[]>());

  let payoutLedgerUsd = 0;
  let payoutLedgerLineItems = 0;
  let missingLedgerReceiptCount = 0;
  const payoutRecipientAccountIds = new Set<string>();
  const linkedCollectTransactionIds = new Set<string>();
  for (const receipt of completedReceipts) {
    const ledgerTransactionId = receipt.ledgerTransactionId ?? null;
    if (!ledgerTransactionId) {
      missingLedgerReceiptCount += 1;
      continue;
    }

    const collectTransaction = collectTransactionById.get(ledgerTransactionId) ?? null;
    if (!collectTransaction) {
      missingLedgerReceiptCount += 1;
      continue;
    }

    linkedCollectTransactionIds.add(collectTransaction.id);
    const payoutLineItems = payoutLineItemsByTransactionId.get(collectTransaction.id) ?? [];
    payoutLedgerLineItems += payoutLineItems.length;
    payoutLedgerUsd += payoutLineItems.reduce((sum, entry) => sum + entry.amountUsd, 0);

    for (const lineItem of payoutLineItems) {
      if (lineItem.recipientAccountId) {
        payoutRecipientAccountIds.add(lineItem.recipientAccountId);
      }
    }
  }

  const payoutLedgerUsdRounded = clampCurrencyAmount(payoutLedgerUsd);
  const payoutParityDeltaUsd = clampSignedCurrencyAmount(payoutUsd - payoutLedgerUsdRounded);
  const linkedCollectTransactions = Array.from(linkedCollectTransactionIds.values())
    .map((transactionId) => collectTransactionById.get(transactionId))
    .filter((entry): entry is LedgerTransactionRecord => Boolean(entry));
  const linkedPayoutLineItems = linkedCollectTransactions.flatMap(
    (transaction) => payoutLineItemsByTransactionId.get(transaction.id) ?? []
  );

  // Resale royalty earnings: find all resale ledger transactions on this creator's drops
  // where the creator_royalty_resale line item is addressed to this creator
  const resaleTransactions = db.ledgerTransactions.filter(
    (entry) => entry.kind === "resale" && entry.dropId !== null && studioDropIds.has(entry.dropId)
  );
  const resaleTransactionIds = new Set(resaleTransactions.map((entry) => entry.id));
  const royaltyLineItems = db.ledgerLineItems.filter(
    (entry) =>
      resaleTransactionIds.has(entry.transactionId) &&
      entry.kind === "creator_royalty_resale" &&
      entry.recipientAccountId === account.id
  );
  const royaltyGrossUsd = clampCurrencyAmount(
    royaltyLineItems.reduce((sum, entry) => sum + entry.amountUsd, 0)
  );

  const freshnessTimestamp = toLatestTimestamp(
    telemetry.map((entry) => entry.occurredAt).concat(
      completedReceipts.map((receipt) => receipt.purchasedAt),
      studioDrops.map((drop) => drop.releaseDate),
      linkedCollectTransactions.map((transaction) => transaction.createdAt),
      linkedPayoutLineItems.map((lineItem) => lineItem.createdAt),
      resaleTransactions.map((entry) => entry.createdAt)
    )
  );

  return {
    studioHandle: account.handle,
    dropsPublished: studioDrops.length,
    discoveryImpressions,
    previewStarts,
    accessStarts,
    completions,
    collectIntents,
    completedCollects,
    collectConversionRate,
    payouts: {
      completedReceipts: completedReceipts.length,
      grossUsd,
      processingUsd,
      commissionUsd,
      payoutUsd,
      payoutLedgerUsd: payoutLedgerUsdRounded,
      payoutParityDeltaUsd,
      payoutLedgerLineItems,
      payoutRecipients: payoutRecipientAccountIds.size,
      missingLedgerReceiptCount
    },
    resaleRoyalties: {
      resaleTransactions: resaleTransactions.length,
      royaltyGrossUsd,
      royaltyLedgerLineItems: royaltyLineItems.length
    },
    freshnessTimestamp,
    updatedAt: freshnessTimestamp
  };
}

function toMyCollectionAnalyticsPanel(
  db: BffDatabase,
  account: AccountRecord
): MyCollectionAnalyticsPanel {
  const ownedDrops = getOwnedDrops(db, account.id);
  const completedReceipts = db.receipts.filter(
    (receipt) => receipt.accountId === account.id && receipt.status === "completed"
  );
  const totalSpentUsd = completedReceipts.reduce((sum, receipt) => sum + receipt.amountUsd, 0);
  const averageCollectPriceUsd =
    completedReceipts.length > 0 ? Number((totalSpentUsd / completedReceipts.length).toFixed(2)) : 0;
  const nowMs = Date.now();
  const recentCollectCount30d = completedReceipts.filter((receipt) => {
    const purchasedAt = parseIsoTime(receipt.purchasedAt);
    if (purchasedAt <= 0) {
      return false;
    }

    return nowMs - purchasedAt <= 30 * 24 * 60 * 60 * 1000;
  }).length;
  const worldCount = new Set(ownedDrops.map((entry) => entry.drop.worldId)).size;
  const likes = db.townhallLikes.filter((entry) => entry.accountId === account.id).length;
  const comments = db.townhallComments.filter((entry) => entry.accountId === account.id).length;
  const shares = db.townhallShares.filter((entry) => entry.accountId === account.id).length;
  const saves = db.savedDrops.filter((entry) => entry.accountId === account.id).length;

  // Resale activity: pieces sold (seller payout addressed to this account) and purchased via resale
  const sellerPayoutLineItems = db.ledgerLineItems.filter(
    (entry) =>
      entry.kind === "seller_payout_resale" &&
      entry.recipientAccountId === account.id
  );
  const soldCount = sellerPayoutLineItems.length;
  const soldProceedsUsd = clampCurrencyAmount(
    sellerPayoutLineItems.reduce((sum, entry) => sum + entry.amountUsd, 0)
  );
  const purchasedViaResaleCount = db.ledgerTransactions.filter(
    (entry) => entry.kind === "resale" && entry.accountId === account.id
  ).length;

  return {
    accountHandle: account.handle,
    holdingsCount: ownedDrops.length,
    worldCount,
    totalSpentUsd: Number(totalSpentUsd.toFixed(2)),
    averageCollectPriceUsd,
    recentCollectCount30d,
    resaleActivity: {
      soldCount,
      soldProceedsUsd,
      purchasedViaResaleCount
    },
    participation: {
      likes,
      comments,
      shares,
      saves
    },
    updatedAt: toLatestTimestamp(
      completedReceipts
        .map((receipt) => receipt.purchasedAt)
        .concat(
          ownedDrops.map((entry) => entry.acquiredAt),
          db.townhallLikes.filter((entry) => entry.accountId === account.id).map((entry) => entry.likedAt),
          db.townhallComments
            .filter((entry) => entry.accountId === account.id)
            .map((entry) => entry.createdAt),
          db.townhallShares.filter((entry) => entry.accountId === account.id).map((entry) => entry.sharedAt),
          db.savedDrops.filter((entry) => entry.accountId === account.id).map((entry) => entry.savedAt)
        )
    )
  };
}

function toOpsAnalyticsPanel(db: BffDatabase): OpsAnalyticsPanel {
  const completedReceipts = db.receipts.filter((receipt) => receipt.status === "completed");
  const refundedReceipts = db.receipts.filter((receipt) => receipt.status === "refunded");
  const missingLedgerLinks = completedReceipts.filter((receipt) => {
    const ledgerTransactionId = receipt.ledgerTransactionId ?? null;
    if (!ledgerTransactionId) {
      return true;
    }

    return !db.ledgerTransactions.some((entry) => entry.id === ledgerTransactionId);
  }).length;
  const pendingPayments = db.payments.filter((payment) => payment.status === "pending").length;
  const failedPayments = db.payments.filter((payment) => payment.status === "failed").length;
  const refundedPayments = db.payments.filter((payment) => payment.status === "refunded").length;
  const watchSessionErrors = db.watchSessions.filter(
    (entry) => entry.endReason === "network_error" || entry.endReason === "error"
  ).length;
  const watchSessionStalls = db.watchSessions.filter((entry) => entry.endReason === "stalled").length;
  const rebufferEvents = db.townhallTelemetryEvents.filter((entry) => entry.eventType === "rebuffer").length;
  const qualityStepDowns = db.watchSessions.reduce(
    (sum, entry) => sum + Math.max(0, entry.qualityStepDownCount),
    0
  );

  return {
    settlement: {
      completedReceipts: completedReceipts.length,
      refundedReceipts: refundedReceipts.length,
      ledgerTransactions: db.ledgerTransactions.length,
      ledgerLineItems: db.ledgerLineItems.length,
      missingLedgerLinks
    },
    webhooks: {
      processedEvents: db.stripeWebhookEvents.length,
      pendingPayments,
      failedPayments,
      refundedPayments
    },
    reliability: {
      watchSessionErrors,
      watchSessionStalls,
      rebufferEvents,
      qualityStepDowns
    },
    updatedAt: toLatestTimestamp(
      db.receipts
        .map((receipt) => receipt.purchasedAt)
        .concat(
          db.payments.map((payment) => payment.updatedAt),
          db.stripeWebhookEvents.map((event) => event.processedAt),
          db.watchSessions.map((session) => session.lastHeartbeatAt),
          db.townhallTelemetryEvents.map((entry) => entry.occurredAt),
          db.ledgerTransactions.map((entry) => entry.createdAt)
        )
    )
  };
}

function findAccountById(db: BffDatabase, accountId: string): AccountRecord | null {
  return db.accounts.find((account) => account.id === accountId) ?? null;
}

function findAccountByHandle(db: BffDatabase, handle: string): AccountRecord | null {
  return db.accounts.find((account) => account.handle === handle) ?? null;
}

function findDropById(db: BffDatabase, dropId: string): Drop | null {
  return db.catalog.drops.find((drop) => drop.id === dropId) ?? null;
}

function findWorldById(db: BffDatabase, worldId: string): World | null {
  return db.catalog.worlds.find((world) => world.id === worldId) ?? null;
}

function resolveDropVisibility(drop: Drop): "public" | "world_members" | "collectors_only" {
  if (drop.visibility === "world_members" || drop.visibility === "collectors_only") {
    return drop.visibility;
  }
  return "public";
}

function canAccountDiscoverDrop(db: BffDatabase, account: AccountRecord | null, drop: Drop): boolean {
  const nowMs = resolveCurrentTimeMs();
  const releaseAtMs = parseDropReleaseAtMs(drop);
  if (releaseAtMs !== null && nowMs < releaseAtMs) {
    if (!account) {
      return false;
    }

    if (account.roles.includes("creator") && account.handle === drop.studioHandle) {
      return true;
    }

    if (findOwnershipByDrop(db, account.id, drop.id)) {
      return true;
    }

    return false;
  }

  const visibility = resolveDropVisibility(drop);
  if (visibility === "public") {
    return true;
  }

  if (!account) {
    return false;
  }

  if (account.roles.includes("creator") && account.handle === drop.studioHandle) {
    return true;
  }

  if (findOwnershipByDrop(db, account.id, drop.id)) {
    return true;
  }

  if (visibility === "collectors_only") {
    return false;
  }

  const world = findWorldById(db, drop.worldId);
  if (!world) {
    return false;
  }

  return hasActiveMembershipForWorld(db, account, world) || hasCollectEntitlementForWorld(db, account, world);
}

function listDiscoverableDrops(
  db: BffDatabase,
  viewerAccountId: string | null | undefined
): Drop[] {
  if (viewerAccountId === undefined) {
    return [...db.catalog.drops];
  }

  const account = viewerAccountId ? findAccountById(db, viewerAccountId) : null;
  return db.catalog.drops.filter((drop) => canAccountDiscoverDrop(db, account, drop));
}

function toWorldCollectOwnership(record: WorldCollectOwnershipRecord): WorldCollectOwnership {
  return {
    id: record.id,
    accountId: record.accountId,
    worldId: record.worldId,
    bundleType: record.bundleType,
    status: record.status,
    purchasedAt: record.purchasedAt,
    amountPaidUsd: Number(record.amountPaidUsd.toFixed(2)),
    previousOwnershipCreditUsd: Number(record.previousOwnershipCreditUsd.toFixed(2)),
    prorationStrategy: record.prorationStrategy,
    upgradedToBundleType: record.upgradedToBundleType,
    upgradedAt: record.upgradedAt
  };
}

function getWorldCollectOwnershipsForAccount(
  db: BffDatabase,
  accountId: string
): WorldCollectOwnership[] {
  return db.worldCollectOwnerships
    .filter((record) => record.accountId === accountId)
    .map((record) => toWorldCollectOwnership(record))
    .sort((a, b) => Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt));
}

function buildWorldCollectBundleSnapshot(
  db: BffDatabase,
  accountId: string,
  world: World
): WorldCollectBundleSnapshot {
  const worldDrops = db.catalog.drops.filter((drop) => drop.worldId === world.id);
  const memberships = db.membershipEntitlements
    .filter((membership) => membership.accountId === accountId)
    .map((membership) => toMembershipEntitlement(db, membership));
  const accountOwnerships = getWorldCollectOwnershipsForAccount(db, accountId);
  const activeOwnership = getActiveWorldCollectOwnership(accountOwnerships, accountId, world.id);
  const bundles = buildWorldCollectBundleOptions({
    world,
    drops: worldDrops,
    activeOwnership,
    memberships
  });

  return {
    world,
    activeOwnership,
    bundles
  };
}

function clampCurrencyAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(Math.max(0, value).toFixed(2));
}

function clampSignedCurrencyAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(2));
}

function trimWorldCollectOwnerships(db: BffDatabase): void {
  if (db.worldCollectOwnerships.length > WORLD_COLLECT_OWNERSHIP_LOG_LIMIT) {
    db.worldCollectOwnerships.length = WORLD_COLLECT_OWNERSHIP_LOG_LIMIT;
  }
}

function findOwnershipByDrop(db: BffDatabase, accountId: string, dropId: string) {
  return db.ownerships.find((entry) => entry.accountId === accountId && entry.dropId === dropId) ?? null;
}

function resolveCollectQuote(db: BffDatabase, drop: Drop): SettlementQuote {
  const defaultArtistAccountId = findAccountByHandle(db, drop.studioHandle)?.id ?? null;
  const derivativeSettlement = db.authorizedDerivatives
    .filter((record) => record.derivativeDropId === drop.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];

  const payoutRecipients = derivativeSettlement
    ? derivativeSettlement.revenueSplits
        .filter((entry) => Number.isFinite(entry.sharePercent) && entry.sharePercent > 0)
        .map((entry) => ({
          recipientAccountId:
            findAccountByHandle(db, entry.recipientHandle)?.id ?? defaultArtistAccountId,
          sharePercent: Number(entry.sharePercent)
        }))
    : undefined;

  return buildCollectSettlementQuote({
    subtotalUsd: clampCurrencyAmount(drop.priceUsd),
    processingUsd: PROCESSING_FEE_USD,
    artistAccountId: defaultArtistAccountId,
    payoutRecipients
  });
}

function appendLedgerEntries(
  db: BffDatabase,
  input: {
    kind: LedgerTransaction["kind"];
    accountId: string;
    dropId: string | null;
    paymentId: string | null;
    receiptId: string | null;
    quote: SettlementQuote;
    createdAt: string;
    reversalOfTransactionId?: string | null;
    lineItems?: SettlementQuote["lineItems"];
  }
): {
  transaction: LedgerTransactionRecord;
  lineItems: LedgerLineItemRecord[];
} {
  const transactionId = `ltrx_${randomUUID()}`;
  const transaction: LedgerTransactionRecord = {
    id: transactionId,
    kind: input.kind,
    accountId: input.accountId,
    dropId: input.dropId,
    paymentId: input.paymentId,
    receiptId: input.receiptId,
    currency: input.quote.currency,
    subtotalUsd: input.quote.subtotalUsd,
    processingUsd: input.quote.processingUsd,
    totalUsd: input.quote.totalUsd,
    commissionUsd: input.quote.commissionUsd,
    payoutUsd: input.quote.payoutUsd,
    reversalOfTransactionId: input.reversalOfTransactionId ?? null,
    createdAt: input.createdAt
  };

  const quoteLineItems = input.lineItems ?? input.quote.lineItems;
  const lineItems: LedgerLineItemRecord[] = quoteLineItems.map((lineItem) => ({
    id: `lli_${randomUUID()}`,
    transactionId,
    kind: lineItem.kind,
    scope: lineItem.scope,
    amountUsd: clampSignedCurrencyAmount(lineItem.amountUsd),
    currency: lineItem.currency,
    recipientAccountId: lineItem.recipientAccountId,
    createdAt: input.createdAt
  }));

  db.ledgerTransactions.push(transaction);
  db.ledgerLineItems.push(...lineItems);

  return {
    transaction,
    lineItems
  };
}

function resolveReceiptLineItems(db: BffDatabase, receiptId: string): SettlementLineItem[] {
  const transactions = db.ledgerTransactions.filter((entry) => entry.receiptId === receiptId);
  if (transactions.length === 0) {
    return [];
  }

  const transactionIdSet = new Set(transactions.map((entry) => entry.id));
  return db.ledgerLineItems
    .filter((entry) => transactionIdSet.has(entry.transactionId))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function buildReceiptWithSettlement(
  db: BffDatabase,
  receipt: PurchaseReceipt
): PurchaseReceipt {
  return {
    ...receipt,
    lineItems: resolveReceiptLineItems(db, receipt.id)
  };
}

function resolvePublicLineItemAmountUsd(
  db: BffDatabase,
  transactionId: string,
  kind: SettlementLineItem["kind"]
): number | null {
  const amount = db.ledgerLineItems
    .filter((entry) => entry.transactionId === transactionId && entry.scope === "public" && entry.kind === kind)
    .reduce((sum, entry) => sum + entry.amountUsd, 0);
  if (!Number.isFinite(amount)) {
    return null;
  }
  return Number(amount.toFixed(2));
}

function buildDropOwnershipHistory(db: BffDatabase, dropId: string): DropOwnershipHistory {
  const ownershipTransactions = db.ledgerTransactions.filter(
    (
      entry
    ): entry is LedgerTransactionRecord & {
      kind: "collect" | "refund" | "resale";
    } => entry.dropId === dropId && (entry.kind === "collect" || entry.kind === "refund" || entry.kind === "resale")
  );

  const entries: OwnershipHistoryEntry[] = ownershipTransactions
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((entry) => {
      const actor = findAccountById(db, entry.accountId);
      const certificate = entry.receiptId
        ? db.certificates.find((candidate) => candidate.receiptId === entry.receiptId) ?? null
        : null;
      return {
        id: entry.id,
        dropId,
        occurredAt: entry.createdAt,
        kind: entry.kind,
        actorHandle: actor?.handle ?? "unknown",
        receiptId: entry.receiptId,
        certificateId: certificate?.id ?? null,
        publicAmountUsd: resolvePublicLineItemAmountUsd(db, entry.id, "collect_subtotal")
      };
    });

  return {
    dropId,
    entries
  };
}

function toDropVersion(record: DropVersionRecord): DropVersion {
  return {
    id: record.id,
    dropId: record.dropId,
    label: record.label,
    notes: record.notes,
    createdByHandle: record.createdByHandle,
    createdAt: record.createdAt,
    releasedAt: record.releasedAt
  };
}

function toAuthorizedDerivative(record: AuthorizedDerivativeRecord): AuthorizedDerivative {
  return {
    id: record.id,
    sourceDropId: record.sourceDropId,
    derivativeDropId: record.derivativeDropId,
    kind: record.kind,
    attribution: record.attribution,
    revenueSplits: record.revenueSplits.map((entry) => ({
      recipientHandle: entry.recipientHandle,
      sharePercent: Number(entry.sharePercent.toFixed(2))
    })),
    authorizedByHandle: record.authorizedByHandle,
    createdAt: record.createdAt
  };
}

function buildDropLineageSnapshot(db: BffDatabase, dropId: string): DropLineageSnapshot {
  const versions = db.dropVersions
    .filter((record) => record.dropId === dropId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((record) => toDropVersion(record));

  const derivatives = db.authorizedDerivatives
    .filter((record) => record.sourceDropId === dropId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((record) => toAuthorizedDerivative(record));

  return {
    dropId,
    versions,
    derivatives
  };
}

function hasValidRevenueSplitTotal(
  splits: CreateAuthorizedDerivativeInput["revenueSplits"]
): boolean {
  const total = Number(
    splits.reduce((sum, entry) => sum + Number(entry.sharePercent ?? 0), 0).toFixed(2)
  );
  return Math.abs(total - 100) <= 0.01;
}

function seedOnboardingDiscoverySignalsInDatabase(
  db: BffDatabase,
  accountId: string,
  cardIds: string[]
): {
  persist: boolean;
  result: {
    savedDropsSeeded: number;
    followSignalsSeeded: number;
    telemetrySignalsSeeded: number;
  };
} {
  const account = findAccountById(db, accountId);
  if (!account) {
    return {
      persist: false,
      result: {
        savedDropsSeeded: 0,
        followSignalsSeeded: 0,
        telemetrySignalsSeeded: 0
      }
    };
  }

  const seed = resolveOnboardingDiscoverySeed(cardIds);
  if (seed.dropIds.length === 0) {
    return {
      persist: false,
      result: {
        savedDropsSeeded: 0,
        followSignalsSeeded: 0,
        telemetrySignalsSeeded: 0
      }
    };
  }

  const nowIso = new Date().toISOString();
  let savedDropsSeeded = 0;
  let followSignalsSeeded = 0;
  let telemetrySignalsSeeded = 0;

  for (const dropId of seed.dropIds) {
    const drop = findDropById(db, dropId);
    if (!drop) {
      continue;
    }

    const alreadySaved = db.savedDrops.some(
      (entry) => entry.accountId === account.id && entry.dropId === drop.id
    );
    if (!alreadySaved) {
      db.savedDrops.unshift({
        accountId: account.id,
        dropId: drop.id,
        savedAt: nowIso
      });
      savedDropsSeeded += 1;

      db.townhallTelemetryEvents.unshift({
        id: `tel_${randomUUID()}`,
        accountId: account.id,
        dropId: drop.id,
        eventType: "interaction_save",
        watchTimeSeconds: 0,
        completionPercent: 0,
        metadata: {
          source: "showroom",
          surface: "townhall",
          action: "toggle"
        },
        occurredAt: nowIso
      } satisfies TownhallTelemetryEventRecord);
      telemetrySignalsSeeded += 1;
    }
  }

  const followedStudios = new Set(
    db.savedDrops
      .filter((entry) => entry.accountId === account.id)
      .map((entry) => findDropById(db, entry.dropId)?.studioHandle ?? null)
      .filter((studioHandle): studioHandle is string => Boolean(studioHandle))
  );
  followSignalsSeeded = seed.studioHandles.reduce((count, studioHandle) => {
    return followedStudios.has(studioHandle) ? count + 1 : count;
  }, 0);

  if (db.townhallTelemetryEvents.length > TOWNHALL_TELEMETRY_EVENT_LOG_LIMIT) {
    db.townhallTelemetryEvents.length = TOWNHALL_TELEMETRY_EVENT_LOG_LIMIT;
  }

  return {
    persist: savedDropsSeeded > 0 || telemetrySignalsSeeded > 0,
    result: {
      savedDropsSeeded,
      followSignalsSeeded,
      telemetrySignalsSeeded
    }
  };
}

function issueOwnershipAndReceipt(
  db: BffDatabase,
  account: AccountRecord,
  drop: Drop,
  options: {
    quote: SettlementQuote;
    receiptId?: string;
    purchasedAt?: string;
    paymentId?: string | null;
  }
): PurchaseReceipt {
  const purchasedAt = options.purchasedAt ?? new Date().toISOString();
  const receiptId = options.receiptId ?? `rcpt_${randomUUID()}`;
  const ledger = appendLedgerEntries(db, {
    kind: "collect",
    accountId: account.id,
    dropId: drop.id,
    paymentId: options.paymentId ?? null,
    receiptId,
    quote: options.quote,
    createdAt: purchasedAt
  });

  const receipt: PurchaseReceipt = {
    id: receiptId,
    accountId: account.id,
    dropId: drop.id,
    amountUsd: options.quote.totalUsd,
    subtotalUsd: options.quote.subtotalUsd,
    processingUsd: options.quote.processingUsd,
    commissionUsd: options.quote.commissionUsd,
    payoutUsd: options.quote.payoutUsd,
    quoteEngineVersion: options.quote.engineVersion,
    ledgerTransactionId: ledger.transaction.id,
    lineItems: ledger.lineItems,
    status: "completed",
    purchasedAt
  };

  const certificateId = `cert_${randomUUID()}`;
  const certificate: CertificateRecord = {
    id: certificateId,
    dropId: drop.id,
    dropTitle: drop.title,
    ownerHandle: account.handle,
    issuedAt: purchasedAt,
    receiptId,
    status: "verified",
    ownerAccountId: account.id
  };

  db.receipts.unshift(receipt);
  db.certificates.push(certificate);
  db.ownerships.unshift({
    accountId: account.id,
    dropId: drop.id,
    certificateId,
    receiptId,
    acquiredAt: purchasedAt
  });

  return buildReceiptWithSettlement(db, receipt);
}

function markRefundByReceipt(db: BffDatabase, accountId: string, receiptId: string): boolean {
  const receipt = db.receipts.find((entry) => entry.id === receiptId && entry.accountId === accountId);
  if (!receipt || receipt.status !== "completed") {
    return false;
  }

  receipt.status = "refunded";

  const ownershipIndex = db.ownerships.findIndex(
    (entry) => entry.accountId === accountId && entry.receiptId === receiptId
  );
  if (ownershipIndex >= 0) {
    db.ownerships.splice(ownershipIndex, 1);
  }

  const certificate = db.certificates.find(
    (entry) => entry.ownerAccountId === accountId && entry.receiptId === receiptId
  );
  if (certificate) {
    certificate.status = "revoked";
  }

  const originalTransaction = db.ledgerTransactions
    .filter((entry) => entry.receiptId === receiptId && entry.kind === "collect")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  const hasReversal = db.ledgerTransactions.some(
    (entry) =>
      entry.receiptId === receiptId &&
      entry.kind === "refund" &&
      entry.reversalOfTransactionId === originalTransaction?.id
  );

  if (originalTransaction && !hasReversal) {
    const reversedLineItems = db.ledgerLineItems
      .filter((entry) => entry.transactionId === originalTransaction.id)
      .map((entry) => ({
        kind: entry.kind,
        scope: entry.scope,
        amountUsd: clampSignedCurrencyAmount(-entry.amountUsd),
        currency: entry.currency,
        recipientAccountId: entry.recipientAccountId
      }));

    appendLedgerEntries(db, {
      kind: "refund",
      accountId,
      dropId: originalTransaction.dropId,
      paymentId: originalTransaction.paymentId,
      receiptId,
      quote: {
        engineVersion: "quote_engine_v1",
        quoteKind: "collect",
        subtotalUsd: clampSignedCurrencyAmount(-originalTransaction.subtotalUsd),
        processingUsd: clampSignedCurrencyAmount(-originalTransaction.processingUsd),
        totalUsd: clampSignedCurrencyAmount(-originalTransaction.totalUsd),
        commissionUsd: clampSignedCurrencyAmount(-originalTransaction.commissionUsd),
        payoutUsd: clampSignedCurrencyAmount(-originalTransaction.payoutUsd),
        currency: originalTransaction.currency,
        lineItems: reversedLineItems
      },
      createdAt: new Date().toISOString(),
      reversalOfTransactionId: originalTransaction.id,
      lineItems: reversedLineItems
    });
  }

  return true;
}

function findPaymentForWebhook(
  db: BffDatabase,
  input: {
    paymentId?: string;
    checkoutSessionId?: string;
    providerPaymentIntentId?: string;
  }
): PaymentRecord | null {
  if (input.paymentId) {
    const byPaymentId = db.payments.find((payment) => payment.id === input.paymentId);
    if (byPaymentId) return byPaymentId;
  }

  if (input.checkoutSessionId) {
    const bySession = db.payments.find((payment) => payment.checkoutSessionId === input.checkoutSessionId);
    if (bySession) return bySession;
  }

  if (input.providerPaymentIntentId) {
    const byIntent = db.payments.find(
      (payment) => payment.providerPaymentIntentId === input.providerPaymentIntentId
    );
    if (byIntent) return byIntent;
  }

  return null;
}

function hasProcessedStripeWebhookEvent(db: BffDatabase, eventId: string): boolean {
  return db.stripeWebhookEvents.some((entry) => entry.eventId === eventId);
}

function rememberProcessedStripeWebhookEvent(db: BffDatabase, eventId: string): void {
  db.stripeWebhookEvents.unshift({
    eventId,
    processedAt: new Date().toISOString()
  });

  if (db.stripeWebhookEvents.length > STRIPE_WEBHOOK_EVENT_LOG_LIMIT) {
    db.stripeWebhookEvents.length = STRIPE_WEBHOOK_EVENT_LOG_LIMIT;
  }
}

function isTownhallShareChannel(value: string): value is TownhallShareChannel {
  return TOWNHALL_SHARE_CHANNEL_SET.has(value as TownhallShareChannel);
}

function isLiveSessionArtifactKind(value: string): value is LiveSessionArtifactKind {
  return LIVE_SESSION_ARTIFACT_KIND_SET.has(value as LiveSessionArtifactKind);
}

function isTownhallPostsFilter(value: string): value is TownhallPostsFilter {
  return TOWNHALL_POSTS_FILTER_SET.has(value as TownhallPostsFilter);
}

function isTownhallTelemetryEventType(value: string): value is TownhallTelemetryEventType {
  return TOWNHALL_TELEMETRY_EVENT_SET.has(value as TownhallTelemetryEventType);
}

function isWatchTelemetryEventType(value: string): value is WatchTelemetryEventType {
  return WATCH_TELEMETRY_EVENT_SET.has(value as WatchTelemetryEventType);
}

function normalizeWatchTelemetryLogLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) {
    return WATCH_TELEMETRY_LOG_LIMIT_DEFAULT;
  }

  return Math.min(
    WATCH_TELEMETRY_LOG_LIMIT_MAX,
    Math.max(WATCH_TELEMETRY_LOG_LIMIT_MIN, Math.floor(Number(limit)))
  );
}

function normalizeWatchTimeSeconds(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_WATCH_TIME_SECONDS_PER_EVENT, Math.max(0, Number(value)));
}

function normalizeCompletionPercent(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Number(value)));
}

function normalizeTownhallTelemetryMetadata(
  value: TownhallTelemetryMetadata | undefined
): TownhallTelemetryMetadata {
  if (!value) {
    return {};
  }

  const metadata: TownhallTelemetryMetadata = {};

  if (value.source === "showroom" || value.source === "drop") {
    metadata.source = value.source;
  }

  if (
    value.surface === "townhall" ||
    value.surface === "watch" ||
    value.surface === "listen" ||
    value.surface === "read" ||
    value.surface === "photos" ||
    value.surface === "live"
  ) {
    metadata.surface = value.surface;
  }

  if (
    value.mediaFilter === "all" ||
    value.mediaFilter === "agora" ||
    value.mediaFilter === "watch" ||
    value.mediaFilter === "listen" ||
    value.mediaFilter === "read" ||
    value.mediaFilter === "photos" ||
    value.mediaFilter === "live"
  ) {
    metadata.mediaFilter = value.mediaFilter;
  }

  if (
    value.ordering === "featured" ||
    value.ordering === "for_you" ||
    value.ordering === "rising" ||
    value.ordering === "newest" ||
    value.ordering === "most_collected" ||
    value.ordering === "new_voices" ||
    value.ordering === "sustained_craft"
  ) {
    metadata.ordering = value.ordering;
  }

  if (typeof value.position === "number" && Number.isFinite(value.position)) {
    metadata.position = Math.max(1, Math.floor(value.position));
  }

  if (
    value.channel === "sms" ||
    value.channel === "internal_dm" ||
    value.channel === "whatsapp" ||
    value.channel === "telegram"
  ) {
    metadata.channel = value.channel;
  }

  if (
    value.action === "open" ||
    value.action === "complete" ||
    value.action === "start" ||
    value.action === "toggle" ||
    value.action === "submit"
  ) {
    metadata.action = value.action;
  }

  if (
    value.qualityMode === "auto" ||
    value.qualityMode === "high" ||
    value.qualityMode === "medium" ||
    value.qualityMode === "low"
  ) {
    metadata.qualityMode = value.qualityMode;
  }

  if (
    value.qualityLevel === "high" ||
    value.qualityLevel === "medium" ||
    value.qualityLevel === "low"
  ) {
    metadata.qualityLevel = value.qualityLevel;
  }

  if (
    value.qualityReason === "manual_select" ||
    value.qualityReason === "auto_step_down_stalled" ||
    value.qualityReason === "auto_step_down_error"
  ) {
    metadata.qualityReason = value.qualityReason;
  }

  if (
    value.rebufferReason === "waiting" ||
    value.rebufferReason === "stalled" ||
    value.rebufferReason === "error"
  ) {
    metadata.rebufferReason = value.rebufferReason;
  }

  return metadata;
}

function toWatchTelemetryLogEntry(record: TownhallTelemetryEventRecord): WatchTelemetryLogEntry | null {
  if (!isWatchTelemetryEventType(record.eventType)) {
    return null;
  }

  return {
    id: record.id,
    dropId: record.dropId,
    eventType: record.eventType,
    watchTimeSeconds: record.watchTimeSeconds,
    completionPercent: record.completionPercent,
    occurredAt: record.occurredAt,
    qualityMode: record.metadata?.qualityMode ?? null,
    qualityLevel: record.metadata?.qualityLevel ?? null,
    qualityReason: record.metadata?.qualityReason ?? null,
    rebufferReason: record.metadata?.rebufferReason ?? null
  };
}

function appendTownhallTelemetryEvent(
  db: BffDatabase,
  input: {
    accountId: string | null;
    dropId: string;
    eventType: TownhallTelemetryEventType;
    watchTimeSeconds?: number;
    completionPercent?: number;
    metadata?: TownhallTelemetryMetadata;
    occurredAt?: string;
  }
): void {
  const normalizedWatchTime =
    input.eventType === "watch_time" || input.eventType === "drop_dwell_time"
      ? normalizeWatchTimeSeconds(input.watchTimeSeconds)
      : 0;
  const normalizedCompletion =
    input.eventType === "completion"
      ? normalizeCompletionPercent(input.completionPercent ?? 100)
      : 0;

  db.townhallTelemetryEvents.unshift({
    id: `tel_${randomUUID()}`,
    accountId: input.accountId,
    dropId: input.dropId,
    eventType: input.eventType,
    watchTimeSeconds: normalizedWatchTime,
    completionPercent: normalizedCompletion,
    metadata: normalizeTownhallTelemetryMetadata(input.metadata),
    occurredAt: input.occurredAt ?? new Date().toISOString()
  } satisfies TownhallTelemetryEventRecord);

  if (db.townhallTelemetryEvents.length > TOWNHALL_TELEMETRY_EVENT_LOG_LIMIT) {
    db.townhallTelemetryEvents.length = TOWNHALL_TELEMETRY_EVENT_LOG_LIMIT;
  }
}

function normalizeTownhallCommentBody(value: string): string {
  return value.trim().slice(0, TOWNHALL_COMMENT_MAX_LENGTH);
}

function normalizeTownhallPostBody(value: string): string {
  return value.trim().slice(0, TOWNHALL_POST_MAX_LENGTH);
}

function trimTownhallPosts(db: BffDatabase): void {
  if (db.townhallPosts.length > TOWNHALL_POST_LOG_LIMIT) {
    db.townhallPosts.length = TOWNHALL_POST_LOG_LIMIT;
  }
}

function trimTownhallPostSaves(db: BffDatabase): void {
  if (db.townhallPostSaves.length > TOWNHALL_POST_SAVE_LOG_LIMIT) {
    db.townhallPostSaves.length = TOWNHALL_POST_SAVE_LOG_LIMIT;
  }
}

function trimTownhallPostFollows(db: BffDatabase): void {
  if (db.townhallPostFollows.length > TOWNHALL_POST_FOLLOW_LOG_LIMIT) {
    db.townhallPostFollows.length = TOWNHALL_POST_FOLLOW_LOG_LIMIT;
  }
}

function trimTownhallPostShares(db: BffDatabase): void {
  if (db.townhallPostShares.length > TOWNHALL_POST_SHARE_LOG_LIMIT) {
    db.townhallPostShares.length = TOWNHALL_POST_SHARE_LOG_LIMIT;
  }
}

function canAccountModerateTownhallPost(
  account: AccountRecord | null,
  post: TownhallPostRecord
): boolean {
  if (!account) {
    return false;
  }

  if (post.accountId === account.id) {
    return true;
  }

  return account.roles.includes("creator");
}

function canAccountReportTownhallPost(
  account: AccountRecord | null,
  post: TownhallPostRecord
): boolean {
  if (!account) {
    return false;
  }

  return post.accountId !== account.id && post.visibility === "visible";
}

function canAccountAppealTownhallPost(
  account: AccountRecord | null,
  post: TownhallPostRecord
): boolean {
  if (!account) {
    return false;
  }

  if (post.accountId !== account.id) {
    return false;
  }

  if (post.visibility !== "hidden" && post.visibility !== "restricted" && post.visibility !== "deleted") {
    return false;
  }

  return !post.appealRequestedAt;
}

function canAccountViewTownhallPost(
  account: AccountRecord | null,
  post: TownhallPostRecord
): boolean {
  if (post.visibility === "visible") {
    return true;
  }

  if (!account) {
    return false;
  }

  if (post.accountId === account.id) {
    return true;
  }

  return canAccountModerateTownhallPost(account, post);
}

type TownhallPostLinkedObjectInput = {
  kind: TownhallPostLinkedObjectKind;
  id: string;
  label?: string;
  href?: string;
};

type ResolvedTownhallPostLinkedObjectRecord = {
  kind: TownhallPostLinkedObjectKind;
  id: string;
  label: string;
  href: string;
};

function resolveTownhallPostLinkedObjectRecord(
  db: BffDatabase,
  linkedObject: TownhallPostLinkedObjectInput | null | undefined
): ResolvedTownhallPostLinkedObjectRecord | null {
  if (!linkedObject) {
    return null;
  }

  if (!TOWNHALL_POST_LINKED_OBJECT_KIND_SET.has(linkedObject.kind)) {
    return null;
  }

  const normalizedId = linkedObject.id.trim();
  if (!normalizedId) {
    return null;
  }

  if (linkedObject.kind === "drop") {
    const drop = findDropById(db, normalizedId);
    if (!drop) {
      return null;
    }

    return {
      kind: "drop",
      id: drop.id,
      label: linkedObject.label?.trim() || drop.title,
      href: linkedObject.href?.trim() || `/drops/${drop.id}`
    };
  }

  if (linkedObject.kind === "world") {
    const world = findWorldById(db, normalizedId);
    if (!world) {
      return null;
    }

    return {
      kind: "world",
      id: world.id,
      label: linkedObject.label?.trim() || world.title,
      href: linkedObject.href?.trim() || `/worlds/${world.id}`
    };
  }

  const studio = db.catalog.studios.find((entry) => entry.handle === normalizedId) ?? null;
  if (!studio) {
    return null;
  }

  return {
    kind: "studio",
    id: studio.handle,
    label: linkedObject.label?.trim() || studio.title,
    href: linkedObject.href?.trim() || `/studio/${studio.handle}`
  };
}

function toTownhallPostLinkedObject(record: TownhallPostRecord): TownhallPostLinkedObject | null {
  if (!record.linkedObjectKind || !record.linkedObjectId || !record.linkedObjectLabel) {
    return null;
  }

  if (!TOWNHALL_POST_LINKED_OBJECT_KIND_SET.has(record.linkedObjectKind)) {
    return null;
  }

  return {
    kind: record.linkedObjectKind,
    id: record.linkedObjectId,
    label: record.linkedObjectLabel,
    href:
      record.linkedObjectHref ??
      (record.linkedObjectKind === "drop"
        ? `/drops/${record.linkedObjectId}`
        : record.linkedObjectKind === "world"
          ? `/worlds/${record.linkedObjectId}`
          : `/studio/${record.linkedObjectId}`)
  };
}

function resolveTownhallPostModerationCaseState(
  record: TownhallPostRecord
): TownhallPostModerationCaseState {
  if (record.appealRequestedAt) {
    return "appeal_requested";
  }

  if (record.reportCount > 0 || record.reportedAt) {
    return "reported";
  }

  if (record.moderatedAt) {
    return "resolved";
  }

  return "clear";
}

function canAccountModerateTownhallComment(
  account: AccountRecord | null,
  drop: Drop,
  comment: TownhallCommentRecord
): boolean {
  if (!account) {
    return false;
  }

  if (comment.accountId === account.id) {
    return true;
  }

  return account.roles.includes("creator") && account.handle === drop.studioHandle;
}

function canAccountReportTownhallComment(
  account: AccountRecord | null,
  comment: TownhallCommentRecord
): boolean {
  if (!account) {
    return false;
  }

  return comment.accountId !== account.id && comment.visibility === "visible";
}

function canAccountAppealTownhallComment(
  account: AccountRecord | null,
  comment: TownhallCommentRecord
): boolean {
  if (!account) {
    return false;
  }

  if (comment.accountId !== account.id) {
    return false;
  }

  if (comment.visibility !== "hidden" && comment.visibility !== "restricted") {
    return false;
  }

  return !comment.appealRequestedAt;
}

function canAccountResolveTownhallModerationCase(
  account: AccountRecord | null,
  drop: Drop
): boolean {
  if (!account) {
    return false;
  }

  return account.roles.includes("creator") && account.handle === drop.studioHandle;
}

function isTownhallModerationCaseResolution(
  value: string
): value is TownhallModerationCaseResolution {
  return TOWNHALL_MODERATION_RESOLUTION_SET.has(value as TownhallModerationCaseResolution);
}

function applyTownhallModerationCaseResolution(
  comment: TownhallCommentRecord,
  actorAccountId: string,
  resolution: TownhallModerationCaseResolution
): void {
  if (resolution === "dismiss") {
    const nowIso = new Date().toISOString();
    comment.moderatedAt = nowIso;
    comment.moderatedByAccountId = actorAccountId;
    comment.reportCount = 0;
    comment.reportedAt = null;
    comment.appealRequestedAt = null;
    comment.appealRequestedByAccountId = null;
    return;
  }

  if (resolution === "hide") {
    comment.visibility = "hidden";
  } else if (resolution === "restrict") {
    comment.visibility = "restricted";
  } else if (resolution === "delete") {
    comment.visibility = "deleted";
  } else if (resolution === "restore") {
    comment.visibility = "visible";
  }

  const nowIso = new Date().toISOString();
  comment.moderatedAt = nowIso;
  comment.moderatedByAccountId = actorAccountId;
  comment.reportCount = 0;
  comment.reportedAt = null;
  comment.appealRequestedAt = null;
  comment.appealRequestedByAccountId = null;
}

function normalizeWorldConversationMessageBody(value: string): string {
  return value.trim().slice(0, WORLD_CONVERSATION_MESSAGE_MAX_LENGTH);
}

function normalizeLiveSessionConversationMessageBody(value: string): string {
  return value.trim().slice(0, LIVE_SESSION_CONVERSATION_MESSAGE_MAX_LENGTH);
}

function canAccountModerateWorldConversationMessage(
  account: AccountRecord | null,
  world: World,
  message: WorldConversationMessageRecord
): boolean {
  if (!account) {
    return false;
  }

  if (message.accountId === account.id) {
    return false;
  }

  return account.roles.includes("creator") && account.handle === world.studioHandle;
}

function canAccountResolveWorldConversationModerationCase(
  account: AccountRecord | null,
  world: World
): boolean {
  if (!account) {
    return false;
  }

  return account.roles.includes("creator") && account.handle === world.studioHandle;
}

function canAccountReportWorldConversationMessage(
  account: AccountRecord | null,
  message: WorldConversationMessageRecord
): boolean {
  if (!account) {
    return false;
  }

  return message.accountId !== account.id && message.visibility === "visible";
}

function canAccountAppealWorldConversationMessage(
  account: AccountRecord | null,
  message: WorldConversationMessageRecord
): boolean {
  if (!account) {
    return false;
  }

  if (message.accountId !== account.id) {
    return false;
  }

  if (message.visibility !== "hidden" && message.visibility !== "restricted" && message.visibility !== "deleted") {
    return false;
  }

  return !message.appealRequestedAt;
}

function canAccountModerateLiveSessionConversationMessage(
  account: AccountRecord | null,
  liveSession: LiveSessionRecord,
  message: LiveSessionConversationMessageRecord
): boolean {
  if (!account) {
    return false;
  }

  if (message.accountId === account.id) {
    return false;
  }

  return account.roles.includes("creator") && account.handle === liveSession.studioHandle;
}

function canAccountResolveLiveSessionConversationModerationCase(
  account: AccountRecord | null,
  liveSession: LiveSessionRecord
): boolean {
  if (!account) {
    return false;
  }

  return account.roles.includes("creator") && account.handle === liveSession.studioHandle;
}

function canAccountReportLiveSessionConversationMessage(
  account: AccountRecord | null,
  message: LiveSessionConversationMessageRecord
): boolean {
  if (!account) {
    return false;
  }

  return message.accountId !== account.id && message.visibility === "visible";
}

function canAccountAppealLiveSessionConversationMessage(
  account: AccountRecord | null,
  message: LiveSessionConversationMessageRecord
): boolean {
  if (!account) {
    return false;
  }

  if (message.accountId !== account.id) {
    return false;
  }

  if (message.visibility !== "hidden" && message.visibility !== "restricted" && message.visibility !== "deleted") {
    return false;
  }

  return !message.appealRequestedAt;
}

function isWorldConversationModerationResolution(
  value: string
): value is WorldConversationModerationResolution {
  return WORLD_CONVERSATION_MODERATION_RESOLUTION_SET.has(value as WorldConversationModerationResolution);
}

function applyWorldConversationModerationResolution(
  message: WorldConversationMessageRecord,
  actorAccountId: string,
  resolution: WorldConversationModerationResolution
): void {
  if (resolution === "dismiss") {
    const nowIso = new Date().toISOString();
    message.moderatedAt = nowIso;
    message.moderatedByAccountId = actorAccountId;
    message.reportCount = 0;
    message.reportedAt = null;
    message.appealRequestedAt = null;
    message.appealRequestedByAccountId = null;
    return;
  }

  if (resolution === "hide") {
    message.visibility = "hidden";
  } else if (resolution === "restrict") {
    message.visibility = "restricted";
  } else if (resolution === "delete") {
    message.visibility = "deleted";
  } else if (resolution === "restore") {
    message.visibility = "visible";
  }

  const nowIso = new Date().toISOString();
  message.moderatedAt = nowIso;
  message.moderatedByAccountId = actorAccountId;
  message.reportCount = 0;
  message.reportedAt = null;
  message.appealRequestedAt = null;
  message.appealRequestedByAccountId = null;
}

function isLiveSessionConversationModerationResolution(
  value: string
): value is LiveSessionConversationModerationResolution {
  return LIVE_SESSION_CONVERSATION_MODERATION_RESOLUTION_SET.has(
    value as LiveSessionConversationModerationResolution
  );
}

function applyLiveSessionConversationModerationResolution(
  message: LiveSessionConversationMessageRecord,
  actorAccountId: string,
  resolution: LiveSessionConversationModerationResolution
): void {
  if (resolution === "dismiss") {
    const nowIso = new Date().toISOString();
    message.moderatedAt = nowIso;
    message.moderatedByAccountId = actorAccountId;
    message.reportCount = 0;
    message.reportedAt = null;
    message.appealRequestedAt = null;
    message.appealRequestedByAccountId = null;
    return;
  }

  if (resolution === "hide") {
    message.visibility = "hidden";
  } else if (resolution === "restrict") {
    message.visibility = "restricted";
  } else if (resolution === "delete") {
    message.visibility = "deleted";
  } else if (resolution === "restore") {
    message.visibility = "visible";
  }

  const nowIso = new Date().toISOString();
  message.moderatedAt = nowIso;
  message.moderatedByAccountId = actorAccountId;
  message.reportCount = 0;
  message.reportedAt = null;
  message.appealRequestedAt = null;
  message.appealRequestedByAccountId = null;
}

function toWorldConversationMessage(
  record: WorldConversationMessageRecord,
  accountHandleById: Map<string, string>,
  viewerAccount: AccountRecord | null,
  world: World,
  options: {
    depth: number;
    replyCount: number;
  }
): WorldConversationMessage {
  const canModerate = canAccountModerateWorldConversationMessage(viewerAccount, world, record);
  const isAuthor = Boolean(viewerAccount && viewerAccount.id === record.accountId);
  return {
    id: record.id,
    worldId: record.worldId,
    parentMessageId: record.parentMessageId,
    depth: options.depth,
    replyCount: options.replyCount,
    authorHandle: accountHandleById.get(record.accountId) ?? "community",
    body:
      !canModerate && !isAuthor && record.visibility === "hidden"
        ? "message hidden by moderation."
        : !canModerate && !isAuthor && record.visibility === "restricted"
          ? "message restricted by moderation."
          : !canModerate && !isAuthor && record.visibility === "deleted"
            ? "message deleted by moderation."
            : record.body,
    createdAt: record.createdAt,
    visibility: record.visibility,
    reportCount: record.reportCount,
    canModerate,
    canReport: canAccountReportWorldConversationMessage(viewerAccount, record),
    canReply: viewerAccount !== null,
    canAppeal: canAccountAppealWorldConversationMessage(viewerAccount, record),
    appealRequested: Boolean(record.appealRequestedAt)
  };
}

function buildWorldConversationThread(
  db: BffDatabase,
  world: World,
  viewerAccount: AccountRecord
): WorldConversationThread {
  const accountHandleById = new Map(db.accounts.map((entry) => [entry.id, entry.handle]));
  const visibleMessages = db.worldConversationMessages
    .filter((entry) => entry.worldId === world.id)
    .filter((entry) => {
      if (entry.visibility === "visible") {
        return true;
      }

      if (entry.accountId === viewerAccount.id) {
        return true;
      }

      return canAccountModerateWorldConversationMessage(viewerAccount, world, entry);
    })
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(-WORLD_CONVERSATION_MESSAGES_PREVIEW_LIMIT);

  const visibleById = new Map(visibleMessages.map((entry) => [entry.id, entry]));
  const childrenByParentId = new Map<string, WorldConversationMessageRecord[]>();
  const rootMessages: WorldConversationMessageRecord[] = [];
  const replyCountByParentId = new Map<string, number>();

  for (const message of visibleMessages) {
    if (message.parentMessageId && visibleById.has(message.parentMessageId)) {
      const currentChildren = childrenByParentId.get(message.parentMessageId) ?? [];
      currentChildren.push(message);
      childrenByParentId.set(message.parentMessageId, currentChildren);
      replyCountByParentId.set(
        message.parentMessageId,
        (replyCountByParentId.get(message.parentMessageId) ?? 0) + 1
      );
    } else {
      rootMessages.push(message);
    }
  }

  rootMessages.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  for (const [parentId, entries] of childrenByParentId.entries()) {
    entries.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    childrenByParentId.set(parentId, entries);
  }

  const messages: WorldConversationMessage[] = [];
  const traverse = (record: WorldConversationMessageRecord, depth: number) => {
    messages.push(
      toWorldConversationMessage(record, accountHandleById, viewerAccount, world, {
        depth,
        replyCount: replyCountByParentId.get(record.id) ?? 0
      })
    );
    const children = childrenByParentId.get(record.id) ?? [];
    for (const child of children) {
      traverse(child, depth + 1);
    }
  };

  for (const root of rootMessages) {
    traverse(root, 0);
  }

  return {
    worldId: world.id,
    messages
  };
}

function toLiveSessionConversationMessage(
  record: LiveSessionConversationMessageRecord,
  accountHandleById: Map<string, string>,
  viewerAccount: AccountRecord | null,
  liveSession: LiveSessionRecord,
  options: {
    depth: number;
    replyCount: number;
  }
): LiveSessionConversationMessage {
  const canModerate = canAccountModerateLiveSessionConversationMessage(
    viewerAccount,
    liveSession,
    record
  );
  const isAuthor = Boolean(viewerAccount && viewerAccount.id === record.accountId);
  return {
    id: record.id,
    liveSessionId: record.liveSessionId,
    parentMessageId: record.parentMessageId,
    depth: options.depth,
    replyCount: options.replyCount,
    authorHandle: accountHandleById.get(record.accountId) ?? "community",
    body:
      !canModerate && !isAuthor && record.visibility === "hidden"
        ? "message hidden by moderation."
        : !canModerate && !isAuthor && record.visibility === "restricted"
          ? "message restricted by moderation."
          : !canModerate && !isAuthor && record.visibility === "deleted"
            ? "message deleted by moderation."
            : record.body,
    createdAt: record.createdAt,
    visibility: record.visibility,
    reportCount: record.reportCount,
    canModerate,
    canReport: canAccountReportLiveSessionConversationMessage(viewerAccount, record),
    canReply: viewerAccount !== null,
    canAppeal: canAccountAppealLiveSessionConversationMessage(viewerAccount, record),
    appealRequested: Boolean(record.appealRequestedAt)
  };
}

function buildLiveSessionConversationThread(
  db: BffDatabase,
  liveSession: LiveSessionRecord,
  viewerAccount: AccountRecord
): LiveSessionConversationThread {
  const accountHandleById = new Map(db.accounts.map((entry) => [entry.id, entry.handle]));
  const visibleMessages = db.liveSessionConversationMessages
    .filter((entry) => entry.liveSessionId === liveSession.id)
    .filter((entry) => {
      if (entry.visibility === "visible") {
        return true;
      }

      if (entry.accountId === viewerAccount.id) {
        return true;
      }

      return canAccountModerateLiveSessionConversationMessage(viewerAccount, liveSession, entry);
    })
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(-LIVE_SESSION_CONVERSATION_MESSAGES_PREVIEW_LIMIT);

  const visibleById = new Map(visibleMessages.map((entry) => [entry.id, entry]));
  const childrenByParentId = new Map<string, LiveSessionConversationMessageRecord[]>();
  const rootMessages: LiveSessionConversationMessageRecord[] = [];
  const replyCountByParentId = new Map<string, number>();

  for (const message of visibleMessages) {
    if (message.parentMessageId && visibleById.has(message.parentMessageId)) {
      const currentChildren = childrenByParentId.get(message.parentMessageId) ?? [];
      currentChildren.push(message);
      childrenByParentId.set(message.parentMessageId, currentChildren);
      replyCountByParentId.set(
        message.parentMessageId,
        (replyCountByParentId.get(message.parentMessageId) ?? 0) + 1
      );
    } else {
      rootMessages.push(message);
    }
  }

  rootMessages.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  for (const [parentId, entries] of childrenByParentId.entries()) {
    entries.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    childrenByParentId.set(parentId, entries);
  }

  const messages: LiveSessionConversationMessage[] = [];
  const traverse = (record: LiveSessionConversationMessageRecord, depth: number) => {
    messages.push(
      toLiveSessionConversationMessage(record, accountHandleById, viewerAccount, liveSession, {
        depth,
        replyCount: replyCountByParentId.get(record.id) ?? 0
      })
    );
    const children = childrenByParentId.get(record.id) ?? [];
    for (const child of children) {
      traverse(child, depth + 1);
    }
  };

  for (const root of rootMessages) {
    traverse(root, 0);
  }

  return {
    liveSessionId: liveSession.id,
    messages
  };
}

function toTownhallComment(
  record: TownhallCommentRecord,
  accountHandleById: Map<string, string>,
  viewerAccount: AccountRecord | null,
  drop: Drop,
  options: {
    depth: number;
    replyCount: number;
  }
): TownhallComment {
  const canModerate = canAccountModerateTownhallComment(viewerAccount, drop, record);
  return {
    id: record.id,
    dropId: record.dropId,
    parentCommentId: record.parentCommentId,
    depth: options.depth,
    replyCount: options.replyCount,
    authorHandle: accountHandleById.get(record.accountId) ?? "community",
    body:
      !canModerate && record.visibility === "hidden"
        ? "comment hidden by moderation."
        : !canModerate && record.visibility === "restricted"
          ? "comment restricted by moderation."
          : !canModerate && record.visibility === "deleted"
            ? "comment deleted by moderation."
            : record.body,
    createdAt: record.createdAt,
    visibility: record.visibility,
    reportCount: record.reportCount,
    canModerate,
    canReport: canAccountReportTownhallComment(viewerAccount, record),
    canReply: viewerAccount !== null,
    canAppeal: canAccountAppealTownhallComment(viewerAccount, record),
    appealRequested: Boolean(record.appealRequestedAt)
  };
}

type TownhallPostEngagementState = {
  saveCount: number;
  shareCount: number;
  followCount: number;
  savedByViewer: boolean;
  followedByViewer: boolean;
};

function buildTownhallPostEngagementState(
  db: BffDatabase,
  postId: string,
  viewerAccountId: string | null
): TownhallPostEngagementState {
  const saveCount = db.townhallPostSaves.filter((entry) => entry.postId === postId).length;
  const shareCount = db.townhallPostShares.filter((entry) => entry.postId === postId).length;
  const followCount = db.townhallPostFollows.filter((entry) => entry.postId === postId).length;
  const savedByViewer = viewerAccountId
    ? db.townhallPostSaves.some(
        (entry) => entry.postId === postId && entry.accountId === viewerAccountId
      )
    : false;
  const followedByViewer = viewerAccountId
    ? db.townhallPostFollows.some(
        (entry) => entry.postId === postId && entry.accountId === viewerAccountId
      )
    : false;

  return {
    saveCount,
    shareCount,
    followCount,
    savedByViewer,
    followedByViewer
  };
}

function toTownhallPost(
  db: BffDatabase,
  record: TownhallPostRecord,
  accountHandleById: Map<string, string>,
  viewerAccount: AccountRecord | null
): TownhallPost {
  const canModerate = canAccountModerateTownhallPost(viewerAccount, record);
  const isAuthor = Boolean(viewerAccount && viewerAccount.id === record.accountId);
  const engagement = buildTownhallPostEngagementState(
    db,
    record.id,
    viewerAccount?.id ?? null
  );
  return {
    id: record.id,
    authorHandle: accountHandleById.get(record.accountId) ?? "community",
    body:
      !canModerate && !isAuthor && record.visibility === "hidden"
        ? "post hidden by moderation."
        : !canModerate && !isAuthor && record.visibility === "restricted"
          ? "post restricted by moderation."
          : !canModerate && !isAuthor && record.visibility === "deleted"
            ? "post deleted by moderation."
            : record.body,
    createdAt: record.createdAt,
    visibility: record.visibility,
    reportCount: record.reportCount,
    reportedAt: record.reportedAt,
    moderatedAt: record.moderatedAt,
    appealRequestedAt: record.appealRequestedAt,
    moderationCaseState: resolveTownhallPostModerationCaseState(record),
    saveCount: engagement.saveCount,
    shareCount: engagement.shareCount,
    followCount: engagement.followCount,
    savedByViewer: engagement.savedByViewer,
    followedByViewer: engagement.followedByViewer,
    linkedObject: toTownhallPostLinkedObject(record),
    canModerate,
    canReport: canAccountReportTownhallPost(viewerAccount, record),
    canAppeal: canAccountAppealTownhallPost(viewerAccount, record),
    appealRequested: Boolean(record.appealRequestedAt)
  };
}

function buildTownhallPostsSnapshot(
  db: BffDatabase,
  accountId: string | null,
  options?: {
    limit?: number;
    filter?: TownhallPostsFilter;
  }
): TownhallPostsSnapshot {
  const viewerAccount = accountId ? findAccountById(db, accountId) : null;
  const accountHandleById = new Map(db.accounts.map((account) => [account.id, account.handle]));
  const normalizedFilter = isTownhallPostsFilter(options?.filter ?? "all")
    ? (options?.filter ?? "all")
    : "all";
  const normalizedLimit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.min(TOWNHALL_POSTS_PREVIEW_LIMIT, Math.max(1, Math.floor(options.limit)))
      : TOWNHALL_POSTS_PREVIEW_LIMIT;

  const visiblePosts = db.townhallPosts
    .filter((record) => {
      if (record.visibility === "visible") {
        return true;
      }

      if (viewerAccount && record.accountId === viewerAccount.id) {
        return true;
      }

      return canAccountModerateTownhallPost(viewerAccount, record);
    });

  const activityTimestampByPostId = new Map<string, number>();
  let filteredPosts: TownhallPostRecord[] = visiblePosts;

  if (normalizedFilter === "following") {
    if (!viewerAccount) {
      return {
        posts: [],
        filter: normalizedFilter
      };
    }

    for (const follow of db.townhallPostFollows) {
      if (follow.accountId !== viewerAccount.id) {
        continue;
      }

      const timestamp = Date.parse(follow.followedAt);
      const safeTimestamp = Number.isFinite(timestamp) ? timestamp : 0;
      const previous = activityTimestampByPostId.get(follow.postId) ?? 0;
      activityTimestampByPostId.set(follow.postId, Math.max(previous, safeTimestamp));
    }

    filteredPosts = visiblePosts.filter((record) => activityTimestampByPostId.has(record.id));
  } else if (normalizedFilter === "saved") {
    if (!viewerAccount) {
      return {
        posts: [],
        filter: normalizedFilter
      };
    }

    for (const save of db.townhallPostSaves) {
      if (save.accountId !== viewerAccount.id) {
        continue;
      }

      const timestamp = Date.parse(save.savedAt);
      const safeTimestamp = Number.isFinite(timestamp) ? timestamp : 0;
      const previous = activityTimestampByPostId.get(save.postId) ?? 0;
      activityTimestampByPostId.set(save.postId, Math.max(previous, safeTimestamp));
    }

    filteredPosts = visiblePosts.filter((record) => activityTimestampByPostId.has(record.id));
  }

  const posts = filteredPosts
    .sort((a, b) => {
      const activityA = activityTimestampByPostId.get(a.id) ?? 0;
      const activityB = activityTimestampByPostId.get(b.id) ?? 0;
      if (activityA !== activityB) {
        return activityB - activityA;
      }

      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    })
    .slice(0, normalizedLimit)
    .map((record) => toTownhallPost(db, record, accountHandleById, viewerAccount));

  return {
    posts,
    filter: normalizedFilter
  };
}

function canAccountModerateStudioConversationPost(
  account: AccountRecord | null,
  studio: Studio,
  post: TownhallPostRecord
): boolean {
  if (!account) {
    return false;
  }

  if (!account.roles.includes("creator")) {
    return false;
  }

  if (account.handle !== studio.handle) {
    return false;
  }

  return post.accountId !== account.id;
}

function doesTownhallPostBelongToStudioConversation(
  db: BffDatabase,
  post: TownhallPostRecord,
  studio: Studio
): boolean {
  if (!post.linkedObjectKind || !post.linkedObjectId) {
    return false;
  }

  if (post.linkedObjectKind === "studio") {
    return post.linkedObjectId === studio.handle;
  }

  if (post.linkedObjectKind === "world") {
    const world = findWorldById(db, post.linkedObjectId);
    return world?.studioHandle === studio.handle;
  }

  if (post.linkedObjectKind === "drop") {
    const drop = findDropById(db, post.linkedObjectId);
    return drop?.studioHandle === studio.handle;
  }

  return false;
}

function resolveStudioConversationLinkedObjectRecord(
  db: BffDatabase,
  studio: Studio,
  linkedObject?: StudioConversationLinkedObjectInput | null
): ResolvedTownhallPostLinkedObjectRecord | null {
  const fallbackLinkedObject: TownhallPostLinkedObjectInput = {
    kind: "studio",
    id: studio.handle,
    label: studio.title,
    href: `/studio/${studio.handle}`
  };
  const resolved = resolveTownhallPostLinkedObjectRecord(db, linkedObject ?? fallbackLinkedObject);
  if (!resolved) {
    return null;
  }

  if (resolved.kind === "studio") {
    return resolved.id === studio.handle ? resolved : null;
  }

  if (resolved.kind === "world") {
    const world = findWorldById(db, resolved.id);
    return world?.studioHandle === studio.handle ? resolved : null;
  }

  const drop = findDropById(db, resolved.id);
  return drop?.studioHandle === studio.handle ? resolved : null;
}

function toStudioConversationPost(
  db: BffDatabase,
  record: TownhallPostRecord,
  accountHandleById: Map<string, string>,
  viewerAccount: AccountRecord | null,
  studio: Studio
): TownhallPost {
  const canModerate = canAccountModerateStudioConversationPost(viewerAccount, studio, record);
  const isAuthor = Boolean(viewerAccount && viewerAccount.id === record.accountId);
  const engagement = buildTownhallPostEngagementState(
    db,
    record.id,
    viewerAccount?.id ?? null
  );
  return {
    id: record.id,
    authorHandle: accountHandleById.get(record.accountId) ?? "community",
    body:
      !canModerate && !isAuthor && record.visibility === "hidden"
        ? "post hidden by moderation."
        : !canModerate && !isAuthor && record.visibility === "restricted"
          ? "post restricted by moderation."
          : !canModerate && !isAuthor && record.visibility === "deleted"
            ? "post deleted by moderation."
            : record.body,
    createdAt: record.createdAt,
    visibility: record.visibility,
    reportCount: record.reportCount,
    reportedAt: record.reportedAt,
    moderatedAt: record.moderatedAt,
    appealRequestedAt: record.appealRequestedAt,
    moderationCaseState: resolveTownhallPostModerationCaseState(record),
    saveCount: engagement.saveCount,
    shareCount: engagement.shareCount,
    followCount: engagement.followCount,
    savedByViewer: engagement.savedByViewer,
    followedByViewer: engagement.followedByViewer,
    linkedObject: toTownhallPostLinkedObject(record),
    canModerate,
    canReport: canAccountReportTownhallPost(viewerAccount, record),
    canAppeal: canAccountAppealTownhallPost(viewerAccount, record),
    appealRequested: Boolean(record.appealRequestedAt)
  };
}

function buildStudioConversationThread(
  db: BffDatabase,
  studio: Studio,
  accountId: string | null,
  limit = TOWNHALL_POSTS_PREVIEW_LIMIT
): StudioConversationThread {
  const viewerAccount = accountId ? findAccountById(db, accountId) : null;
  const accountHandleById = new Map(db.accounts.map((account) => [account.id, account.handle]));

  const posts = db.townhallPosts
    .filter((record) => doesTownhallPostBelongToStudioConversation(db, record, studio))
    .filter((record) => {
      if (record.visibility === "visible") {
        return true;
      }

      if (viewerAccount && record.accountId === viewerAccount.id) {
        return true;
      }

      return canAccountModerateStudioConversationPost(viewerAccount, studio, record);
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, Math.max(1, Math.floor(limit)))
    .map((record) => toStudioConversationPost(db, record, accountHandleById, viewerAccount, studio));

  return {
    studioHandle: studio.handle,
    studioTitle: studio.title,
    posts
  };
}

function findStudioConversationPostById(
  db: BffDatabase,
  studio: Studio,
  postId: string
): TownhallPostRecord | null {
  const post = findTownhallPostById(db, postId);
  if (!post) {
    return null;
  }

  return doesTownhallPostBelongToStudioConversation(db, post, studio) ? post : null;
}

function buildTownhallCommentsView(
  comments: TownhallCommentRecord[],
  accountHandleById: Map<string, string>,
  viewerAccount: AccountRecord | null,
  drop: Drop
): TownhallComment[] {
  const visibleComments = comments.filter(
    (entry) => entry.visibility === "visible" || canAccountModerateTownhallComment(viewerAccount, drop, entry)
  );
  const visibleById = new Map(visibleComments.map((entry) => [entry.id, entry]));
  const childrenByParentId = new Map<string, TownhallCommentRecord[]>();
  const rootComments: TownhallCommentRecord[] = [];
  const replyCountByParentId = new Map<string, number>();

  for (const comment of visibleComments) {
    if (comment.parentCommentId && visibleById.has(comment.parentCommentId)) {
      const currentChildren = childrenByParentId.get(comment.parentCommentId) ?? [];
      currentChildren.push(comment);
      childrenByParentId.set(comment.parentCommentId, currentChildren);
      replyCountByParentId.set(
        comment.parentCommentId,
        (replyCountByParentId.get(comment.parentCommentId) ?? 0) + 1
      );
    } else {
      rootComments.push(comment);
    }
  }

  rootComments.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  for (const [parentId, entries] of childrenByParentId.entries()) {
    entries.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    childrenByParentId.set(parentId, entries);
  }

  const threaded: TownhallComment[] = [];
  const traverse = (record: TownhallCommentRecord, depth: number) => {
    threaded.push(
      toTownhallComment(record, accountHandleById, viewerAccount, drop, {
        depth,
        replyCount: replyCountByParentId.get(record.id) ?? 0
      })
    );
    const children = childrenByParentId.get(record.id) ?? [];
    for (const child of children) {
      traverse(child, depth + 1);
    }
  };

  for (const root of rootComments) {
    traverse(root, 0);
  }

  return threaded.slice(0, TOWNHALL_COMMENTS_PREVIEW_LIMIT);
}

function buildTownhallDropSocialSnapshot(
  db: BffDatabase,
  dropId: string,
  accountId: string | null
): TownhallDropSocialSnapshot | null {
  const drop = findDropById(db, dropId);
  if (!drop) {
    return null;
  }

  const likeCount = db.townhallLikes.filter((entry) => entry.dropId === dropId).length;
  const viewerAccount = accountId ? findAccountById(db, accountId) : null;
  const comments = db.townhallComments.filter((entry) => entry.dropId === dropId);
  const shareCount = db.townhallShares.filter((entry) => entry.dropId === dropId).length;
  const saveCount = db.savedDrops.filter((entry) => entry.dropId === dropId).length;

  const accountHandleById = new Map(db.accounts.map((account) => [account.id, account.handle]));
  const visibleCommentCount = comments.filter((entry) => entry.visibility === "visible").length;
  const publicComments = buildTownhallCommentsView(
    comments,
    accountHandleById,
    viewerAccount,
    drop
  );

  const likedByViewer = accountId
    ? db.townhallLikes.some((entry) => entry.accountId === accountId && entry.dropId === dropId)
    : false;
  const savedByViewer = accountId
    ? db.savedDrops.some((entry) => entry.accountId === accountId && entry.dropId === dropId)
    : false;

  return {
    dropId,
    likeCount,
    commentCount: visibleCommentCount,
    shareCount,
    saveCount,
    likedByViewer,
    savedByViewer,
    comments: publicComments
  };
}

function findTownhallCommentById(
  db: BffDatabase,
  dropId: string,
  commentId: string
): TownhallCommentRecord | null {
  return (
    db.townhallComments.find((entry) => entry.dropId === dropId && entry.id === commentId) ?? null
  );
}

function findTownhallPostById(db: BffDatabase, postId: string): TownhallPostRecord | null {
  return db.townhallPosts.find((entry) => entry.id === postId) ?? null;
}

function findWorldConversationMessageById(
  db: BffDatabase,
  worldId: string,
  messageId: string
): WorldConversationMessageRecord | null {
  return (
    db.worldConversationMessages.find((entry) => entry.worldId === worldId && entry.id === messageId) ??
    null
  );
}

function findLiveSessionConversationMessageById(
  db: BffDatabase,
  liveSessionId: string,
  messageId: string
): LiveSessionConversationMessageRecord | null {
  return (
    db.liveSessionConversationMessages.find(
      (entry) => entry.liveSessionId === liveSessionId && entry.id === messageId
    ) ?? null
  );
}

function buildTownhallModerationQueue(
  db: BffDatabase,
  account: AccountRecord
): TownhallModerationQueueItem[] {
  if (!account.roles.includes("creator")) {
    return [];
  }

  const creatorDrops = db.catalog.drops.filter((drop) => drop.studioHandle === account.handle);
  const creatorDropById = new Map(creatorDrops.map((drop) => [drop.id, drop]));
  const accountHandleById = new Map(db.accounts.map((entry) => [entry.id, entry.handle]));

  return db.townhallComments
    .filter((comment) => creatorDropById.has(comment.dropId))
    .filter((comment) => comment.reportCount > 0 || comment.appealRequestedAt !== null)
    .map((comment) => {
      const drop = creatorDropById.get(comment.dropId)!;
      return {
        dropId: drop.id,
        dropTitle: drop.title,
        commentId: comment.id,
        parentCommentId: comment.parentCommentId,
        authorHandle: accountHandleById.get(comment.accountId) ?? "community",
        body: comment.body,
        visibility: comment.visibility,
        reportCount: comment.reportCount,
        reportedAt: comment.reportedAt,
        moderatedAt: comment.moderatedAt,
        appealRequested: Boolean(comment.appealRequestedAt),
        appealRequestedAt: comment.appealRequestedAt,
        createdAt: comment.createdAt
      } satisfies TownhallModerationQueueItem;
    })
    .sort((a, b) => {
      const aRank = Date.parse(a.appealRequestedAt ?? a.reportedAt ?? a.createdAt);
      const bRank = Date.parse(b.appealRequestedAt ?? b.reportedAt ?? b.createdAt);
      return bRank - aRank;
    });
}

function buildWorldConversationModerationQueue(
  db: BffDatabase,
  account: AccountRecord,
  worldId?: string | null
): WorldConversationModerationQueueItem[] {
  if (!account.roles.includes("creator")) {
    return [];
  }

  const creatorWorlds = db.catalog.worlds.filter((world) => world.studioHandle === account.handle);
  const creatorWorldById = new Map(
    creatorWorlds
      .filter((world) => (worldId ? world.id === worldId : true))
      .map((world) => [world.id, world])
  );

  if (worldId && !creatorWorldById.has(worldId)) {
    return [];
  }

  const accountHandleById = new Map(db.accounts.map((entry) => [entry.id, entry.handle]));

  return db.worldConversationMessages
    .filter((message) => creatorWorldById.has(message.worldId))
    .filter((message) => message.reportCount > 0 || message.appealRequestedAt !== null)
    .map((message) => {
      const world = creatorWorldById.get(message.worldId)!;
      return {
        worldId: world.id,
        worldTitle: world.title,
        messageId: message.id,
        parentMessageId: message.parentMessageId,
        authorHandle: accountHandleById.get(message.accountId) ?? "community",
        body: message.body,
        visibility: message.visibility,
        reportCount: message.reportCount,
        reportedAt: message.reportedAt,
        moderatedAt: message.moderatedAt,
        appealRequested: Boolean(message.appealRequestedAt),
        appealRequestedAt: message.appealRequestedAt,
        createdAt: message.createdAt
      } satisfies WorldConversationModerationQueueItem;
    })
    .sort((a, b) => {
      const aRank = Date.parse(a.appealRequestedAt ?? a.reportedAt ?? a.createdAt);
      const bRank = Date.parse(b.appealRequestedAt ?? b.reportedAt ?? b.createdAt);
      return bRank - aRank;
    })
    .slice(0, WORLD_CONVERSATION_MODERATION_QUEUE_LIMIT);
}

function buildLiveSessionConversationModerationQueue(
  db: BffDatabase,
  account: AccountRecord,
  liveSessionId?: string | null
): LiveSessionConversationModerationQueueItem[] {
  if (!account.roles.includes("creator")) {
    return [];
  }

  const creatorLiveSessions = db.liveSessions.filter(
    (liveSession) => liveSession.studioHandle === account.handle
  );
  const creatorLiveSessionById = new Map(
    creatorLiveSessions
      .filter((liveSession) => (liveSessionId ? liveSession.id === liveSessionId : true))
      .map((liveSession) => [liveSession.id, liveSession])
  );

  if (liveSessionId && !creatorLiveSessionById.has(liveSessionId)) {
    return [];
  }

  const accountHandleById = new Map(db.accounts.map((entry) => [entry.id, entry.handle]));

  return db.liveSessionConversationMessages
    .filter((message) => creatorLiveSessionById.has(message.liveSessionId))
    .filter((message) => message.reportCount > 0 || message.appealRequestedAt !== null)
    .map((message) => {
      const liveSession = creatorLiveSessionById.get(message.liveSessionId)!;
      return {
        liveSessionId: liveSession.id,
        liveSessionTitle: liveSession.title,
        messageId: message.id,
        parentMessageId: message.parentMessageId,
        authorHandle: accountHandleById.get(message.accountId) ?? "community",
        body: message.body,
        visibility: message.visibility,
        reportCount: message.reportCount,
        reportedAt: message.reportedAt,
        moderatedAt: message.moderatedAt,
        appealRequested: Boolean(message.appealRequestedAt),
        appealRequestedAt: message.appealRequestedAt,
        createdAt: message.createdAt
      } satisfies LiveSessionConversationModerationQueueItem;
    })
    .sort((a, b) => {
      const aRank = Date.parse(a.appealRequestedAt ?? a.reportedAt ?? a.createdAt);
      const bRank = Date.parse(b.appealRequestedAt ?? b.reportedAt ?? b.createdAt);
      return bRank - aRank;
    })
    .slice(0, LIVE_SESSION_CONVERSATION_MODERATION_QUEUE_LIMIT);
}

function buildTownhallSocialSnapshot(
  db: BffDatabase,
  accountId: string | null,
  dropIds: string[]
): TownhallSocialSnapshot {
  const byDropId: Record<string, TownhallDropSocialSnapshot> = {};

  for (const dropId of dropIds) {
    const snapshot = buildTownhallDropSocialSnapshot(db, dropId, accountId);
    if (!snapshot) {
      continue;
    }

    byDropId[dropId] = snapshot;
  }

  return { byDropId };
}

function emptyTelemetrySignals(): TownhallTelemetrySignals {
  return {
    watchTimeSeconds: 0,
    completions: 0,
    collectIntents: 0,
    impressions: 0
  };
}

function buildTownhallTelemetrySignals(
  db: BffDatabase,
  dropIds: string[]
): Record<string, TownhallTelemetrySignals> {
  const uniqueDropIds = Array.from(new Set(dropIds.map((dropId) => dropId.trim()).filter(Boolean)));
  const byDropId = Object.fromEntries(
    uniqueDropIds.map((dropId) => [dropId, emptyTelemetrySignals()])
  ) as Record<string, TownhallTelemetrySignals>;
  const trackedDropIdSet = new Set(uniqueDropIds);

  for (const event of db.townhallTelemetryEvents) {
    if (!trackedDropIdSet.has(event.dropId)) {
      continue;
    }

    const current = byDropId[event.dropId] ?? emptyTelemetrySignals();
    if (event.eventType === "watch_time") {
      current.watchTimeSeconds += normalizeWatchTimeSeconds(event.watchTimeSeconds);
    } else if (event.eventType === "completion") {
      current.completions += 1;
    } else if (event.eventType === "collect_intent") {
      current.collectIntents += 1;
    } else if (event.eventType === "impression") {
      current.impressions += 1;
    }

    byDropId[event.dropId] = current;
  }

  return byDropId;
}

function accountHandleLookup(db: BffDatabase): Map<string, string> {
  return new Map(db.accounts.map((account) => [account.id, account.handle]));
}

function canViewPrivateCollectExecutionPrice(
  offer: CollectOfferRecord,
  viewerAccountId: string | null
): boolean {
  if (!viewerAccountId) {
    return false;
  }
  return viewerAccountId === offer.accountId;
}

function toCollectOffer(
  offer: CollectOfferRecord,
  accountHandleById: Map<string, string>,
  viewerAccountId: string | null
): CollectOffer {
  const isPrivate = offer.executionVisibility === "private";
  const canViewPrivate = canViewPrivateCollectExecutionPrice(offer, viewerAccountId);
  const executionPriceUsd = isPrivate && !canViewPrivate ? null : offer.executionPriceUsd;

  return {
    id: offer.id,
    dropId: offer.dropId,
    listingType: offer.listingType,
    amountUsd: offer.amountUsd,
    state: offer.state,
    actorHandle: accountHandleById.get(offer.accountId) ?? "collector",
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    expiresAt: offer.expiresAt,
    executionVisibility: offer.executionVisibility,
    executionPriceUsd
  };
}

function trimCollectOffers(db: BffDatabase): void {
  if (db.collectOffers.length > COLLECT_OFFERS_LOG_LIMIT) {
    db.collectOffers.length = COLLECT_OFFERS_LOG_LIMIT;
  }
}

function trimCollectEnforcementSignals(db: BffDatabase): void {
  if (db.collectEnforcementSignals.length > COLLECT_ENFORCEMENT_SIGNAL_LOG_LIMIT) {
    db.collectEnforcementSignals.length = COLLECT_ENFORCEMENT_SIGNAL_LOG_LIMIT;
  }
}

function recordCollectEnforcementSignalInDatabase(
  db: BffDatabase,
  input: {
    signalType: CollectEnforcementSignalType;
    reason: string;
    dropId?: string | null;
    offerId?: string | null;
    accountId?: string | null;
    occurredAt?: string;
  }
): CollectEnforcementSignalRecord {
  const signal: CollectEnforcementSignalRecord = {
    id: `sig_${randomUUID()}`,
    signalType: input.signalType,
    dropId: input.dropId ?? null,
    offerId: input.offerId ?? null,
    accountId: input.accountId ?? null,
    reason: input.reason.trim() || "collect enforcement signal",
    occurredAt: input.occurredAt ?? new Date().toISOString()
  };

  db.collectEnforcementSignals.unshift(signal);
  trimCollectEnforcementSignals(db);
  return signal;
}

function toCollectEnforcementSignal(record: CollectEnforcementSignalRecord): CollectEnforcementSignal {
  return {
    id: record.id,
    signalType: record.signalType,
    dropId: record.dropId,
    offerId: record.offerId,
    accountId: record.accountId,
    reason: record.reason,
    occurredAt: record.occurredAt
  };
}

function emptyCollectSignalCounts(): Record<CollectEnforcementSignalType, number> {
  return {
    invalid_listing_action_blocked: 0,
    invalid_amount_rejected: 0,
    invalid_transition_blocked: 0,
    unauthorized_transition_blocked: 0,
    cross_drop_transition_blocked: 0,
    invalid_settle_price_rejected: 0,
    reaward_blocked: 0
  };
}

function buildCollectIntegritySnapshot(
  db: BffDatabase,
  input?: {
    dropId?: string | null;
    limit?: number;
  }
): CollectIntegritySnapshot {
  const scopedDropId = input?.dropId?.trim() || null;
  const limit = Math.max(
    1,
    Math.min(COLLECT_INTEGRITY_RECENT_SIGNAL_LIMIT, Math.floor(input?.limit ?? 25))
  );
  const scopedSignals = db.collectEnforcementSignals.filter((signal) =>
    scopedDropId ? signal.dropId === scopedDropId : true
  );

  const signalCounts = emptyCollectSignalCounts();
  const latestByType = new Map<CollectEnforcementSignalType, CollectEnforcementSignalRecord>();

  for (const signal of scopedSignals) {
    signalCounts[signal.signalType] += 1;
    if (!latestByType.has(signal.signalType)) {
      latestByType.set(signal.signalType, signal);
    }
  }

  const flags: CollectIntegrityFlag[] = [];
  for (const signalType of COLLECT_ENFORCEMENT_SIGNAL_TYPES) {
    const count = signalCounts[signalType];
    if (count <= 0) {
      continue;
    }

    const latest = latestByType.get(signalType);
    if (!latest) {
      continue;
    }

    flags.push({
      code: signalType,
      severity: COLLECT_SIGNAL_SEVERITY[signalType],
      dropId: scopedDropId,
      count,
      lastOccurredAt: latest.occurredAt,
      reason: latest.reason
    });
  }

  const settledByDrop = new Map<string, number>();
  for (const offer of db.collectOffers) {
    if (offer.state !== "settled") {
      continue;
    }

    if (scopedDropId && offer.dropId !== scopedDropId) {
      continue;
    }

    settledByDrop.set(offer.dropId, (settledByDrop.get(offer.dropId) ?? 0) + 1);
  }

  const multiSettledDrops = Array.from(settledByDrop.entries()).filter(([, count]) => count > 1);
  if (multiSettledDrops.length > 0) {
    if (scopedDropId) {
      const settledCount = multiSettledDrops[0]?.[1] ?? 0;
      flags.push({
        code: "multiple_settled_offers",
        severity: "critical",
        dropId: scopedDropId,
        count: settledCount,
        lastOccurredAt: new Date().toISOString(),
        reason: "multiple settled offers found for one drop"
      });
    } else {
      flags.push({
        code: "multiple_settled_offers",
        severity: "critical",
        dropId: null,
        count: multiSettledDrops.length,
        lastOccurredAt: new Date().toISOString(),
        reason: "multiple drops have more than one settled offer"
      });
    }
  }

  return {
    dropId: scopedDropId,
    flags,
    signalCounts,
    recentSignals: scopedSignals.slice(0, limit).map(toCollectEnforcementSignal)
  };
}

function buildCollectInventoryView(
  db: BffDatabase,
  viewerAccountId: string | null,
  lane: CollectMarketLane = "all"
): {
  lane: CollectMarketLane;
  listings: CollectInventoryListing[];
} {
  const accountHandleById = accountHandleLookup(db);
  const offers = db.collectOffers.map((offer) =>
    toCollectOffer(offer, accountHandleById, viewerAccountId)
  );
  const snapshot = buildCollectInventorySnapshotFromOffers(db.catalog.drops, offers);
  return {
    lane,
    listings: listCollectInventoryByLane(snapshot.listings, lane)
  };
}

function buildCollectDropOffersView(
  db: BffDatabase,
  dropId: string,
  viewerAccountId: string | null
): {
  listing: CollectInventoryListing;
  offers: CollectOffer[];
} | null {
  const accountHandleById = accountHandleLookup(db);
  const offers = db.collectOffers.map((offer) =>
    toCollectOffer(offer, accountHandleById, viewerAccountId)
  );
  const snapshot = buildCollectInventorySnapshotFromOffers(db.catalog.drops, offers);
  const listing = snapshot.listings.find((entry) => entry.drop.id === dropId) ?? null;
  if (!listing) {
    return null;
  }

  return {
    listing,
    offers: snapshot.offersByDropId[dropId] ?? []
  };
}

function canModerateCollectOfferTransition(
  account: AccountRecord,
  drop: Drop
): boolean {
  return account.roles.includes("creator") && account.handle === drop.studioHandle;
}

function canTransitionCollectOffer(
  db: BffDatabase,
  account: AccountRecord,
  offer: CollectOfferRecord,
  action: CollectOfferAction
): boolean {
  const drop = findDropById(db, offer.dropId);
  if (!drop) {
    return false;
  }

  if (action === "withdraw_offer") {
    return offer.accountId === account.id;
  }

  if (action === "counter_offer" || action === "accept_offer" || action === "settle_offer" || action === "expire_offer") {
    return canModerateCollectOfferTransition(account, drop);
  }

  return false;
}

function normalizePositiveAmountUsd(value: number): number | null {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }
  return Number(normalized.toFixed(2));
}

function parseIsoTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseIsoTimestamp(value: string): number | null {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function resolveCurrentTimeMs(): number {
  const nowMsRaw = process.env.OOK_TEST_NOW_MS;
  if (typeof nowMsRaw === "string" && nowMsRaw.trim().length > 0) {
    const parsedNowMs = Number(nowMsRaw);
    if (Number.isFinite(parsedNowMs) && parsedNowMs > 0) {
      return Math.floor(parsedNowMs);
    }
  }

  const nowIsoRaw = process.env.OOK_TEST_NOW_ISO;
  if (typeof nowIsoRaw === "string" && nowIsoRaw.trim().length > 0) {
    const parsedNowIso = Date.parse(nowIsoRaw);
    if (Number.isFinite(parsedNowIso)) {
      return parsedNowIso;
    }
  }

  return Date.now();
}

function parseDropReleaseAtMs(drop: Drop): number | null {
  if (typeof drop.releaseAt !== "string" || drop.releaseAt.trim().length === 0) {
    return null;
  }

  const parsed = Date.parse(drop.releaseAt);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function findLatestLiveSessionForExclusiveDropCollect(
  db: BffDatabase,
  dropId: string
): LiveSessionRecord | null {
  const candidates = db.liveSessions
    .filter(
      (liveSession) =>
        liveSession.exclusiveDropWindowDropId === dropId || liveSession.dropId === dropId
    )
    .sort((a, b) => parseIsoTime(b.startsAt) - parseIsoTime(a.startsAt));

  return candidates[0] ?? null;
}

function canAccountCollectDropDuringExclusiveLiveSessionWindow(
  db: BffDatabase,
  account: AccountRecord,
  drop: Drop,
  nowMs: number,
  liveSessionId?: string | null
): boolean {
  const liveSession = liveSessionId
    ? db.liveSessions.find((entry) => entry.id === liveSessionId) ?? null
    : findLatestLiveSessionForExclusiveDropCollect(db, drop.id);
  if (!liveSession) {
    return false;
  }

  if (liveSession.dropId !== drop.id && liveSession.exclusiveDropWindowDropId !== drop.id) {
    return false;
  }

  if (isLiveSessionExclusiveWindowClosed(liveSession, nowMs)) {
    return false;
  }

  return hasLiveSessionAttendance(db, liveSession.id, account.id);
}

function canAccountCollectDropNow(
  db: BffDatabase,
  account: AccountRecord,
  drop: Drop,
  options?: {
    nowMs?: number;
    liveSessionId?: string | null;
  }
): boolean {
  const nowMs = options?.nowMs ?? resolveCurrentTimeMs();
  const releaseAtMs = parseDropReleaseAtMs(drop);
  if (releaseAtMs === null || nowMs >= releaseAtMs) {
    return true;
  }

  if (account.roles.includes("creator") && account.handle === drop.studioHandle) {
    return true;
  }

  if (findOwnershipByDrop(db, account.id, drop.id)) {
    return true;
  }

  return canAccountCollectDropDuringExclusiveLiveSessionWindow(
    db,
    account,
    drop,
    nowMs,
    options?.liveSessionId
  );
}

function isMembershipEntitlementActive(
  entitlement: MembershipEntitlementRecord,
  nowMs = Date.now()
): boolean {
  if (entitlement.status !== "active") {
    return false;
  }

  const startedAtMs = Date.parse(entitlement.startedAt);
  if (Number.isFinite(startedAtMs) && startedAtMs > nowMs) {
    return false;
  }

  if (!entitlement.endsAt) {
    return true;
  }

  const endsAtMs = Date.parse(entitlement.endsAt);
  if (!Number.isFinite(endsAtMs)) {
    return false;
  }

  return endsAtMs >= nowMs;
}

function toMembershipWhatYouGet(db: BffDatabase, entitlement: MembershipEntitlementRecord): string {
  if (entitlement.worldId) {
    const world = db.catalog.worlds.find((entry) => entry.id === entitlement.worldId);
    if (world) {
      return `${world.title} membership access in collect and live session eligibility.`;
    }
  }

  return `${entitlement.studioHandle} membership access across eligible live sessions.`;
}

function toMembershipEntitlement(
  db: BffDatabase,
  entitlement: MembershipEntitlementRecord
): MembershipEntitlement {
  const isActive = isMembershipEntitlementActive(entitlement);

  return {
    id: entitlement.id,
    accountId: entitlement.accountId,
    studioHandle: entitlement.studioHandle,
    worldId: entitlement.worldId,
    status: entitlement.status,
    startedAt: entitlement.startedAt,
    endsAt: entitlement.endsAt,
    whatYouGet: toMembershipWhatYouGet(db, entitlement),
    isActive
  };
}

function toPublicPatron(patron: PatronRecord): Pick<Patron, "handle" | "studioHandle" | "status" | "committedAt"> {
  return {
    handle: patron.handle,
    studioHandle: patron.studioHandle,
    status: patron.status,
    committedAt: patron.committedAt
  };
}

function toPatronTierConfig(config: PatronTierConfigRecord): PatronTierConfig {
  return {
    id: config.id,
    studioHandle: config.studioHandle,
    worldId: config.worldId,
    title: config.title,
    amountCents: config.amountCents,
    commitmentCadence: config.commitmentCadence,
    periodDays: config.periodDays,
    earlyAccessWindowHours: config.earlyAccessWindowHours,
    benefitsSummary: config.benefitsSummary,
    status: config.status,
    updatedAt: config.updatedAt,
    updatedByHandle: config.updatedByHandle
  };
}

function trimPatronTierConfigs(db: BffDatabase): void {
  if (db.patronTierConfigs.length > PATRON_TIER_CONFIG_LOG_LIMIT) {
    db.patronTierConfigs.length = PATRON_TIER_CONFIG_LOG_LIMIT;
  }
}

function toWorkshopProProfile(record: WorkshopProProfileRecord): WorkshopProProfile {
  return {
    studioHandle: record.studioHandle,
    state: record.state,
    cycleAnchorAt: record.cycleAnchorAt,
    pastDueAt: record.pastDueAt ?? undefined,
    graceEndsAt: record.graceEndsAt ?? undefined,
    lockedAt: record.lockedAt ?? undefined,
    updatedAt: record.updatedAt
  };
}

function trimWorkshopProProfiles(db: BffDatabase): void {
  if (db.workshopProProfiles.length > WORKSHOP_PRO_PROFILE_LOG_LIMIT) {
    db.workshopProProfiles.length = WORKSHOP_PRO_PROFILE_LOG_LIMIT;
  }
}

function ensureWorkshopProProfileRecord(
  db: BffDatabase,
  studioHandle: string
): {
  profile: WorkshopProProfileRecord;
  created: boolean;
} {
  const existing = db.workshopProProfiles.find((entry) => entry.studioHandle === studioHandle);
  if (existing) {
    return {
      profile: existing,
      created: false
    };
  }

  const nowIso = new Date().toISOString();
  const profile: WorkshopProProfileRecord = {
    studioHandle,
    state: "active",
    cycleAnchorAt: nowIso,
    pastDueAt: null,
    graceEndsAt: null,
    lockedAt: null,
    updatedAt: nowIso
  };
  db.workshopProProfiles.unshift(profile);
  trimWorkshopProProfiles(db);
  return {
    profile,
    created: true
  };
}

function canTransitionWorkshopProState(current: WorkshopProState, next: WorkshopProState): boolean {
  if (current === next) {
    return true;
  }

  if (current === "active") {
    return next === "past_due";
  }

  if (current === "past_due") {
    return next === "grace" || next === "active";
  }

  if (current === "grace") {
    return next === "locked" || next === "active";
  }

  if (current === "locked") {
    return next === "active";
  }

  return false;
}

function applyWorkshopProStateTransition(
  profile: WorkshopProProfileRecord,
  nextState: WorkshopProState
): boolean {
  if (!canTransitionWorkshopProState(profile.state, nextState)) {
    return false;
  }

  const nowIso = new Date().toISOString();
  profile.state = nextState;
  profile.updatedAt = nowIso;

  if (nextState === "active") {
    profile.pastDueAt = null;
    profile.graceEndsAt = null;
    profile.lockedAt = null;
    return true;
  }

  if (nextState === "past_due") {
    profile.pastDueAt = nowIso;
    profile.graceEndsAt = null;
    profile.lockedAt = null;
    return true;
  }

  if (nextState === "grace") {
    if (!profile.pastDueAt) {
      profile.pastDueAt = nowIso;
    }
    profile.graceEndsAt = new Date(
      Date.now() + WORKSHOP_PRO_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    profile.lockedAt = null;
    return true;
  }

  if (nextState === "locked") {
    profile.lockedAt = nowIso;
    return true;
  }

  return true;
}

function findEffectivePatronTierConfig(
  db: BffDatabase,
  studioHandle: string,
  worldId: string | null
): PatronTierConfigRecord | null {
  if (worldId) {
    const worldScoped =
      db.patronTierConfigs.find(
        (entry) =>
          entry.studioHandle === studioHandle &&
          entry.worldId === worldId &&
          entry.status === "active"
      ) ?? null;
    if (worldScoped) {
      return worldScoped;
    }
  }

  return (
    db.patronTierConfigs.find(
      (entry) => entry.studioHandle === studioHandle && entry.worldId === null && entry.status === "active"
    ) ?? null
  );
}

function toPatronRosterEntry(
  patron: PatronRecord,
  recognitionTier: PatronRosterEntry["recognitionTier"] = "active"
): PatronRosterEntry {
  return {
    handle: patron.handle,
    status: patron.status,
    recognitionTier,
    committedAt: patron.committedAt
  };
}

function trimPatrons(db: BffDatabase): void {
  if (db.patrons.length > PATRON_ROSTER_LOG_LIMIT) {
    db.patrons.length = PATRON_ROSTER_LOG_LIMIT;
  }
}

function trimPatronCommitments(db: BffDatabase): void {
  if (db.patronCommitments.length > PATRON_COMMITMENT_LOG_LIMIT) {
    db.patronCommitments.length = PATRON_COMMITMENT_LOG_LIMIT;
  }
}

function trimWorldConversationMessages(db: BffDatabase): void {
  if (db.worldConversationMessages.length > WORLD_CONVERSATION_MESSAGE_LOG_LIMIT) {
    db.worldConversationMessages.length = WORLD_CONVERSATION_MESSAGE_LOG_LIMIT;
  }
}

function trimLiveSessionConversationMessages(db: BffDatabase): void {
  if (db.liveSessionConversationMessages.length > LIVE_SESSION_CONVERSATION_MESSAGE_LOG_LIMIT) {
    db.liveSessionConversationMessages.length = LIVE_SESSION_CONVERSATION_MESSAGE_LOG_LIMIT;
  }
}

function hasActiveMembershipForWorld(
  db: BffDatabase,
  account: AccountRecord,
  world: World
): boolean {
  return db.membershipEntitlements.some((entitlement) => {
    if (entitlement.accountId !== account.id) {
      return false;
    }

    if (!isMembershipEntitlementActive(entitlement)) {
      return false;
    }

    if (entitlement.studioHandle !== world.studioHandle) {
      return false;
    }

    return entitlement.worldId === null || entitlement.worldId === world.id;
  });
}

function hasActivePatronForWorld(
  db: BffDatabase,
  account: AccountRecord,
  world: World
): boolean {
  return db.patrons.some(
    (patron) =>
      patron.accountId === account.id &&
      patron.studioHandle === world.studioHandle &&
      patron.status === "active"
  );
}

function hasCollectEntitlementForWorld(
  db: BffDatabase,
  account: AccountRecord,
  world: World
): boolean {
  const hasWorldCollectOwnership = db.worldCollectOwnerships.some(
    (ownership) =>
      ownership.accountId === account.id &&
      ownership.worldId === world.id &&
      ownership.status === "active"
  );

  if (hasWorldCollectOwnership) {
    return true;
  }

  return db.ownerships.some((ownership) => {
    if (ownership.accountId !== account.id) {
      return false;
    }
    const drop = findDropById(db, ownership.dropId);
    return drop?.worldId === world.id;
  });
}

function canAccessWorldPatronRoster(
  db: BffDatabase,
  account: AccountRecord,
  world: World
): boolean {
  const access = buildWorldPatronRosterViewerAccess(db, account, world);
  return (
    access.hasMembershipEntitlement ||
    access.hasCollectEntitlement ||
    access.hasCreatorAccess ||
    access.hasPatronCommitment
  );
}

function buildWorldPatronRosterViewerAccess(
  db: BffDatabase,
  account: AccountRecord,
  world: World
): WorldPatronRosterViewerAccess {
  const hasMembershipEntitlement = hasActiveMembershipForWorld(db, account, world);
  const hasCollectEntitlement = hasCollectEntitlementForWorld(db, account, world);
  const hasCreatorAccess = account.roles.includes("creator") && account.handle === world.studioHandle;
  const hasPatronCommitment = hasActivePatronForWorld(db, account, world);

  return {
    hasMembershipEntitlement,
    hasCollectEntitlement,
    hasCreatorAccess,
    hasPatronCommitment
  };
}

function canAccessWorldConversationThread(
  db: BffDatabase,
  account: AccountRecord,
  world: World
): boolean {
  if (canAccessWorldPatronRoster(db, account, world)) {
    return true;
  }

  return account.roles.includes("creator") && account.handle === world.studioHandle;
}

function isLiveSessionActiveNow(liveSession: LiveSessionRecord, nowMs: number): boolean {
  const startsAtMs = Date.parse(liveSession.startsAt);
  if (!Number.isFinite(startsAtMs) || nowMs < startsAtMs) {
    return false;
  }

  if (!liveSession.endsAt) {
    return true;
  }

  const endsAtMs = Date.parse(liveSession.endsAt);
  if (!Number.isFinite(endsAtMs)) {
    return false;
  }

  return nowMs <= endsAtMs;
}

function canAccessLiveSessionConversationThread(
  db: BffDatabase,
  account: AccountRecord,
  liveSession: LiveSessionRecord,
  nowMs: number
): boolean {
  if (!isLiveSessionActiveNow(liveSession, nowMs)) {
    return false;
  }

  if (account.roles.includes("creator") && account.handle === liveSession.studioHandle) {
    return true;
  }

  return resolveLiveSessionEligibilityInDatabase(db, account.id, liveSession).eligible;
}

function toLiveSessionWhatYouGet(db: BffDatabase, liveSession: LiveSessionRecord): string {
  if (liveSession.eligibilityRule === "public") {
    return "public live session access.";
  }

  if (liveSession.eligibilityRule === "membership_active") {
    if (liveSession.worldId) {
      const world = db.catalog.worlds.find((entry) => entry.id === liveSession.worldId);
      if (world) {
        return `active membership required for ${world.title}.`;
      }
    }

    return `active membership required for ${liveSession.studioHandle}.`;
  }

  if (liveSession.dropId) {
    const drop = db.catalog.drops.find((entry) => entry.id === liveSession.dropId);
    if (drop) {
      return `${drop.title} ownership required to join.`;
    }
  }

  return "drop ownership required to join.";
}

function resolveLiveSessionType(liveSession: LiveSessionRecord): LiveSession["type"] {
  if (
    liveSession.type === "opening" ||
    liveSession.type === "event" ||
    liveSession.type === "studio_session"
  ) {
    return liveSession.type;
  }

  return "event";
}

function resolveCreateLiveSessionType(
  type: CreateWorkshopLiveSessionInput["type"],
  eligibilityRule: CreateWorkshopLiveSessionInput["eligibilityRule"]
): LiveSessionType {
  if (type === "opening" || type === "event" || type === "studio_session") {
    return type;
  }

  return eligibilityRule === "public" ? "studio_session" : "opening";
}

function resolveLiveSessionAudienceEligibility(
  liveSession: LiveSessionRecord
): LiveSession["eligibility"] {
  if (
    liveSession.eligibility === "open" ||
    liveSession.eligibility === "membership" ||
    liveSession.eligibility === "patron" ||
    liveSession.eligibility === "invite"
  ) {
    return liveSession.eligibility;
  }

  if (liveSession.eligibilityRule === "membership_active") {
    return "membership";
  }

  if (liveSession.eligibilityRule === "drop_owner") {
    return "invite";
  }

  return "open";
}

function toLiveSession(db: BffDatabase, liveSession: LiveSessionRecord): LiveSession {
  return {
    id: liveSession.id,
    studioHandle: liveSession.studioHandle,
    worldId: liveSession.worldId,
    dropId: liveSession.dropId,
    title: liveSession.title,
    synopsis: liveSession.synopsis,
    startsAt: liveSession.startsAt,
    endsAt: liveSession.endsAt,
    mode: "live",
    eligibilityRule: liveSession.eligibilityRule,
    type: resolveLiveSessionType(liveSession),
    eligibility: resolveLiveSessionAudienceEligibility(liveSession),
    spatialAudio: Boolean(liveSession.spatialAudio),
    exclusiveDropWindowDropId: liveSession.exclusiveDropWindowDropId ?? undefined,
    exclusiveDropWindowDelay:
      typeof liveSession.exclusiveDropWindowDelay === "number"
        ? liveSession.exclusiveDropWindowDelay
        : undefined,
    capacity:
      typeof liveSession.capacity === "number" && Number.isFinite(liveSession.capacity)
        ? Math.max(1, Math.floor(liveSession.capacity))
        : 200,
    whatYouGet: toLiveSessionWhatYouGet(db, liveSession)
  };
}

function toLiveSessionArtifact(record: LiveSessionArtifactRecord): LiveSessionArtifact {
  return {
    id: record.id,
    liveSessionId: record.liveSessionId,
    studioHandle: record.studioHandle,
    worldId: record.worldId,
    sourceDropId: record.sourceDropId,
    artifactKind: record.artifactKind,
    title: record.title,
    synopsis: record.synopsis,
    status: record.status,
    capturedAt: record.capturedAt,
    approvedAt: record.approvedAt ?? undefined,
    catalogDropId: record.catalogDropId ?? undefined
  };
}

function toDropLiveArtifactEntry(
  db: BffDatabase,
  artifact: LiveSessionArtifactRecord
): DropLiveArtifactEntry | null {
  if (artifact.status !== "approved" || !artifact.catalogDropId || !artifact.approvedAt) {
    return null;
  }

  const catalogDrop = findDropById(db, artifact.catalogDropId);
  if (!catalogDrop) {
    return null;
  }

  const liveSession = db.liveSessions.find((entry) => entry.id === artifact.liveSessionId) ?? null;
  const sourceDrop = artifact.sourceDropId ? findDropById(db, artifact.sourceDropId) : null;

  return {
    artifactId: artifact.id,
    artifactKind: artifact.artifactKind,
    title: artifact.title,
    synopsis: artifact.synopsis,
    capturedAt: artifact.capturedAt,
    approvedAt: artifact.approvedAt,
    liveSessionId: artifact.liveSessionId,
    liveSessionTitle: liveSession?.title ?? artifact.liveSessionId,
    liveSessionStartsAt: liveSession?.startsAt ?? artifact.capturedAt,
    liveSessionType: liveSession ? (resolveLiveSessionType(liveSession) ?? "event") : "event",
    sourceDropId: artifact.sourceDropId,
    sourceDropTitle: sourceDrop?.title ?? null,
    catalogDropId: artifact.catalogDropId,
    catalogDropTitle: catalogDrop.title
  };
}

function buildDropLiveArtifactsSnapshot(
  db: BffDatabase,
  dropId: string
): DropLiveArtifactsSnapshot | null {
  const drop = findDropById(db, dropId);
  if (!drop) {
    return null;
  }

  const artifacts = db.liveSessionArtifacts
    .filter((artifact) => artifact.status === "approved")
    .filter((artifact) => artifact.catalogDropId === drop.id || artifact.sourceDropId === drop.id)
    .map((artifact) => toDropLiveArtifactEntry(db, artifact))
    .filter((entry): entry is DropLiveArtifactEntry => entry !== null)
    .sort((a, b) => {
      const approvedDelta = Date.parse(b.approvedAt) - Date.parse(a.approvedAt);
      if (approvedDelta !== 0) {
        return approvedDelta;
      }
      return Date.parse(b.capturedAt) - Date.parse(a.capturedAt);
    });

  return {
    dropId: drop.id,
    artifacts
  };
}

function trimLiveSessionArtifacts(db: BffDatabase): void {
  if (db.liveSessionArtifacts.length > LIVE_SESSION_ARTIFACT_LOG_LIMIT) {
    db.liveSessionArtifacts.length = LIVE_SESSION_ARTIFACT_LOG_LIMIT;
  }
}

function trimLiveSessionAttendees(db: BffDatabase): void {
  if (db.liveSessionAttendees.length > LIVE_SESSION_ATTENDANCE_LOG_LIMIT) {
    db.liveSessionAttendees.length = LIVE_SESSION_ATTENDANCE_LOG_LIMIT;
  }
}

function hasLiveSessionAttendance(
  db: BffDatabase,
  liveSessionId: string,
  accountId: string
): boolean {
  return db.liveSessionAttendees.some(
    (attendee) => attendee.liveSessionId === liveSessionId && attendee.accountId === accountId
  );
}

function countLiveSessionAttendees(db: BffDatabase, liveSessionId: string): number {
  const uniqueAccountIds = new Set<string>();
  for (const attendee of db.liveSessionAttendees) {
    if (attendee.liveSessionId === liveSessionId) {
      uniqueAccountIds.add(attendee.accountId);
    }
  }
  return uniqueAccountIds.size;
}

function resolveLiveSessionEligibilityInDatabase(
  db: BffDatabase,
  accountId: string,
  liveSession: LiveSessionRecord
): LiveSessionEligibility {
  const account = findAccountById(db, accountId);
  if (!account) {
    return {
      liveSessionId: liveSession.id,
      rule: liveSession.eligibilityRule,
      eligible: false,
      reason: "session_required",
      matchedEntitlementId: null
    };
  }

  if (liveSession.worldId) {
    const world = findWorldById(db, liveSession.worldId);
    if (world) {
      const hasCreatorAccess = account.roles.includes("creator") && account.handle === world.studioHandle;
      if (!hasCreatorAccess && world.entryRule === "membership") {
        const hasWorldMembership = hasActiveMembershipForWorld(db, account, world);
        const hasWorldCollect = hasCollectEntitlementForWorld(db, account, world);
        if (!hasWorldMembership && !hasWorldCollect) {
          return {
            liveSessionId: liveSession.id,
            rule: liveSession.eligibilityRule,
            eligible: false,
            reason: "membership_required",
            matchedEntitlementId: null
          };
        }
      }

      if (!hasCreatorAccess && world.entryRule === "patron") {
        const hasWorldPatron = hasActivePatronForWorld(db, account, world);
        const hasWorldCollect = hasCollectEntitlementForWorld(db, account, world);
        if (!hasWorldPatron && !hasWorldCollect) {
          return {
            liveSessionId: liveSession.id,
            rule: liveSession.eligibilityRule,
            eligible: false,
            reason: "patron_required",
            matchedEntitlementId: null
          };
        }
      }
    }
  }

  if (liveSession.eligibilityRule === "public") {
    return {
      liveSessionId: liveSession.id,
      rule: liveSession.eligibilityRule,
      eligible: true,
      reason: "eligible_public",
      matchedEntitlementId: null
    };
  }

  if (liveSession.eligibilityRule === "membership_active") {
    const match = db.membershipEntitlements.find((entitlement) => {
      if (entitlement.accountId !== account.id) {
        return false;
      }

      if (entitlement.studioHandle !== liveSession.studioHandle) {
        return false;
      }

      if (!isMembershipEntitlementActive(entitlement)) {
        return false;
      }

      if (!liveSession.worldId) {
        return entitlement.worldId === null;
      }

      return entitlement.worldId === null || entitlement.worldId === liveSession.worldId;
    });

    if (match) {
      return {
        liveSessionId: liveSession.id,
        rule: liveSession.eligibilityRule,
        eligible: true,
        reason: "eligible_membership_active",
        matchedEntitlementId: match.id
      };
    }

    return {
      liveSessionId: liveSession.id,
      rule: liveSession.eligibilityRule,
      eligible: false,
      reason: "membership_required",
      matchedEntitlementId: null
    };
  }

  if (!liveSession.dropId) {
    return {
      liveSessionId: liveSession.id,
      rule: liveSession.eligibilityRule,
      eligible: false,
      reason: "ownership_required",
      matchedEntitlementId: null
    };
  }

  const ownsDrop = db.ownerships.some(
    (ownership) => ownership.accountId === account.id && ownership.dropId === liveSession.dropId
  );

  return {
    liveSessionId: liveSession.id,
    rule: liveSession.eligibilityRule,
    eligible: ownsDrop,
    reason: ownsDrop ? "eligible_drop_owner" : "ownership_required",
    matchedEntitlementId: null
  };
}

function listWorkshopLiveSessionsInDatabase(
  db: BffDatabase,
  account: AccountRecord
): LiveSession[] {
  return db.liveSessions
    .filter((liveSession) => liveSession.studioHandle === account.handle)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map((liveSession) => toLiveSession(db, liveSession));
}

function createWorkshopLiveSessionInDatabase(
  db: BffDatabase,
  accountId: string,
  input: CreateWorkshopLiveSessionInput
): {
  persist: boolean;
  result: LiveSession | null;
} {
  const account = findAccountById(db, accountId);
  if (!account || !account.roles.includes("creator")) {
    return {
      persist: false,
      result: null
    };
  }

  const title = input.title.trim();
  if (!title) {
    return {
      persist: false,
      result: null
    };
  }

  const startsAtMs = parseIsoTimestamp(input.startsAt);
  if (startsAtMs === null) {
    return {
      persist: false,
      result: null
    };
  }

  let endsAt: string | null = null;
  if (input.endsAt) {
    const endsAtMs = parseIsoTimestamp(input.endsAt);
    if (endsAtMs === null || endsAtMs <= startsAtMs) {
      return {
        persist: false,
        result: null
      };
    }
    endsAt = new Date(endsAtMs).toISOString();
  }

  let worldId: string | null = input.worldId;
  if (worldId) {
    const world = findWorldById(db, worldId);
    if (!world || world.studioHandle !== account.handle) {
      return {
        persist: false,
        result: null
      };
    }
  }

  const dropId: string | null = input.dropId;
  if (dropId) {
    const drop = findDropById(db, dropId);
    if (!drop || drop.studioHandle !== account.handle) {
      return {
        persist: false,
        result: null
      };
    }

    if (worldId && drop.worldId !== worldId) {
      return {
        persist: false,
        result: null
      };
    }

    if (!worldId) {
      worldId = drop.worldId;
    }
  }

  if (input.eligibilityRule === "drop_owner" && !dropId) {
    return {
      persist: false,
      result: null
    };
  }

  const capacity =
    typeof input.capacity === "number" && Number.isFinite(input.capacity)
      ? Math.max(1, Math.floor(input.capacity))
      : 200;
  const spatialAudio = Boolean(input.spatialAudio);

  const record: LiveSessionRecord = {
    id: `live_workshop_${randomUUID()}`,
    studioHandle: account.handle,
    worldId,
    dropId,
    title,
    synopsis: input.synopsis.trim(),
    startsAt: new Date(startsAtMs).toISOString(),
    endsAt,
    mode: "live",
    eligibilityRule: input.eligibilityRule,
    type: resolveCreateLiveSessionType(input.type, input.eligibilityRule),
    eligibility:
      input.eligibilityRule === "membership_active"
        ? "membership"
        : input.eligibilityRule === "drop_owner"
          ? "invite"
          : "open",
    spatialAudio,
    exclusiveDropWindowDropId: dropId,
    exclusiveDropWindowDelay: dropId ? 1440 : null,
    capacity
  };

  db.liveSessions.unshift(record);

  const followers = db.studioFollows.filter(
    (f) => f.studioHandle.toLowerCase() === account.handle.toLowerCase()
  );
  for (const follower of followers) {
    emitNotification(
      db,
      follower.accountId,
      "live_session_starting",
      `@${account.handle} scheduled a live session`,
      `${title} is coming up. mark your calendar.`,
      null
    );
  }

  return {
    persist: true,
    result: toLiveSession(db, record)
  };
}

function releaseWorkshopLiveSessionDropInDatabase(
  db: BffDatabase,
  accountId: string,
  liveSessionId: string,
  input: {
    dropId: string;
    publicReleaseDelayMinutes?: number | null;
  }
): {
  persist: boolean;
  result: LiveSession | null;
} {
  const account = findAccountById(db, accountId);
  if (!account || !account.roles.includes("creator")) {
    return {
      persist: false,
      result: null
    };
  }

  const liveSession = db.liveSessions.find((entry) => entry.id === liveSessionId) ?? null;
  if (!liveSession || liveSession.studioHandle !== account.handle) {
    return {
      persist: false,
      result: null
    };
  }

  const dropId = input.dropId.trim();
  if (!dropId) {
    return {
      persist: false,
      result: null
    };
  }

  const drop = findDropById(db, dropId);
  if (!drop || drop.studioHandle !== account.handle) {
    return {
      persist: false,
      result: null
    };
  }

  if (liveSession.worldId && drop.worldId !== liveSession.worldId) {
    return {
      persist: false,
      result: null
    };
  }

  const nowMs = resolveCurrentTimeMs();
  if (!isLiveSessionActiveNow(liveSession, nowMs) || isLiveSessionExclusiveWindowClosed(liveSession, nowMs)) {
    return {
      persist: false,
      result: null
    };
  }

  const configuredDelayMinutes =
    typeof input.publicReleaseDelayMinutes === "number" &&
    Number.isFinite(input.publicReleaseDelayMinutes)
      ? Math.floor(input.publicReleaseDelayMinutes)
      : LIVE_SESSION_PUBLIC_RELEASE_DELAY_MINUTES_MIN;
  if (configuredDelayMinutes < LIVE_SESSION_PUBLIC_RELEASE_DELAY_MINUTES_MIN) {
    return {
      persist: false,
      result: null
    };
  }

  const exclusiveWindowEndMs = getLiveSessionExclusiveWindowEndMs(liveSession);
  if (!Number.isFinite(exclusiveWindowEndMs)) {
    return {
      persist: false,
      result: null
    };
  }

  const publicReleaseAtMs = exclusiveWindowEndMs + configuredDelayMinutes * 60 * 1000;
  if (!Number.isFinite(publicReleaseAtMs)) {
    return {
      persist: false,
      result: null
    };
  }

  liveSession.dropId = drop.id;
  liveSession.exclusiveDropWindowDropId = drop.id;
  drop.releaseAt = new Date(publicReleaseAtMs).toISOString();

  return {
    persist: true,
    result: toLiveSession(db, liveSession)
  };
}

function listWorkshopLiveSessionArtifactsInDatabase(
  db: BffDatabase,
  account: AccountRecord
): LiveSessionArtifact[] {
  return db.liveSessionArtifacts
    .filter((artifact) => artifact.studioHandle === account.handle)
    .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))
    .map((artifact) => toLiveSessionArtifact(artifact));
}

function captureWorkshopLiveSessionArtifactInDatabase(
  db: BffDatabase,
  accountId: string,
  input: CaptureWorkshopLiveSessionArtifactInput
): {
  persist: boolean;
  result: LiveSessionArtifact | null;
} {
  const account = findAccountById(db, accountId);
  if (!account || !account.roles.includes("creator")) {
    return {
      persist: false,
      result: null
    };
  }

  const liveSession = db.liveSessions.find((entry) => entry.id === input.liveSessionId);
  if (!liveSession || liveSession.studioHandle !== account.handle) {
    return {
      persist: false,
      result: null
    };
  }

  const title = input.title.trim();
  if (!title) {
    return {
      persist: false,
      result: null
    };
  }

  const artifactKind = input.artifactKind ?? "highlight";
  if (!isLiveSessionArtifactKind(artifactKind)) {
    return {
      persist: false,
      result: null
    };
  }

  let worldId = input.worldId;
  if (!worldId && liveSession.worldId) {
    worldId = liveSession.worldId;
  }

  if (worldId) {
    const world = findWorldById(db, worldId);
    if (!world || world.studioHandle !== account.handle) {
      return {
        persist: false,
        result: null
      };
    }
  }

  let sourceDropId = input.sourceDropId;
  if (!sourceDropId && liveSession.dropId) {
    sourceDropId = liveSession.dropId;
  }

  if (sourceDropId) {
    const sourceDrop = findDropById(db, sourceDropId);
    if (!sourceDrop || sourceDrop.studioHandle !== account.handle) {
      return {
        persist: false,
        result: null
      };
    }

    if (!worldId) {
      worldId = sourceDrop.worldId;
    }

    if (worldId && sourceDrop.worldId !== worldId) {
      return {
        persist: false,
        result: null
      };
    }
  }

  const nowIso = new Date().toISOString();
  const artifact: LiveSessionArtifactRecord = {
    id: `lart_${randomUUID()}`,
    liveSessionId: liveSession.id,
    studioHandle: account.handle,
    worldId,
    sourceDropId,
    artifactKind,
    title,
    synopsis: input.synopsis.trim(),
    status: "held_for_review",
    capturedAt: nowIso,
    approvedAt: null,
    catalogDropId: null,
    approvedByHandle: null
  };
  db.liveSessionArtifacts.unshift(artifact);
  trimLiveSessionArtifacts(db);

  return {
    persist: true,
    result: toLiveSessionArtifact(artifact)
  };
}

function approveWorkshopLiveSessionArtifactInDatabase(
  db: BffDatabase,
  accountId: string,
  artifactId: string
): {
  persist: boolean;
  result: LiveSessionArtifact | null;
} {
  const account = findAccountById(db, accountId);
  if (!account || !account.roles.includes("creator")) {
    return {
      persist: false,
      result: null
    };
  }

  const artifact = db.liveSessionArtifacts.find(
    (entry) => entry.id === artifactId && entry.studioHandle === account.handle
  );
  if (!artifact || artifact.status !== "held_for_review") {
    return {
      persist: false,
      result: null
    };
  }

  const liveSession = db.liveSessions.find((entry) => entry.id === artifact.liveSessionId) ?? null;
  const sourceDrop =
    (artifact.sourceDropId ? findDropById(db, artifact.sourceDropId) : null) ??
    (liveSession?.dropId ? findDropById(db, liveSession.dropId) : null);
  const worldId = artifact.worldId ?? liveSession?.worldId ?? sourceDrop?.worldId ?? null;
  if (!worldId) {
    return {
      persist: false,
      result: null
    };
  }

  const world = findWorldById(db, worldId);
  if (!world || world.studioHandle !== account.handle) {
    return {
      persist: false,
      result: null
    };
  }

  const nowIso = new Date().toISOString();
  const artifactCountForSession = db.liveSessionArtifacts.filter(
    (entry) => entry.liveSessionId === artifact.liveSessionId
  ).length;
  const generatedDropId = `artifact_${randomUUID()}`;

  db.catalog.drops.unshift({
    id: generatedDropId,
    title: artifact.title,
    seasonLabel: world.releaseStructure?.currentLabel ?? "live artifacts",
    episodeLabel: `artifact ${artifactCountForSession}`,
    studioHandle: account.handle,
    worldId: world.id,
    worldLabel: world.title,
    synopsis:
      artifact.synopsis.trim().length > 0
        ? artifact.synopsis
        : `captured from live session ${liveSession?.title ?? artifact.liveSessionId}.`,
    releaseDate: nowIso.slice(0, 10),
    priceUsd: sourceDrop?.priceUsd ?? 0,
    previewMedia: sourceDrop?.previewMedia,
    collaborators: sourceDrop?.collaborators,
    visibility: "public",
    visibilitySource: "drop",
    previewPolicy: sourceDrop?.previewPolicy ?? "limited",
    releaseAt: nowIso
  });

  artifact.status = "approved";
  artifact.approvedAt = nowIso;
  artifact.catalogDropId = generatedDropId;
  artifact.approvedByHandle = account.handle;
  artifact.worldId = world.id;
  if (!artifact.sourceDropId && sourceDrop) {
    artifact.sourceDropId = sourceDrop.id;
  }

  return {
    persist: true,
    result: toLiveSessionArtifact(artifact)
  };
}

function getWorkshopProProfileInDatabase(
  db: BffDatabase,
  accountId: string
): {
  persist: boolean;
  result: WorkshopProProfile | null;
} {
  const account = findAccountById(db, accountId);
  if (!account || !account.roles.includes("creator")) {
    return {
      persist: false,
      result: null
    };
  }

  const ensured = ensureWorkshopProProfileRecord(db, account.handle);
  return {
    persist: ensured.created,
    result: toWorkshopProProfile(ensured.profile)
  };
}

function transitionWorkshopProStateInDatabase(
  db: BffDatabase,
  accountId: string,
  state: WorkshopProState
): {
  persist: boolean;
  result: WorkshopProProfile | null;
} {
  const account = findAccountById(db, accountId);
  if (!account || !account.roles.includes("creator")) {
    return {
      persist: false,
      result: null
    };
  }

  if (!isWorkshopProState(state) || !WORKSHOP_PRO_STATES.includes(state)) {
    return {
      persist: false,
      result: null
    };
  }

  const currentProfile =
    db.workshopProProfiles.find((entry) => entry.studioHandle === account.handle) ?? null;
  const currentState = currentProfile?.state ?? "active";
  if (!canTransitionWorkshopProState(currentState, state)) {
    return {
      persist: false,
      result: null
    };
  }

  const ensured =
    currentProfile === null ? ensureWorkshopProProfileRecord(db, account.handle) : { profile: currentProfile, created: false };
  if (!applyWorkshopProStateTransition(ensured.profile, state)) {
    return {
      persist: ensured.created,
      result: null
    };
  }

  return {
    persist: true,
    result: toWorkshopProProfile(ensured.profile)
  };
}

function toWorldReleaseQueueItem(record: WorldReleaseQueueRecord): WorldReleaseQueueItem {
  return {
    id: record.id,
    studioHandle: record.studioHandle,
    worldId: record.worldId,
    dropId: record.dropId,
    scheduledFor: record.scheduledFor,
    pacingMode: record.pacingMode,
    pacingWindowHours: record.pacingWindowHours,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
    canceledAt: record.canceledAt
  };
}

function trimWorldReleaseQueue(db: BffDatabase): void {
  if (db.worldReleaseQueue.length > WORLD_RELEASE_QUEUE_LOG_LIMIT) {
    db.worldReleaseQueue.length = WORLD_RELEASE_QUEUE_LOG_LIMIT;
  }
}

function resolveWorldReleasePacingWindowHours(mode: WorldReleaseQueuePacingMode): number {
  return WORLD_RELEASE_PACING_WINDOW_HOURS[mode] ?? 0;
}

function listWorkshopWorldReleaseQueueInDatabase(
  db: BffDatabase,
  account: AccountRecord,
  worldId?: string | null
): WorldReleaseQueueItem[] {
  return db.worldReleaseQueue
    .filter((entry) => {
      if (entry.studioHandle !== account.handle) {
        return false;
      }

      if (worldId && entry.worldId !== worldId) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const scheduleDelta = parseIsoTime(a.scheduledFor) - parseIsoTime(b.scheduledFor);
      if (scheduleDelta !== 0) {
        return scheduleDelta;
      }

      return parseIsoTime(a.createdAt) - parseIsoTime(b.createdAt);
    })
    .map((entry) => toWorldReleaseQueueItem(entry));
}

function hasWorldReleasePacingConflict(
  db: BffDatabase,
  input: {
    studioHandle: string;
    worldId: string;
    scheduledForMs: number;
    pacingWindowHours: number;
  }
): boolean {
  if (input.pacingWindowHours <= 0) {
    return false;
  }

  const pacingWindowMs = input.pacingWindowHours * 60 * 60 * 1000;
  return db.worldReleaseQueue.some((entry) => {
    if (entry.studioHandle !== input.studioHandle || entry.worldId !== input.worldId) {
      return false;
    }

    if (entry.status === "canceled") {
      return false;
    }

    const existingMs = parseIsoTime(entry.scheduledFor);
    return Math.abs(existingMs - input.scheduledForMs) < pacingWindowMs;
  });
}

function createWorkshopWorldReleaseInDatabase(
  db: BffDatabase,
  accountId: string,
  input: CreateWorkshopWorldReleaseInput
): {
  persist: boolean;
  result: WorldReleaseQueueItem | null;
} {
  const account = findAccountById(db, accountId);
  if (!account || !account.roles.includes("creator")) {
    return {
      persist: false,
      result: null
    };
  }

  const world = findWorldById(db, input.worldId);
  const drop = findDropById(db, input.dropId);
  if (!world || !drop) {
    return {
      persist: false,
      result: null
    };
  }

  if (world.studioHandle !== account.handle || drop.studioHandle !== account.handle) {
    return {
      persist: false,
      result: null
    };
  }

  if (drop.worldId !== world.id) {
    return {
      persist: false,
      result: null
    };
  }

  const scheduledForMs = parseIsoTimestamp(input.scheduledFor);
  if (scheduledForMs === null) {
    return {
      persist: false,
      result: null
    };
  }

  const nowMs = Date.now();
  if (scheduledForMs < nowMs) {
    return {
      persist: false,
      result: null
    };
  }

  const pacingWindowHours = resolveWorldReleasePacingWindowHours(input.pacingMode);
  if (
    hasWorldReleasePacingConflict(db, {
      studioHandle: account.handle,
      worldId: world.id,
      scheduledForMs,
      pacingWindowHours
    })
  ) {
    return {
      persist: false,
      result: null
    };
  }

  const nowIso = new Date().toISOString();
  const record: WorldReleaseQueueRecord = {
    id: `wrel_${randomUUID()}`,
    studioHandle: account.handle,
    worldId: world.id,
    dropId: drop.id,
    scheduledFor: new Date(scheduledForMs).toISOString(),
    pacingMode: input.pacingMode,
    pacingWindowHours,
    status: "scheduled",
    createdByAccountId: account.id,
    createdAt: nowIso,
    updatedAt: nowIso,
    publishedAt: null,
    canceledAt: null
  };

  db.worldReleaseQueue.push(record);
  trimWorldReleaseQueue(db);

  const followers = db.studioFollows.filter(
    (f) => f.studioHandle.toLowerCase() === account.handle.toLowerCase()
  );
  for (const follower of followers) {
    emitNotification(
      db,
      follower.accountId,
      "world_update",
      `${world.title} — new release scheduled`,
      `${drop.title} is scheduled for release in ${world.title}.`,
      `/worlds/${world.id}`
    );
  }

  return {
    persist: true,
    result: toWorldReleaseQueueItem(record)
  };
}

function updateWorkshopWorldReleaseStatusInDatabase(
  db: BffDatabase,
  accountId: string,
  releaseId: string,
  status: Exclude<WorldReleaseQueueStatus, "scheduled">
): {
  persist: boolean;
  result: WorldReleaseQueueItem | null;
} {
  const account = findAccountById(db, accountId);
  if (!account || !account.roles.includes("creator")) {
    return {
      persist: false,
      result: null
    };
  }

  const record = db.worldReleaseQueue.find((entry) => entry.id === releaseId);
  if (!record || record.studioHandle !== account.handle || record.status !== "scheduled") {
    return {
      persist: false,
      result: null
    };
  }

  const nowIso = new Date().toISOString();
  record.status = status;
  record.updatedAt = nowIso;

  if (status === "published") {
    record.publishedAt = nowIso;
    record.canceledAt = null;
  } else {
    record.canceledAt = nowIso;
    record.publishedAt = null;
  }

  return {
    persist: true,
    result: toWorldReleaseQueueItem(record)
  };
}

function rankAuctionCandidates(offers: CollectOfferRecord[]): CollectOfferRecord[] {
  return [...offers].sort((a, b) => {
    if (b.amountUsd !== a.amountUsd) {
      return b.amountUsd - a.amountUsd;
    }

    const createdDelta = parseIsoTime(a.createdAt) - parseIsoTime(b.createdAt);
    if (createdDelta !== 0) {
      return createdDelta;
    }

    return parseIsoTime(a.updatedAt) - parseIsoTime(b.updatedAt);
  });
}

function getDropAuctionOffers(db: BffDatabase, dropId: string): CollectOfferRecord[] {
  return db.collectOffers.filter(
    (offer) => offer.dropId === dropId && offer.listingType === "auction"
  );
}

function createSubmittedOfferRecord(input: {
  account: AccountRecord;
  drop: Drop;
  listingType: "auction" | "resale";
  amountUsd: number;
  executionVisibility: "public" | "private";
}): CollectOfferRecord {
  const createdAt = new Date().toISOString();
  const base: CollectOffer = {
    id: `offer_${randomUUID()}`,
    dropId: input.drop.id,
    listingType: input.listingType,
    amountUsd: input.amountUsd,
    state: "listed",
    actorHandle: input.account.handle,
    createdAt,
    updatedAt: createdAt,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    executionVisibility: input.executionVisibility,
    executionPriceUsd: null
  };
  const submitted = applyCollectOfferAction(base, "submit_offer", {
    amountUsd: base.amountUsd,
    updatedAt: createdAt
  });

  return {
    id: submitted.id,
    accountId: input.account.id,
    dropId: submitted.dropId,
    listingType: submitted.listingType,
    amountUsd: submitted.amountUsd,
    state: submitted.state,
    createdAt: submitted.createdAt,
    updatedAt: submitted.updatedAt,
    expiresAt: submitted.expiresAt,
    executionVisibility: input.executionVisibility,
    executionPriceUsd: null
  };
}

function emitNotification(
  db: BffDatabase,
  accountId: string,
  type: NotificationType,
  title: string,
  body: string,
  href: string | null
): void {
  const entry: NotificationEntryRecord = {
    id: `notif_${randomUUID()}`,
    accountId,
    type,
    title,
    body,
    href,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.notificationEntries.unshift(entry);
}

function purchaseDropInDatabase(
  db: BffDatabase,
  accountId: string,
  dropId: string,
  options?: {
    liveSessionId?: string | null;
  }
): {
  persist: boolean;
  result: PurchaseReceipt | null;
} {
  const account = findAccountById(db, accountId);
  const drop = findDropById(db, dropId);
  if (!account || !drop) {
    return {
      persist: false,
      result: null
    };
  }

  if (
    !canAccountCollectDropNow(db, account, drop, {
      liveSessionId: options?.liveSessionId ?? null
    })
  ) {
    return {
      persist: false,
      result: null
    };
  }

  const existing = findOwnershipByDrop(db, account.id, drop.id);
  if (existing) {
    const existingReceipt = db.receipts.find((entry) => entry.id === existing.receiptId) ?? null;
    return {
      persist: false,
      result: existingReceipt
        ? buildReceiptWithSettlement(db, existingReceipt)
        : {
            id: existing.receiptId,
            accountId: account.id,
            dropId: drop.id,
            amountUsd: 0,
            subtotalUsd: 0,
            processingUsd: 0,
            commissionUsd: 0,
            payoutUsd: 0,
            quoteEngineVersion: "quote_engine_v1",
            ledgerTransactionId: null,
            lineItems: [],
            status: "already_owned",
            purchasedAt: existing.acquiredAt
          }
    };
  }

  const quote = resolveCollectQuote(db, drop);
  const receipt = issueOwnershipAndReceipt(db, account, drop, {
    quote
  });

  db.payments.unshift({
    id: `pay_${randomUUID()}`,
    provider: "manual",
    status: "succeeded",
    accountId: account.id,
    dropId: drop.id,
    amountUsd: quote.totalUsd,
    quote,
    currency: "USD",
    receiptId: receipt.id,
    createdAt: receipt.purchasedAt,
    updatedAt: receipt.purchasedAt
  });

  emitNotification(
    db,
    account.id,
    "drop_collected",
    `you collected ${drop.title}`,
    `${drop.title} is now in your collection. watch, listen, or read whenever you like.`,
    `/my-collection?receipt=${receipt.id}`
  );

  emitNotification(
    db,
    account.id,
    "receipt_confirmed",
    `receipt confirmed for ${drop.title}`,
    `your purchase of ${drop.title} ($${quote.totalUsd.toFixed(2)}) has been confirmed. certificate issued.`,
    `/my-collection?receipt=${receipt.id}`
  );

  return {
    persist: true,
    result: receipt
  };
}

const gatewayMethods = {
  async listDrops(viewerAccountId?: string | null): Promise<Drop[]> {
    return withDatabase(async (db) => ({
      persist: false,
      result: listDiscoverableDrops(db, viewerAccountId).sort(
        (a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate)
      )
    }));
  },

  async listWorlds(): Promise<World[]> {
    return withDatabase(async (db) => ({
      persist: false,
      result: [...db.catalog.worlds]
    }));
  },

  async getWorldById(worldId: string): Promise<World | null> {
    return withDatabase(async (db) => ({
      persist: false,
      result: db.catalog.worlds.find((world) => world.id === worldId) ?? null
    }));
  },

  async listDropsByWorldId(worldId: string, viewerAccountId?: string | null): Promise<Drop[]> {
    return withDatabase(async (db) => ({
      persist: false,
      result: sortDropsForWorldSurface(
        listDiscoverableDrops(db, viewerAccountId).filter((drop) => drop.worldId === worldId)
      )
    }));
  },

  async getStudioByHandle(handle: string): Promise<Studio | null> {
    return withDatabase(async (db) => ({
      persist: false,
      result: db.catalog.studios.find((studio) => studio.handle === handle) ?? null
    }));
  },

  async listDropsByStudioHandle(handle: string, viewerAccountId?: string | null): Promise<Drop[]> {
    return withDatabase(async (db) => ({
      persist: false,
      result: sortDropsForStudioSurface(
        listDiscoverableDrops(db, viewerAccountId).filter((drop) => drop.studioHandle === handle)
      )
    }));
  },

  async getDropById(dropId: string, viewerAccountId?: string | null): Promise<Drop | null> {
    return withDatabase(async (db) => {
      const drop = findDropById(db, dropId);
      if (!drop) {
        return {
          persist: false,
          result: null
        };
      }

      if (viewerAccountId === undefined) {
        return {
          persist: false,
          result: drop
        };
      }

      const account = viewerAccountId ? findAccountById(db, viewerAccountId) : null;
      return {
        persist: false,
        result: canAccountDiscoverDrop(db, account, drop) ? drop : null
      };
    });
  },

  async getDropLineage(dropId: string): Promise<DropLineageSnapshot | null> {
    return commerceBffService.getDropLineage(dropId);
  },

  async getDropLiveArtifacts(dropId: string): Promise<DropLiveArtifactsSnapshot | null> {
    return commerceBffService.getDropLiveArtifacts(dropId);
  },

  async createDropVersion(
    accountId: string,
    dropId: string,
    input: CreateDropVersionInput
  ): Promise<DropVersion | null> {
    return commerceBffService.createDropVersion(accountId, dropId, input);
  },

  async createAuthorizedDerivative(
    accountId: string,
    sourceDropId: string,
    input: CreateAuthorizedDerivativeInput
  ): Promise<AuthorizedDerivative | null> {
    return commerceBffService.createAuthorizedDerivative(accountId, sourceDropId, input);
  },

  async updateDropPreviewMedia(
    accountId: string,
    dropId: string,
    input: UpdateDropPreviewMediaInput
  ): Promise<DropPreviewMap | null> {
    return commerceBffService.updateDropPreviewMedia(accountId, dropId, input);
  },

  /* ── creator onboarding ── */

  async setupCreatorStudio(
    accountId: string,
    input: SetupCreatorStudioInput
  ): Promise<SetupCreatorStudioResult | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) return { persist: false, result: null };

      // Already a creator
      if (account.roles.includes("creator")) return { persist: false, result: null };

      const title = input.studioTitle.trim();
      const synopsis = input.studioSynopsis.trim();
      if (!title || title.length > 80) return { persist: false, result: null };
      if (synopsis.length > 500) return { persist: false, result: null };

      // Derive handle from account handle (studio handle = account handle)
      const studioHandle = account.handle;

      // Check if studio already exists
      const existing = db.catalog.studios.find((s) => s.handle === studioHandle);
      if (existing) return { persist: false, result: null };

      // Upgrade account to creator
      account.roles = [...account.roles, "creator"];

      // Create studio
      const studio: Studio = {
        handle: studioHandle,
        title,
        synopsis,
        worldIds: []
      };
      db.catalog.studios.push(studio);

      // Build updated session
      const session: Session = {
        accountId: account.id,
        email: account.email,
        handle: account.handle,
        displayName: account.displayName,
        roles: [...account.roles],
        sessionToken: "",
        avatarUrl: account.avatarUrl,
        bio: account.bio
      };

      return { persist: true, result: { studio, session } };
    });
  },

  async createDrop(
    accountId: string,
    input: CreateDropInput
  ): Promise<Drop | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account || !account.roles.includes("creator")) {
        return { persist: false, result: null };
      }

      const studio = db.catalog.studios.find((s) => s.handle === account.handle);
      if (!studio) return { persist: false, result: null };

      const world = findWorldById(db, input.worldId);
      if (!world || world.studioHandle !== account.handle) {
        return { persist: false, result: null };
      }

      const title = input.title.trim();
      const synopsis = input.synopsis.trim();
      if (!title || title.length > 200) return { persist: false, result: null };
      if (!synopsis || synopsis.length > 2000) return { persist: false, result: null };
      if (input.priceUsd < 0 || input.priceUsd > 99999) return { persist: false, result: null };

      // Generate slug-style ID
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const id = slug || `drop-${randomUUID().slice(0, 8)}`;

      // Avoid duplicate IDs
      if (findDropById(db, id)) {
        return { persist: false, result: null };
      }

      const drop: Drop = {
        id,
        title,
        seasonLabel: input.seasonLabel?.trim() || "season one",
        episodeLabel: input.episodeLabel?.trim() || "",
        studioHandle: account.handle,
        worldId: world.id,
        worldLabel: world.title,
        synopsis,
        releaseDate: new Date().toISOString().slice(0, 10),
        priceUsd: input.priceUsd,
        visibility: input.visibility ?? "public",
        previewPolicy: input.previewPolicy ?? "full"
      };

      db.catalog.drops.push(drop);

      return { persist: true, result: drop };
    });
  },

  async createWorld(
    accountId: string,
    input: CreateWorldInput
  ): Promise<World | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account || !account.roles.includes("creator")) {
        return { persist: false, result: null };
      }

      const studio = db.catalog.studios.find((s) => s.handle === account.handle);
      if (!studio) return { persist: false, result: null };

      const title = input.title.trim();
      const synopsis = input.synopsis.trim();
      if (!title || title.length > 200) return { persist: false, result: null };
      if (!synopsis || synopsis.length > 2000) return { persist: false, result: null };

      // Generate slug-style ID
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const id = slug || `world-${randomUUID().slice(0, 8)}`;

      // Avoid duplicate IDs
      if (findWorldById(db, id)) return { persist: false, result: null };

      const world: World = {
        id,
        title,
        synopsis,
        studioHandle: account.handle,
        visualIdentity: input.visualIdentity,
        entryRule: input.entryRule ?? "open",
        lore: input.lore,
        releaseStructure: input.releaseStructure,
        defaultDropVisibility: input.defaultDropVisibility ?? "public"
      };

      db.catalog.worlds.push(world);
      studio.worldIds.push(id);

      return { persist: true, result: world };
    });
  },

  async getCheckoutPreview(accountId: string, dropId: string): Promise<CheckoutPreview | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      if (!canAccountCollectDropNow(db, account, drop)) {
        return {
          persist: false,
          result: null
        };
      }

      const existing = findOwnershipByDrop(db, account.id, drop.id);
      const quote = existing
        ? buildCollectSettlementQuote({ subtotalUsd: 0, processingUsd: 0 })
        : resolveCollectQuote(db, drop);

      return {
        persist: false,
        result: {
          drop,
          subtotalUsd: quote.subtotalUsd,
          processingUsd: quote.processingUsd,
          totalUsd: quote.totalUsd,
          currency: "USD",
          quote
        }
      };
    });
  },

  async createCheckoutSession(
    accountId: string,
    dropId: string,
    options?: {
      successUrl?: string;
      cancelUrl?: string;
    }
  ): Promise<CheckoutSessionResult | null> {
    return createCheckoutSessionForPayment({
      accountId,
      dropId,
      successUrl: options?.successUrl,
      cancelUrl: options?.cancelUrl
    });
  },

  async completePendingPayment(paymentId: string): Promise<PurchaseReceipt | null> {
    return completePendingPaymentById(paymentId, {
      allowedProviders: ["manual"]
    });
  },

  async purchaseDrop(accountId: string, dropId: string): Promise<PurchaseReceipt | null> {
    return withDatabase(async (db) =>
      purchaseDropInDatabase(db, accountId, dropId, {
        liveSessionId: null
      })
    );
  },

  async getMyCollection(accountId: string): Promise<MyCollectionSnapshot | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: null
        };
      }

      const totalSpentUsd = db.receipts
        .filter((receipt) => receipt.accountId === accountId && receipt.status === "completed")
        .reduce((sum, receipt) => sum + receipt.amountUsd, 0);

      return {
        persist: false,
        result: {
          account: {
            accountId: account.id,
            handle: account.handle,
            displayName: account.displayName
          },
          ownedDrops: getOwnedDrops(db, account.id),
          totalSpentUsd: Number(totalSpentUsd.toFixed(2))
        }
      };
    });
  },

  async getMyCollectionAnalyticsPanel(accountId: string): Promise<MyCollectionAnalyticsPanel | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: null
        };
      }

      return {
        persist: false,
        result: toMyCollectionAnalyticsPanel(db, account)
      };
    });
  },

  async getLibrary(
    accountId: string,
    options?: {
      queueLimit?: number;
    }
  ): Promise<LibrarySnapshot | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: null
        };
      }

      const savedDrops = getSavedDrops(db, account.id);
      const queueLimit = normalizeLibraryQueueLimit(options?.queueLimit);
      const evaluatedAt = new Date().toISOString();
      const savedDropIds = new Set(savedDrops.map((entry) => entry.drop.id));

      const beforePruneCount = db.libraryEligibilityStates.length;
      db.libraryEligibilityStates = db.libraryEligibilityStates.filter(
        (entry) => entry.accountId !== account.id || savedDropIds.has(entry.dropId)
      );
      let persist = beforePruneCount !== db.libraryEligibilityStates.length;

      const savedDropsWithEligibility: LibrarySavedDrop[] = [];
      const readQueueCandidates: Array<Omit<LibraryQueueItem, "queuePosition">> = [];
      const listenQueueCandidates: Array<Omit<LibraryQueueItem, "queuePosition">> = [];

      for (const entry of savedDrops) {
        const existingEligibility = db.libraryEligibilityStates.find(
          (record) => record.accountId === account.id && record.dropId === entry.drop.id
        );
        const previousState = existingEligibility?.state ?? null;
        const eligibility = evaluateLibraryEligibilitySnapshot(
          db,
          account,
          entry.drop,
          previousState,
          evaluatedAt
        );

        if (!existingEligibility) {
          db.libraryEligibilityStates.push({
            accountId: account.id,
            dropId: entry.drop.id,
            state: eligibility.state,
            updatedAt: evaluatedAt
          } satisfies LibraryEligibilityStateRecord);
          persist = true;
        } else if (existingEligibility.state !== eligibility.state) {
          existingEligibility.state = eligibility.state;
          existingEligibility.updatedAt = evaluatedAt;
          persist = true;
        }

        savedDropsWithEligibility.push({
          ...entry,
          eligibility
        });

        readQueueCandidates.push({
          drop: entry.drop,
          savedAt: entry.savedAt,
          eligibility,
          resume: summarizeLibraryModeResume(db, account.id, entry.drop.id, "read")
        });

        listenQueueCandidates.push({
          drop: entry.drop,
          savedAt: entry.savedAt,
          eligibility,
          resume: summarizeLibraryModeResume(db, account.id, entry.drop.id, "listen")
        });
      }

      return {
        persist,
        result: {
          account: {
            accountId: account.id,
            handle: account.handle,
            displayName: account.displayName
          },
          savedDrops: savedDropsWithEligibility,
          readQueue: rankLibraryQueue(readQueueCandidates, queueLimit),
          listenQueue: rankLibraryQueue(listenQueueCandidates, queueLimit)
        }
      };
    });
  },

  async getWorkshopAnalyticsPanel(accountId: string): Promise<WorkshopAnalyticsPanel | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account || !account.roles.includes("creator")) {
        return {
          persist: false,
          result: null
        };
      }

      return {
        persist: false,
        result: toWorkshopAnalyticsPanel(db, account)
      };
    });
  },

  async getOpsAnalyticsPanel(accountId: string): Promise<OpsAnalyticsPanel | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account || !account.roles.includes("creator")) {
        return {
          persist: false,
          result: null
        };
      }

      return {
        persist: false,
        result: toOpsAnalyticsPanel(db)
      };
    });
  },

  async getViewerFollowedStudioHandles(accountId: string): Promise<string[]> {
    return withDatabase<string[]>(async (db) => {
      const handles = db.studioFollows
        .filter((f) => f.accountId === accountId)
        .map((f) => f.studioHandle);
      return { persist: false, result: handles };
    });
  },

  async getReceipt(accountId: string, receiptId: string): Promise<PurchaseReceipt | null> {
    return withDatabase(async (db) => {
      const receipt = db.receipts.find(
        (entry) => entry.accountId === accountId && entry.id === receiptId
      );
      return {
        persist: false,
        result: receipt ? buildReceiptWithSettlement(db, receipt) : null
      };
    });
  },

  async hasDropEntitlement(accountId: string, dropId: string): Promise<boolean> {
    return withDatabase(async (db) => ({
      persist: false,
      result: Boolean(findOwnershipByDrop(db, accountId, dropId))
    }));
  },

  async listMembershipEntitlements(accountId: string): Promise<MembershipEntitlement[]> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: []
        };
      }

      const entitlements = db.membershipEntitlements
        .filter((entitlement) => entitlement.accountId === account.id)
        .map((entitlement) => toMembershipEntitlement(db, entitlement))
        .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

      return {
        persist: false,
        result: entitlements
      };
    });
  },

  async listCollectLiveSessions(accountId: string): Promise<CollectLiveSessionSnapshot[]> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: []
        };
      }

      const liveSessions = db.liveSessions
        .map((sessionRecord) => {
          const liveSession = toLiveSession(db, sessionRecord);
          const eligibility = resolveLiveSessionEligibilityInDatabase(
            db,
            account.id,
            sessionRecord
          );
          return {
            liveSession,
            eligibility
          } satisfies CollectLiveSessionSnapshot;
        })
        .sort((a, b) => Date.parse(a.liveSession.startsAt) - Date.parse(b.liveSession.startsAt));

      return {
        persist: false,
        result: liveSessions
      };
    });
  },

  async getCollectLiveSessionEligibility(
    accountId: string,
    liveSessionId: string
  ): Promise<LiveSessionEligibility | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      const liveSession = db.liveSessions.find((entry) => entry.id === liveSessionId);
      if (!account || !liveSession) {
        return {
          persist: false,
          result: null
        };
      }

      return {
        persist: false,
        result: resolveLiveSessionEligibilityInDatabase(db, account.id, liveSession)
      };
    });
  },

  async listWorkshopLiveSessions(accountId: string): Promise<LiveSession[]> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account || !account.roles.includes("creator")) {
        return {
          persist: false,
          result: []
        };
      }

      return {
        persist: false,
        result: listWorkshopLiveSessionsInDatabase(db, account)
      };
    });
  },

  async listWorkshopLiveSessionArtifacts(accountId: string): Promise<LiveSessionArtifact[]> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account || !account.roles.includes("creator")) {
        return {
          persist: false,
          result: []
        };
      }

      return {
        persist: false,
        result: listWorkshopLiveSessionArtifactsInDatabase(db, account)
      };
    });
  },

  async captureWorkshopLiveSessionArtifact(
    accountId: string,
    input: CaptureWorkshopLiveSessionArtifactInput
  ): Promise<LiveSessionArtifact | null> {
    return withDatabase(async (db) =>
      captureWorkshopLiveSessionArtifactInDatabase(db, accountId, input)
    );
  },

  async approveWorkshopLiveSessionArtifact(
    accountId: string,
    artifactId: string
  ): Promise<LiveSessionArtifact | null> {
    return withDatabase(async (db) =>
      approveWorkshopLiveSessionArtifactInDatabase(db, accountId, artifactId)
    );
  },

  async getWorkshopProProfile(accountId: string): Promise<WorkshopProProfile | null> {
    return withDatabase(async (db) => getWorkshopProProfileInDatabase(db, accountId));
  },

  async transitionWorkshopProState(
    accountId: string,
    state: WorkshopProState
  ): Promise<WorkshopProProfile | null> {
    return withDatabase(async (db) => transitionWorkshopProStateInDatabase(db, accountId, state));
  },

  async listWorkshopPatronTierConfigs(accountId: string): Promise<PatronTierConfig[]> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account || !account.roles.includes("creator")) {
        return {
          persist: false,
          result: []
        };
      }

      const configs = db.patronTierConfigs
        .filter((entry) => entry.studioHandle === account.handle)
        .slice()
        .sort((a, b) => {
          if (a.worldId === null && b.worldId !== null) return -1;
          if (a.worldId !== null && b.worldId === null) return 1;
          if (a.worldId !== null && b.worldId !== null) {
            const worldDelta = a.worldId.localeCompare(b.worldId);
            if (worldDelta !== 0) {
              return worldDelta;
            }
          }
          return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
        })
        .map((entry) => toPatronTierConfig(entry));

      return {
        persist: false,
        result: configs
      };
    });
  },

  async upsertWorkshopPatronTierConfig(
    accountId: string,
    input: UpsertWorkshopPatronTierConfigInput
  ): Promise<PatronTierConfig | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account || !account.roles.includes("creator")) {
        return {
          persist: false,
          result: null
        };
      }

      const worldId = input.worldId?.trim() || null;
      if (worldId) {
        const world = findWorldById(db, worldId);
        if (!world || world.studioHandle !== account.handle) {
          return {
            persist: false,
            result: null
          };
        }
      }

      const amountCents = Math.floor(input.amountCents);
      const submittedPeriodDays = Math.floor(input.periodDays);
      const commitmentCadence = input.commitmentCadence;
      const periodDays = isPatronCommitmentCadence(commitmentCadence)
        ? resolvePatronCommitmentPeriodDaysForCadence(commitmentCadence)
        : null;
      const earlyAccessWindowHours = normalizePatronEarlyAccessWindowHours(
        input.earlyAccessWindowHours
      );
      const title = input.title.trim() || DEFAULT_PATRON_TIER_TITLE;
      const benefitsSummary = input.benefitsSummary.trim();
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        return {
          persist: false,
          result: null
        };
      }
      if (!Number.isFinite(submittedPeriodDays) || submittedPeriodDays <= 0) {
        return {
          persist: false,
          result: null
        };
      }
      if (periodDays === null || submittedPeriodDays !== periodDays) {
        return {
          persist: false,
          result: null
        };
      }
      if (earlyAccessWindowHours === null) {
        return {
          persist: false,
          result: null
        };
      }
      if (!isPatronTierStatus(input.status)) {
        return {
          persist: false,
          result: null
        };
      }

      const nowIso = new Date().toISOString();
      const existing =
        db.patronTierConfigs.find(
          (entry) => entry.studioHandle === account.handle && entry.worldId === worldId
        ) ?? null;
      const config: PatronTierConfigRecord = existing ?? {
        id: `ptier_${randomUUID()}`,
        studioHandle: account.handle,
        worldId,
        title,
        amountCents,
        commitmentCadence,
        periodDays,
        earlyAccessWindowHours,
        benefitsSummary,
        status: input.status,
        updatedAt: nowIso,
        updatedByHandle: account.handle
      };

      config.title = title;
      config.amountCents = amountCents;
      config.commitmentCadence = commitmentCadence;
      config.periodDays = periodDays;
      config.earlyAccessWindowHours = earlyAccessWindowHours;
      config.benefitsSummary = benefitsSummary;
      config.status = input.status;
      config.updatedAt = nowIso;
      config.updatedByHandle = account.handle;

      if (!existing) {
        db.patronTierConfigs.unshift(config);
      }

      trimPatronTierConfigs(db);

      return {
        persist: true,
        result: toPatronTierConfig(config)
      };
    });
  },

  async createWorkshopLiveSession(
    accountId: string,
    input: CreateWorkshopLiveSessionInput
  ): Promise<LiveSession | null> {
    return withDatabase(async (db) => createWorkshopLiveSessionInDatabase(db, accountId, input));
  },

  async listWorkshopWorldReleaseQueue(
    accountId: string,
    worldId?: string | null
  ): Promise<WorldReleaseQueueItem[]> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account || !account.roles.includes("creator")) {
        return {
          persist: false,
          result: []
        };
      }

      if (worldId) {
        const world = findWorldById(db, worldId);
        if (!world || world.studioHandle !== account.handle) {
          return {
            persist: false,
            result: []
          };
        }
      }

      return {
        persist: false,
        result: listWorkshopWorldReleaseQueueInDatabase(db, account, worldId)
      };
    });
  },

  async createWorkshopWorldRelease(
    accountId: string,
    input: CreateWorkshopWorldReleaseInput
  ): Promise<WorldReleaseQueueItem | null> {
    return withDatabase(async (db) => createWorkshopWorldReleaseInDatabase(db, accountId, input));
  },

  async updateWorkshopWorldReleaseStatus(
    accountId: string,
    releaseId: string,
    status: Exclude<WorldReleaseQueueStatus, "scheduled">
  ): Promise<WorldReleaseQueueItem | null> {
    return withDatabase(async (db) =>
      updateWorkshopWorldReleaseStatusInDatabase(db, accountId, releaseId, status)
    );
  },

  async appealTownhallComment(
    accountId: string,
    dropId: string,
    commentId: string
  ): Promise<TownhallDropSocialSnapshot | null> {
    return withDatabase<TownhallDropSocialSnapshot | null>(
      async (db): Promise<TownhallSocialMutationResult> => {
        const account = findAccountById(db, accountId);
        const drop = findDropById(db, dropId);
        const comment = findTownhallCommentById(db, dropId, commentId);
        if (!account || !drop || !comment) {
          return {
            persist: false,
            result: null
          };
        }

        if (!canAccountAppealTownhallComment(account, comment)) {
          return {
            persist: false,
            result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
          };
        }

        comment.appealRequestedAt = new Date().toISOString();
        comment.appealRequestedByAccountId = account.id;

        return {
          persist: true,
          result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
        };
      }
    );
  },

  async listTownhallModerationQueue(accountId: string): Promise<TownhallModerationQueueItem[]> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: []
        };
      }

      return {
        persist: false,
        result: buildTownhallModerationQueue(db, account)
      };
    });
  },

  async resolveTownhallModerationCase(
    accountId: string,
    dropId: string,
    commentId: string,
    resolution: TownhallModerationCaseResolution
  ): Promise<TownhallModerationCaseResolveResult> {
    return withDatabase<TownhallModerationCaseResolveResult>(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      const comment = findTownhallCommentById(db, dropId, commentId);
      if (!account || !drop || !comment || !isTownhallModerationCaseResolution(resolution)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      if (!canAccountResolveTownhallModerationCase(account, drop)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "forbidden"
          }
        };
      }

      applyTownhallModerationCaseResolution(comment, account.id, resolution);

      return {
        persist: true,
        result: {
          ok: true,
          queue: buildTownhallModerationQueue(db, account)
        }
      };
    });
  },

  async getCertificateById(certificateId: string): Promise<Certificate | null> {
    return withDatabase(async (db) => {
      const certificate = db.certificates.find((entry) => entry.id === certificateId);
      return {
        persist: false,
        result: certificate ? toPublicCertificate(certificate) : null
      };
    });
  },

  async getCertificateByReceipt(accountId: string, receiptId: string): Promise<Certificate | null> {
    return withDatabase(async (db) => {
      const certificate = db.certificates.find(
        (entry) => entry.ownerAccountId === accountId && entry.receiptId === receiptId
      );

      return {
        persist: false,
        result: certificate ? toPublicCertificate(certificate) : null
      };
    });
  },

  async getSessionByToken(sessionToken: string): Promise<Session | null> {
    return withDatabase(async (db) => {
      const now = Date.now();
      const index = db.sessions.findIndex((session) => session.token === sessionToken);
      if (index < 0) {
        return {
          persist: false,
          result: null
        };
      }

      const session = db.sessions[index];
      if (Date.parse(session.expiresAt) <= now) {
        db.sessions.splice(index, 1);
        return {
          persist: true,
          result: null
        };
      }

      const account = findAccountById(db, session.accountId);
      if (!account) {
        db.sessions.splice(index, 1);
        return {
          persist: true,
          result: null
        };
      }

      return {
        persist: false,
        result: toSession(account, session.token)
      };
    });
  },

  async createSession(input: CreateSessionInput): Promise<Session> {
    return withDatabase(async (db) => {
      const email = normalizeEmail(input.email);
      const candidateHandle = toHandle(email);
      let account =
        // 1. Exact match: same email + single matching role
        db.accounts.find(
          (entry) => entry.email === email && entry.roles.length === 1 && entry.roles[0] === input.role
        ) ??
        // 2. Email match: same email, any role set
        db.accounts.find((entry) => entry.email === email) ??
        // 3. Handle match: existing account with matching handle (avoids duplicates)
        db.accounts.find((entry) => entry.handle === candidateHandle) ??
        null;

      if (!account) {
        account = createAccountFromEmail(email, input.role);
        db.accounts.push(account);
      }

      // Ensure the requested role is present
      if (!account.roles.includes(input.role)) {
        account.roles = [...account.roles, input.role];
      }

      const createdAt = new Date().toISOString();
      const sessionToken = `sess_${randomUUID()}`;
      db.sessions.push({
        token: sessionToken,
        accountId: account.id,
        createdAt,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
      });

      return {
        persist: true,
        result: toSession(account, sessionToken)
      };
    });
  },

  async clearSession(sessionToken: string): Promise<void> {
    await withDatabase(async (db) => {
      const originalLength = db.sessions.length;
      db.sessions = db.sessions.filter((entry) => entry.token !== sessionToken);
      return {
        persist: db.sessions.length !== originalLength,
        result: undefined
      };
    });
  },

  /**
   * Bridge: resolve a Supabase Auth user to a BFF Session.
   * Finds or creates a bff_accounts record matching the Supabase user's email,
   * then returns a Session with a synthetic token (not stored in bff_sessions)
   * since Supabase manages the real session lifecycle.
   */
  async resolveSupabaseSession(supabaseUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  }): Promise<Session | null> {
    const email = supabaseUser.email?.trim().toLowerCase();
    if (!email) {
      return null;
    }

    return withDatabase(async (db) => {
      let account = db.accounts.find((a) => a.email === email) ?? null;

      if (!account) {
        const role =
          (supabaseUser.user_metadata?.role as AccountRole | undefined) === "creator"
            ? "creator"
            : "collector";
        account = createAccountFromEmail(email, role);
        db.accounts.push(account);
      }

      return {
        persist: !db.accounts.some((a) => a.email === email && a.id !== account!.id),
        result: toSession(account, `supa_${supabaseUser.id}`)
      };
    });
  },

  async updateAccountProfile(
    accountId: string,
    updates: { displayName?: string; avatarUrl?: string; bio?: string }
  ): Promise<Session | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return { persist: false, result: null };
      }

      let changed = false;
      if (updates.displayName !== undefined && updates.displayName !== account.displayName) {
        account.displayName = updates.displayName;
        changed = true;
      }
      if (updates.avatarUrl !== undefined && updates.avatarUrl !== account.avatarUrl) {
        account.avatarUrl = updates.avatarUrl;
        changed = true;
      }
      if (updates.bio !== undefined && updates.bio !== account.bio) {
        account.bio = updates.bio;
        changed = true;
      }

      const session = db.sessions.find((s) => s.accountId === accountId);
      return {
        persist: changed,
        result: toSession(account, session?.token ?? `profile_${accountId}`)
      };
    });
  }
};

async function createCheckoutSessionForPayment(
  input: CreateCheckoutSessionInput
): Promise<CheckoutSessionResult | null> {
  return withDatabase<CheckoutSessionResult | null>(async (db) => {
    const account = findAccountById(db, input.accountId);
    const drop = findDropById(db, input.dropId);
    if (!account || !drop) {
      return {
        persist: false,
        result: null
      };
    }

    if (!canAccountCollectDropNow(db, account, drop)) {
      return {
        persist: false,
        result: null
      };
    }

    const existing = findOwnershipByDrop(db, account.id, drop.id);
    if (existing) {
      return {
        persist: false,
        result: {
          status: "already_owned",
          receiptId: existing.receiptId
        }
      };
    }

    const quote = resolveCollectQuote(db, drop);
    const amountUsd = quote.totalUsd;
    const paymentId = `pay_${randomUUID()}`;
    const createdAt = new Date().toISOString();
    const successUrl = input.successUrl ?? "/my-collection?payment=success";
    const cancelUrl = input.cancelUrl ?? `/collect/${encodeURIComponent(drop.id)}?payment=cancel`;
    const checkout = await createCheckoutSession({
      paymentId,
      accountId: account.id,
      drop,
      amountUsd,
      successUrl,
      cancelUrl
    });

    db.payments.unshift({
      id: paymentId,
      provider: checkout.provider,
      status: "pending",
      accountId: account.id,
      dropId: drop.id,
      amountUsd,
      quote,
      currency: "USD",
      checkoutSessionId: checkout.sessionId,
      checkoutUrl: checkout.url,
      createdAt,
      updatedAt: createdAt
    });

    return {
      persist: true,
      result: {
        status: "pending",
        paymentId,
        provider: checkout.provider,
        checkoutSessionId: checkout.sessionId,
        checkoutUrl: checkout.url,
        drop,
        amountUsd,
        currency: "USD",
        quote
      }
    };
  });
}

async function completePendingPaymentById(
  paymentId: string,
  options?: CompletePendingPaymentOptions
): Promise<PurchaseReceipt | null> {
  return withDatabase(async (db) => {
    const payment = db.payments.find((entry) => entry.id === paymentId);
    if (!payment) {
      return {
        persist: false,
        result: null
      };
    }

    if (options?.expectedAccountId && payment.accountId !== options.expectedAccountId) {
      return {
        persist: false,
        result: null
      };
    }

    if (options?.allowedProviders && !options.allowedProviders.includes(payment.provider)) {
      return {
        persist: false,
        result: null
      };
    }

    if (payment.status === "succeeded" && payment.receiptId) {
      const receipt = db.receipts.find((entry) => entry.id === payment.receiptId) ?? null;
      return {
        persist: false,
        result: receipt ? buildReceiptWithSettlement(db, receipt) : null
      };
    }

    if (payment.status !== "pending") {
      return {
        persist: false,
        result: null
      };
    }

    const account = findAccountById(db, payment.accountId);
    const drop = findDropById(db, payment.dropId);
    if (!account || !drop) {
      payment.status = "failed";
      payment.updatedAt = new Date().toISOString();
      return {
        persist: true,
        result: null
      };
    }

    if (!canAccountCollectDropNow(db, account, drop)) {
      return {
        persist: false,
        result: null
      };
    }

    const existing = findOwnershipByDrop(db, payment.accountId, payment.dropId);
    if (existing) {
      payment.status = "succeeded";
      payment.receiptId = existing.receiptId;
      payment.updatedAt = new Date().toISOString();
      const receipt = db.receipts.find((entry) => entry.id === existing.receiptId) ?? null;
      return {
        persist: true,
        result: receipt ? buildReceiptWithSettlement(db, receipt) : null
      };
    }

    const quote = payment.quote ?? resolveCollectQuote(db, drop);
    const receipt = issueOwnershipAndReceipt(db, account, drop, {
      quote,
      paymentId: payment.id
    });
    payment.status = "succeeded";
    payment.receiptId = receipt.id;
    payment.amountUsd = quote.totalUsd;
    payment.quote = quote;
    payment.updatedAt = new Date().toISOString();

    return {
      persist: true,
      result: receipt
    };
  });
}

type CreatorRefundPaymentInput = {
  paymentId?: string;
  receiptId?: string;
};

type CreatorRefundPaymentResult =
  | {
      ok: true;
      paymentId: string;
      receiptId: string | null;
      dropId: string;
      status: "refunded";
      alreadyRefunded: boolean;
      ownershipRevoked: boolean;
    }
  | {
      ok: false;
      reason: "invalid_input" | "forbidden" | "not_found" | "not_refundable";
    };

type StripePaymentLookupInput = {
  paymentId?: string;
  checkoutSessionId?: string;
  providerPaymentIntentId?: string;
};

function completePaymentByLookupInDatabase(
  db: BffDatabase,
  input: StripePaymentLookupInput
): StripeWebhookMutationResult {
  const payment = findPaymentForWebhook(db, input);
  if (!payment) {
    return {
      persist: false,
      result: {
        received: true,
        effect: "payment_not_found"
      }
    };
  }

  payment.updatedAt = new Date().toISOString();
  if (input.providerPaymentIntentId) {
    payment.providerPaymentIntentId = input.providerPaymentIntentId;
  }
  if (payment.status === "succeeded") {
    return {
      persist: true,
      result: {
        received: true,
        effect: "payment_completed",
        paymentId: payment.id
      }
    };
  }

  const account = findAccountById(db, payment.accountId);
  const drop = findDropById(db, payment.dropId);
  if (!account || !drop) {
    payment.status = "failed";
    return {
      persist: true,
      result: {
        received: true,
        effect: "payment_failed",
        paymentId: payment.id
      }
    };
  }

  if (!canAccountCollectDropNow(db, account, drop)) {
    payment.status = "failed";
    return {
      persist: true,
      result: {
        received: true,
        effect: "payment_failed",
        paymentId: payment.id
      }
    };
  }

  const existing = findOwnershipByDrop(db, payment.accountId, payment.dropId);
  if (existing) {
    payment.status = "succeeded";
    payment.receiptId = existing.receiptId;
    return {
      persist: true,
      result: {
        received: true,
        effect: "payment_completed",
        paymentId: payment.id
      }
    };
  }

  const quote = payment.quote ?? resolveCollectQuote(db, drop);
  const receipt = issueOwnershipAndReceipt(db, account, drop, {
    quote,
    paymentId: payment.id
  });
  payment.status = "succeeded";
  payment.receiptId = receipt.id;
  payment.amountUsd = quote.totalUsd;
  payment.quote = quote;

  return {
    persist: true,
    result: {
      received: true,
      effect: "payment_completed",
      paymentId: payment.id
    }
  };
}

function failPaymentByLookupInDatabase(
  db: BffDatabase,
  input: Pick<StripePaymentLookupInput, "paymentId" | "checkoutSessionId">
): StripeWebhookMutationResult {
  const payment = findPaymentForWebhook(db, input);
  if (!payment) {
    return {
      persist: false,
      result: {
        received: true,
        effect: "payment_not_found"
      }
    };
  }

  payment.status = "failed";
  payment.updatedAt = new Date().toISOString();
  return {
    persist: true,
    result: {
      received: true,
      effect: "payment_failed",
      paymentId: payment.id
    }
  };
}

function refundPaymentByLookupInDatabase(
  db: BffDatabase,
  input: StripePaymentLookupInput
): StripeWebhookMutationResult {
  const payment = findPaymentForWebhook(db, input);
  if (!payment) {
    return {
      persist: false,
      result: {
        received: true,
        effect: "payment_not_found"
      }
    };
  }

  payment.status = "refunded";
  payment.updatedAt = new Date().toISOString();
  if (input.providerPaymentIntentId) {
    payment.providerPaymentIntentId = input.providerPaymentIntentId;
  }

  if (payment.receiptId) {
    markRefundByReceipt(db, payment.accountId, payment.receiptId);
  }

  return {
    persist: true,
    result: {
      received: true,
      effect: "payment_refunded",
      paymentId: payment.id
    }
  };
}

function applyParsedStripeWebhookInDatabase(
  db: BffDatabase,
  parsed: ParsedStripeWebhookEvent["event"]
): StripeWebhookMutationResult {
  if (parsed.kind === "checkout.completed") {
    return completePaymentByLookupInDatabase(db, {
      paymentId: parsed.paymentId,
      checkoutSessionId: parsed.checkoutSessionId,
      providerPaymentIntentId: parsed.providerPaymentIntentId
    });
  }

  if (parsed.kind === "checkout.failed") {
    return failPaymentByLookupInDatabase(db, {
      paymentId: parsed.paymentId,
      checkoutSessionId: parsed.checkoutSessionId
    });
  }

  return refundPaymentByLookupInDatabase(db, {
    paymentId: parsed.paymentId,
    checkoutSessionId: parsed.checkoutSessionId,
    providerPaymentIntentId: parsed.providerPaymentIntentId
  });
}

async function applyParsedStripeWebhook(
  parsed: ParsedStripeWebhookEvent["event"]
): Promise<StripeWebhookApplyResult> {
  return withDatabase<StripeWebhookApplyResult>(async (db) => {
    const applied = applyParsedStripeWebhookInDatabase(db, parsed);
    return {
      persist: applied.persist,
      result: applied.result
    };
  });
}

export const commerceBffService = {
  ...gatewayMethods,

  createCheckoutSession: createCheckoutSessionForPayment,

  async getLiveSessionById(liveSessionId: string): Promise<LiveSession | null> {
    return withDatabase(async (db) => {
      const record = db.liveSessions.find((entry) => entry.id === liveSessionId) ?? null;
      if (!record) {
        return { persist: false, result: null };
      }
      return { persist: false, result: toLiveSession(db, record) };
    });
  },

  async getStudioConversationThread(
    accountId: string | null,
    studioHandle: string,
    options?: { limit?: number }
  ): Promise<
    | {
        ok: true;
        thread: StudioConversationThread;
      }
    | { ok: false; reason: "not_found" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: StudioConversationThread;
        }
      | { ok: false; reason: "not_found" }
    >(async (db) => {
      const studio = db.catalog.studios.find((entry) => entry.handle === studioHandle) ?? null;
      if (!studio) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      const normalizedLimit =
        typeof options?.limit === "number" && Number.isFinite(options.limit)
          ? Math.min(TOWNHALL_POSTS_PREVIEW_LIMIT, Math.max(1, Math.floor(options.limit)))
          : TOWNHALL_POSTS_PREVIEW_LIMIT;

      return {
        persist: false,
        result: {
          ok: true as const,
          thread: buildStudioConversationThread(db, studio, accountId, normalizedLimit)
        }
      };
    });
  },

  async createStudioConversationMessage(
    accountId: string,
    studioHandle: string,
    body: string,
    linkedObject?: StudioConversationLinkedObjectInput | null
  ): Promise<
    | {
        ok: true;
        thread: StudioConversationThread;
      }
    | { ok: false; reason: "not_found" | "invalid" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: StudioConversationThread;
        }
      | { ok: false; reason: "not_found" | "invalid" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const studio = db.catalog.studios.find((entry) => entry.handle === studioHandle) ?? null;
      if (!account || !studio) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      const normalizedBody = normalizeTownhallPostBody(body);
      if (!normalizedBody) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "invalid" as const
          }
        };
      }

      const resolvedLinkedObject = resolveStudioConversationLinkedObjectRecord(db, studio, linkedObject);
      if (!resolvedLinkedObject) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "invalid" as const
          }
        };
      }

      const post: TownhallPostRecord = {
        id: `post_${randomUUID()}`,
        accountId: account.id,
        body: normalizedBody,
        createdAt: new Date().toISOString(),
        visibility: "visible",
        reportCount: 0,
        reportedAt: null,
        moderatedAt: null,
        moderatedByAccountId: null,
        appealRequestedAt: null,
        appealRequestedByAccountId: null,
        linkedObjectKind: resolvedLinkedObject.kind,
        linkedObjectId: resolvedLinkedObject.id,
        linkedObjectLabel: resolvedLinkedObject.label,
        linkedObjectHref: resolvedLinkedObject.href
      };

      db.townhallPosts.unshift(post);
      trimTownhallPosts(db);

      return {
        persist: true,
        result: {
          ok: true as const,
          thread: buildStudioConversationThread(db, studio, account.id)
        }
      };
    });
  },

  async actOnStudioConversationMessage(
    accountId: string,
    studioHandle: string,
    messageId: string,
    action: "report" | "appeal" | "hide" | "restrict" | "delete" | "restore" | "dismiss"
  ): Promise<
    | {
        ok: true;
        thread: StudioConversationThread;
      }
    | { ok: false; reason: "not_found" | "forbidden" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: StudioConversationThread;
        }
      | { ok: false; reason: "not_found" | "forbidden" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const studio = db.catalog.studios.find((entry) => entry.handle === studioHandle) ?? null;
      const post = studio ? findStudioConversationPostById(db, studio, messageId) : null;
      if (!account || !studio || !post) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      if (action === "report") {
        if (!canAccountReportTownhallPost(account, post)) {
          return {
            persist: false,
            result: {
              ok: false as const,
              reason: "forbidden" as const
            }
          };
        }

        post.reportCount += 1;
        post.reportedAt = new Date().toISOString();
      } else if (action === "appeal") {
        if (!canAccountAppealTownhallPost(account, post)) {
          return {
            persist: false,
            result: {
              ok: false as const,
              reason: "forbidden" as const
            }
          };
        }

        post.appealRequestedAt = new Date().toISOString();
        post.appealRequestedByAccountId = account.id;
      } else {
        if (!canAccountModerateStudioConversationPost(account, studio, post)) {
          return {
            persist: false,
            result: {
              ok: false as const,
              reason: "forbidden" as const
            }
          };
        }

        if (action === "hide") {
          post.visibility = "hidden";
        } else if (action === "restrict") {
          post.visibility = "restricted";
        } else if (action === "delete") {
          post.visibility = "deleted";
        } else if (action === "restore") {
          post.visibility = "visible";
        }

        const nowIso = new Date().toISOString();
        post.moderatedAt = nowIso;
        post.moderatedByAccountId = account.id;
        post.appealRequestedAt = null;
        post.appealRequestedByAccountId = null;
        post.reportCount = 0;
        post.reportedAt = null;
      }

      return {
        persist: true,
        result: {
          ok: true as const,
          thread: buildStudioConversationThread(db, studio, account.id)
        }
      };
    });
  },

  async purchaseDropViaLiveSession(
    accountId: string,
    dropId: string,
    liveSessionId: string
  ): Promise<PurchaseReceipt | null> {
    return withDatabase(async (db) =>
      purchaseDropInDatabase(db, accountId, dropId, {
        liveSessionId
      })
    );
  },

  async releaseWorkshopLiveSessionDrop(
    accountId: string,
    liveSessionId: string,
    input: {
      dropId: string;
      publicReleaseDelayMinutes?: number | null;
    }
  ): Promise<LiveSession | null> {
    return withDatabase(async (db) =>
      releaseWorkshopLiveSessionDropInDatabase(db, accountId, liveSessionId, input)
    );
  },

  async completePendingPayment(paymentId: string): Promise<PurchaseReceipt | null> {
    return completePendingPaymentById(paymentId, {
      allowedProviders: ["manual"]
    });
  },

  async completePendingPaymentForAccount(
    accountId: string,
    paymentId: string
  ): Promise<PurchaseReceipt | null> {
    return completePendingPaymentById(paymentId, {
      expectedAccountId: accountId,
      allowedProviders: ["manual"]
    });
  },

  async refundPaymentForCreator(
    creatorAccountId: string,
    input: CreatorRefundPaymentInput
  ): Promise<CreatorRefundPaymentResult> {
    return withDatabase<CreatorRefundPaymentResult>(async (db) => {
      const creator = findAccountById(db, creatorAccountId);
      if (!creator || !creator.roles.includes("creator")) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "forbidden"
          }
        };
      }

      const paymentId = input.paymentId?.trim() ?? "";
      const receiptId = input.receiptId?.trim() ?? "";
      if (!paymentId && !receiptId) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "invalid_input"
          }
        };
      }

      const payment = paymentId
        ? (db.payments.find((entry) => entry.id === paymentId) ?? null)
        : (db.payments.find((entry) => entry.receiptId === receiptId) ?? null);
      if (!payment) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      const drop = findDropById(db, payment.dropId);
      if (!drop || drop.studioHandle !== creator.handle) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "forbidden"
          }
        };
      }

      if (payment.status === "refunded") {
        return {
          persist: false,
          result: {
            ok: true,
            paymentId: payment.id,
            receiptId: payment.receiptId ?? null,
            dropId: payment.dropId,
            status: "refunded",
            alreadyRefunded: true,
            ownershipRevoked: false
          }
        };
      }

      if (payment.status !== "succeeded") {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_refundable"
          }
        };
      }

      payment.status = "refunded";
      payment.updatedAt = new Date().toISOString();
      const ownershipRevoked = payment.receiptId
        ? markRefundByReceipt(db, payment.accountId, payment.receiptId)
        : false;

      const refundedDrop = findDropById(db, payment.dropId);
      if (refundedDrop) {
        emitNotification(
          db,
          payment.accountId,
          "receipt_confirmed",
          `refund processed for ${refundedDrop.title}`,
          `your purchase of ${refundedDrop.title} ($${payment.amountUsd.toFixed(2)}) has been refunded.${ownershipRevoked ? " ownership has been revoked." : ""}`,
          `/my-collection`
        );
      }

      return {
        persist: true,
        result: {
          ok: true,
          paymentId: payment.id,
          receiptId: payment.receiptId ?? null,
          dropId: payment.dropId,
          status: "refunded",
          alreadyRefunded: false,
          ownershipRevoked
        }
      };
    });
  },

  async seedOnboardingDiscoverySignals(
    accountId: string,
    cardIds: string[]
  ): Promise<{
    savedDropsSeeded: number;
    followSignalsSeeded: number;
    telemetrySignalsSeeded: number;
  }> {
    return withDatabase((db) => seedOnboardingDiscoverySignalsInDatabase(db, accountId, cardIds));
  },

  async issueLiveSessionJoinToken(
    accountId: string,
    liveSessionId: string
  ): Promise<LiveSessionJoinIssueResult> {
    return withDatabase<LiveSessionJoinIssueResult>(async (db) => {
      const account = findAccountById(db, accountId);
      const liveSession = db.liveSessions.find((entry) => entry.id === liveSessionId) ?? null;
      if (!account || !liveSession) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      const nowMs = Date.now();
      if (!isLiveSessionActiveNow(liveSession, nowMs)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "session_inactive"
          }
        };
      }

      if (isLiveSessionExclusiveWindowClosed(liveSession, nowMs)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "window_closed"
          }
        };
      }

      const dropId = liveSession.dropId;
      if (!dropId || !findDropById(db, dropId)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "drop_unavailable"
          }
        };
      }

      const eligibility = resolveLiveSessionEligibilityInDatabase(db, account.id, liveSession);
      if (!eligibility.eligible) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_eligible"
          }
        };
      }

      const capacity =
        typeof liveSession.capacity === "number" && Number.isFinite(liveSession.capacity)
          ? Math.max(1, Math.floor(liveSession.capacity))
          : 200;
      const alreadyJoined = hasLiveSessionAttendance(db, liveSession.id, account.id);
      if (!alreadyJoined && countLiveSessionAttendees(db, liveSession.id) >= capacity) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "at_capacity"
          }
        };
      }

      const exclusiveWindowEndMs = getLiveSessionExclusiveWindowEndMs(liveSession);
      const tokenTtlMs = resolveLiveSessionJoinTokenTtlSeconds() * 1000;
      const expiresAtMs = Math.min(exclusiveWindowEndMs, nowMs + tokenTtlMs);
      if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "window_closed"
          }
        };
      }

      const expiresAt = new Date(expiresAtMs).toISOString();
      const claims: LiveSessionJoinTokenClaims = {
        v: LIVE_SESSION_JOIN_TOKEN_VERSION,
        jti: `lsj_${randomUUID()}`,
        accountId: account.id,
        sessionId: liveSession.id,
        dropId,
        exp: Math.floor(expiresAtMs / 1000)
      };

      let persist = false;
      if (!alreadyJoined) {
        const attendee: LiveSessionAttendeeRecord = {
          id: `lsatt_${randomUUID()}`,
          liveSessionId: liveSession.id,
          accountId: account.id,
          joinedAt: new Date(nowMs).toISOString()
        };
        db.liveSessionAttendees.unshift(attendee);
        trimLiveSessionAttendees(db);
        persist = true;
      }

      return {
        persist,
        result: {
          ok: true,
          result: {
            sessionId: liveSession.id,
            joinToken: encodeLiveSessionJoinToken(claims),
            expiresAt
          }
        }
      };
    });
  },

  async consumeLiveSessionJoinToken(input: {
    accountId: string;
    liveSessionId: string;
    dropId: string;
    joinToken: string;
  }): Promise<LiveSessionJoinConsumeResult> {
    const claims = decodeLiveSessionJoinToken(input.joinToken);
    if (!claims) {
      return {
        granted: false,
        reason: "invalid_token"
      };
    }

    if (
      claims.accountId !== input.accountId ||
      claims.sessionId !== input.liveSessionId ||
      claims.dropId !== input.dropId
    ) {
      return {
        granted: false,
        reason: "binding_mismatch"
      };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (claims.exp <= nowSeconds) {
      return {
        granted: false,
        reason: "expired"
      };
    }

    return withDatabase<LiveSessionJoinConsumeResult>(async (db) => {
      const liveSession = db.liveSessions.find((entry) => entry.id === input.liveSessionId) ?? null;
      if (!liveSession) {
        return {
          persist: false,
          result: {
            granted: false,
            reason: "not_found"
          }
        };
      }

      const nowMs = Date.now();
      if (isLiveSessionExclusiveWindowClosed(liveSession, nowMs)) {
        return {
          persist: false,
          result: {
            granted: false,
            reason: "window_closed"
          }
        };
      }

      if (liveSession.dropId !== input.dropId) {
        return {
          persist: false,
          result: {
            granted: false,
            reason: "binding_mismatch"
          }
        };
      }

      const eligibility = resolveLiveSessionEligibilityInDatabase(
        db,
        input.accountId,
        liveSession
      );
      if (!eligibility.eligible) {
        return {
          persist: false,
          result: {
            granted: false,
            reason: "binding_mismatch"
          }
        };
      }

      return {
        persist: false,
        result: {
          granted: true,
          liveSession: toLiveSession(db, liveSession)
        }
      };
    });
  },

  async commitPatron(
    accountId: string,
    studioHandle: string,
    worldId?: string | null
  ): Promise<
    | {
        ok: true;
        patron: Pick<Patron, "handle" | "studioHandle" | "status" | "committedAt">;
      }
    | { ok: false; reason: "forbidden" | "not_found" }
  > {
    return withDatabase<
      | {
          ok: true;
          patron: Pick<Patron, "handle" | "studioHandle" | "status" | "committedAt">;
        }
      | { ok: false; reason: "forbidden" | "not_found" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account || !account.roles.includes("collector")) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      const studio = db.catalog.studios.find((entry) => entry.handle === studioHandle) ?? null;
      if (!studio) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      const normalizedWorldId = worldId?.trim() || null;
      if (normalizedWorldId) {
        const world = findWorldById(db, normalizedWorldId);
        if (!world || world.studioHandle !== studio.handle) {
          return {
            persist: false,
            result: {
              ok: false as const,
              reason: "not_found" as const
            }
          };
        }
      }

      const nowIso = new Date().toISOString();
      const existingPatron =
        db.patrons.find(
          (entry) => entry.accountId === account.id && entry.studioHandle === studio.handle
        ) ?? null;

      const patronRecord: PatronRecord = existingPatron ?? {
        id: `pat_${randomUUID()}`,
        accountId: account.id,
        handle: account.handle,
        studioHandle: studio.handle,
        status: "active",
        committedAt: nowIso,
        lapsedAt: null
      };

      patronRecord.handle = account.handle;
      patronRecord.studioHandle = studio.handle;
      patronRecord.status = "active";
      patronRecord.committedAt = nowIso;
      patronRecord.lapsedAt = null;

      if (!existingPatron) {
        db.patrons.unshift(patronRecord);
      }

      trimPatrons(db);

      const configuredTier = findEffectivePatronTierConfig(db, studio.handle, normalizedWorldId);
      const amountCents = configuredTier?.amountCents ?? resolvePatronCommitmentAmountCents();
      const periodDays = configuredTier?.periodDays ?? resolvePatronCommitmentPeriodDays();
      const periodStart = nowIso;
      const periodEnd = new Date(
        Date.parse(periodStart) + periodDays * 24 * 60 * 60 * 1000
      ).toISOString();
      const quote = buildPatronSettlementQuote(amountCents / 100);
      const ledger = appendLedgerEntries(db, {
        kind: "patron",
        accountId: account.id,
        dropId: null,
        paymentId: null,
        receiptId: null,
        quote,
        createdAt: nowIso
      });

      const commitmentRecord: PatronCommitmentRecord = {
        id: `patc_${randomUUID()}`,
        patronId: patronRecord.id,
        amountCents,
        periodStart,
        periodEnd,
        ledgerTransactionId: ledger.transaction.id
      };

      db.patronCommitments.unshift(commitmentRecord);
      trimPatronCommitments(db);

      emitNotification(
        db,
        account.id,
        "patron_renewal",
        `you are now a patron of @${studio.handle}`,
        `your patronage commitment is active. thank you for supporting this creator.`,
        `/studio/${studio.handle}`
      );

      const creatorAccount = db.accounts.find((a) => a.handle === studio.handle);
      if (creatorAccount) {
        emitNotification(
          db,
          creatorAccount.id,
          "patron_renewal",
          `@${account.handle} became a patron`,
          `you have a new patron commitment from @${account.handle}.`,
          `/workshop`
        );
      }

      return {
        persist: true,
        result: {
          ok: true as const,
          patron: toPublicPatron(patronRecord)
        }
      };
    });
  },

  async listWorldPatronRoster(
    accountId: string,
    worldId: string
  ): Promise<
    | {
        ok: true;
        snapshot: WorldPatronRosterSnapshot;
      }
    | { ok: false; reason: "not_found" | "forbidden" }
  > {
    return withDatabase<
      | {
          ok: true;
          snapshot: WorldPatronRosterSnapshot;
        }
      | { ok: false; reason: "not_found" | "forbidden" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const world = findWorldById(db, worldId);
      if (!account || !world) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      const viewerAccess = buildWorldPatronRosterViewerAccess(db, account, world);
      const hasViewerAccess =
        viewerAccess.hasMembershipEntitlement ||
        viewerAccess.hasCollectEntitlement ||
        viewerAccess.hasCreatorAccess ||
        viewerAccess.hasPatronCommitment;
      if (!hasViewerAccess) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      const studioPatrons = db.patrons.filter((patron) => patron.studioHandle === world.studioHandle);
      const activePatrons = studioPatrons.filter((patron) => patron.status === "active");
      const foundingPatronIds = new Set(
        [...activePatrons]
          .sort((a, b) => Date.parse(a.committedAt) - Date.parse(b.committedAt))
          .slice(0, 3)
          .map((patron) => patron.id)
      );
      const roster = [...activePatrons]
        .sort((a, b) => Date.parse(b.committedAt) - Date.parse(a.committedAt))
        .map((patron) =>
          toPatronRosterEntry(
            patron,
            foundingPatronIds.has(patron.id) ? "founding" : "active"
          )
        );

      return {
        persist: false,
        result: {
          ok: true as const,
          snapshot: {
            worldId: world.id,
            studioHandle: world.studioHandle,
            patrons: roster,
            totals: {
              totalCount: studioPatrons.length,
              activeCount: activePatrons.length,
              lapsedCount: studioPatrons.length - activePatrons.length
            },
            viewerAccess
          }
        }
      };
    });
  },

  async getLiveSessionConversationThread(
    accountId: string,
    liveSessionId: string
  ): Promise<
    | {
        ok: true;
        thread: LiveSessionConversationThread;
      }
    | { ok: false; reason: "not_found" | "forbidden" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: LiveSessionConversationThread;
        }
      | { ok: false; reason: "not_found" | "forbidden" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const liveSession = db.liveSessions.find((entry) => entry.id === liveSessionId) ?? null;
      if (!account || !liveSession) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      const nowMs = Date.now();
      if (!canAccessLiveSessionConversationThread(db, account, liveSession, nowMs)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      return {
        persist: false,
        result: {
          ok: true as const,
          thread: buildLiveSessionConversationThread(db, liveSession, account)
        }
      };
    });
  },

  async addLiveSessionConversationMessage(
    accountId: string,
    liveSessionId: string,
    body: string,
    parentMessageId?: string | null
  ): Promise<
    | {
        ok: true;
        thread: LiveSessionConversationThread;
      }
    | { ok: false; reason: "not_found" | "forbidden" | "invalid" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: LiveSessionConversationThread;
        }
      | { ok: false; reason: "not_found" | "forbidden" | "invalid" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const liveSession = db.liveSessions.find((entry) => entry.id === liveSessionId) ?? null;
      if (!account || !liveSession) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      const nowMs = Date.now();
      if (!canAccessLiveSessionConversationThread(db, account, liveSession, nowMs)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      const normalizedBody = normalizeLiveSessionConversationMessageBody(body);
      if (!normalizedBody) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "invalid" as const
          }
        };
      }

      const normalizedParentMessageId = parentMessageId?.trim() || null;
      if (normalizedParentMessageId) {
        const parentMessage = findLiveSessionConversationMessageById(
          db,
          liveSession.id,
          normalizedParentMessageId
        );
        if (!parentMessage) {
          return {
            persist: false,
            result: {
              ok: false as const,
              reason: "invalid" as const
            }
          };
        }
      }

      const nowIso = new Date().toISOString();
      const message: LiveSessionConversationMessageRecord = {
        id: `lscm_${randomUUID()}`,
        liveSessionId: liveSession.id,
        accountId: account.id,
        parentMessageId: normalizedParentMessageId,
        body: normalizedBody,
        createdAt: nowIso,
        visibility: "visible",
        reportCount: 0,
        reportedAt: null,
        moderatedAt: null,
        moderatedByAccountId: null,
        appealRequestedAt: null,
        appealRequestedByAccountId: null
      };

      db.liveSessionConversationMessages.unshift(message);
      trimLiveSessionConversationMessages(db);

      return {
        persist: true,
        result: {
          ok: true as const,
          thread: buildLiveSessionConversationThread(db, liveSession, account)
        }
      };
    });
  },

  async reportLiveSessionConversationMessage(
    accountId: string,
    liveSessionId: string,
    messageId: string
  ): Promise<
    | {
        ok: true;
        thread: LiveSessionConversationThread;
      }
    | { ok: false; reason: "not_found" | "forbidden" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: LiveSessionConversationThread;
        }
      | { ok: false; reason: "not_found" | "forbidden" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const liveSession = db.liveSessions.find((entry) => entry.id === liveSessionId) ?? null;
      const message = findLiveSessionConversationMessageById(db, liveSessionId, messageId);
      if (!account || !liveSession || !message) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      const nowMs = Date.now();
      if (!canAccessLiveSessionConversationThread(db, account, liveSession, nowMs)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      if (!canAccountReportLiveSessionConversationMessage(account, message)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      message.reportCount += 1;
      message.reportedAt = new Date().toISOString();

      return {
        persist: true,
        result: {
          ok: true as const,
          thread: buildLiveSessionConversationThread(db, liveSession, account)
        }
      };
    });
  },

  async appealLiveSessionConversationMessage(
    accountId: string,
    liveSessionId: string,
    messageId: string
  ): Promise<
    | {
        ok: true;
        thread: LiveSessionConversationThread;
      }
    | { ok: false; reason: "not_found" | "forbidden" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: LiveSessionConversationThread;
        }
      | { ok: false; reason: "not_found" | "forbidden" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const liveSession = db.liveSessions.find((entry) => entry.id === liveSessionId) ?? null;
      const message = findLiveSessionConversationMessageById(db, liveSessionId, messageId);
      if (!account || !liveSession || !message) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      const nowMs = Date.now();
      if (!canAccessLiveSessionConversationThread(db, account, liveSession, nowMs)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      if (!canAccountAppealLiveSessionConversationMessage(account, message)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      message.appealRequestedAt = new Date().toISOString();
      message.appealRequestedByAccountId = account.id;

      return {
        persist: true,
        result: {
          ok: true as const,
          thread: buildLiveSessionConversationThread(db, liveSession, account)
        }
      };
    });
  },

  async resolveLiveSessionConversationModeration(
    accountId: string,
    liveSessionId: string,
    messageId: string,
    resolution: LiveSessionConversationModerationResolution
  ): Promise<
    | {
        ok: true;
        thread: LiveSessionConversationThread;
      }
    | { ok: false; reason: "not_found" | "forbidden" | "invalid" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: LiveSessionConversationThread;
        }
      | { ok: false; reason: "not_found" | "forbidden" | "invalid" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const liveSession = db.liveSessions.find((entry) => entry.id === liveSessionId) ?? null;
      const message = findLiveSessionConversationMessageById(db, liveSessionId, messageId);
      if (!account || !liveSession || !message) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      if (!isLiveSessionConversationModerationResolution(resolution)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "invalid" as const
          }
        };
      }

      if (!canAccountResolveLiveSessionConversationModerationCase(account, liveSession)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      applyLiveSessionConversationModerationResolution(message, account.id, resolution);

      return {
        persist: true,
        result: {
          ok: true as const,
          thread: buildLiveSessionConversationThread(db, liveSession, account)
        }
      };
    });
  },

  async listLiveSessionConversationModerationQueue(
    accountId: string,
    liveSessionId?: string | null
  ): Promise<LiveSessionConversationModerationQueueItem[]> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: []
        };
      }

      return {
        persist: false,
        result: buildLiveSessionConversationModerationQueue(db, account, liveSessionId)
      };
    });
  },

  async resolveLiveSessionConversationModerationCase(
    accountId: string,
    liveSessionId: string,
    messageId: string,
    resolution: LiveSessionConversationModerationResolution
  ): Promise<LiveSessionConversationModerationCaseResolveResult> {
    return withDatabase<LiveSessionConversationModerationCaseResolveResult>(async (db) => {
      const account = findAccountById(db, accountId);
      const liveSession = db.liveSessions.find((entry) => entry.id === liveSessionId) ?? null;
      const message = findLiveSessionConversationMessageById(db, liveSessionId, messageId);
      if (!account || !liveSession || !message || !isLiveSessionConversationModerationResolution(resolution)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      if (!canAccountResolveLiveSessionConversationModerationCase(account, liveSession)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "forbidden"
          }
        };
      }

      applyLiveSessionConversationModerationResolution(message, account.id, resolution);

      return {
        persist: true,
        result: {
          ok: true,
          queue: buildLiveSessionConversationModerationQueue(db, account, liveSession.id)
        }
      };
    });
  },

  async getWorldConversationThread(
    accountId: string,
    worldId: string
  ): Promise<
    | {
        ok: true;
        thread: WorldConversationThread;
      }
    | { ok: false; reason: "not_found" | "forbidden" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: WorldConversationThread;
        }
      | { ok: false; reason: "not_found" | "forbidden" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const world = findWorldById(db, worldId);
      if (!account || !world) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      if (!canAccessWorldConversationThread(db, account, world)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      return {
        persist: false,
        result: {
          ok: true as const,
          thread: buildWorldConversationThread(db, world, account)
        }
      };
    });
  },

  async addWorldConversationMessage(
    accountId: string,
    worldId: string,
    body: string,
    parentMessageId?: string | null
  ): Promise<
    | {
        ok: true;
        thread: WorldConversationThread;
      }
    | { ok: false; reason: "not_found" | "forbidden" | "invalid" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: WorldConversationThread;
        }
      | { ok: false; reason: "not_found" | "forbidden" | "invalid" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const world = findWorldById(db, worldId);
      if (!account || !world) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      if (!canAccessWorldConversationThread(db, account, world)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      const normalizedBody = normalizeWorldConversationMessageBody(body);
      if (!normalizedBody) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "invalid" as const
          }
        };
      }

      const normalizedParentMessageId = parentMessageId?.trim() || null;
      if (normalizedParentMessageId) {
        const parentMessage = findWorldConversationMessageById(
          db,
          world.id,
          normalizedParentMessageId
        );
        if (!parentMessage) {
          return {
            persist: false,
            result: {
              ok: false as const,
              reason: "invalid" as const
            }
          };
        }
      }

      const nowIso = new Date().toISOString();
      const message: WorldConversationMessageRecord = {
        id: `wcm_${randomUUID()}`,
        worldId: world.id,
        accountId: account.id,
        parentMessageId: normalizedParentMessageId,
        body: normalizedBody,
        createdAt: nowIso,
        visibility: "visible",
        reportCount: 0,
        reportedAt: null,
        moderatedAt: null,
        moderatedByAccountId: null,
        appealRequestedAt: null,
        appealRequestedByAccountId: null
      };

      db.worldConversationMessages.unshift(message);
      trimWorldConversationMessages(db);

      return {
        persist: true,
        result: {
          ok: true as const,
          thread: buildWorldConversationThread(db, world, account)
        }
      };
    });
  },

  async reportWorldConversationMessage(
    accountId: string,
    worldId: string,
    messageId: string
  ): Promise<
    | {
        ok: true;
        thread: WorldConversationThread;
      }
    | { ok: false; reason: "not_found" | "forbidden" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: WorldConversationThread;
        }
      | { ok: false; reason: "not_found" | "forbidden" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const world = findWorldById(db, worldId);
      const message = findWorldConversationMessageById(db, worldId, messageId);
      if (!account || !world || !message) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      if (!canAccessWorldConversationThread(db, account, world)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      if (!canAccountReportWorldConversationMessage(account, message)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      message.reportCount += 1;
      message.reportedAt = new Date().toISOString();

      return {
        persist: true,
        result: {
          ok: true as const,
          thread: buildWorldConversationThread(db, world, account)
        }
      };
    });
  },

  async appealWorldConversationMessage(
    accountId: string,
    worldId: string,
    messageId: string
  ): Promise<
    | {
        ok: true;
        thread: WorldConversationThread;
      }
    | { ok: false; reason: "not_found" | "forbidden" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: WorldConversationThread;
        }
      | { ok: false; reason: "not_found" | "forbidden" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const world = findWorldById(db, worldId);
      const message = findWorldConversationMessageById(db, worldId, messageId);
      if (!account || !world || !message) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      if (!canAccessWorldConversationThread(db, account, world)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      if (!canAccountAppealWorldConversationMessage(account, message)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      message.appealRequestedAt = new Date().toISOString();
      message.appealRequestedByAccountId = account.id;

      return {
        persist: true,
        result: {
          ok: true as const,
          thread: buildWorldConversationThread(db, world, account)
        }
      };
    });
  },

  async resolveWorldConversationModeration(
    accountId: string,
    worldId: string,
    messageId: string,
    resolution: WorldConversationModerationResolution
  ): Promise<
    | {
        ok: true;
        thread: WorldConversationThread;
      }
    | { ok: false; reason: "not_found" | "forbidden" | "invalid" }
  > {
    return withDatabase<
      | {
          ok: true;
          thread: WorldConversationThread;
        }
      | { ok: false; reason: "not_found" | "forbidden" | "invalid" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const world = findWorldById(db, worldId);
      const message = findWorldConversationMessageById(db, worldId, messageId);
      if (!account || !world || !message) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      if (!canAccessWorldConversationThread(db, account, world)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      if (!isWorldConversationModerationResolution(resolution)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "invalid" as const
          }
        };
      }

      if (!canAccountResolveWorldConversationModerationCase(account, world)) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "forbidden" as const
          }
        };
      }

      applyWorldConversationModerationResolution(message, account.id, resolution);

      return {
        persist: true,
        result: {
          ok: true as const,
          thread: buildWorldConversationThread(db, world, account)
        }
      };
    });
  },

  async listWorldConversationModerationQueue(
    accountId: string,
    worldId?: string | null
  ): Promise<WorldConversationModerationQueueItem[]> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: []
        };
      }

      return {
        persist: false,
        result: buildWorldConversationModerationQueue(db, account, worldId)
      };
    });
  },

  async resolveWorldConversationModerationCase(
    accountId: string,
    worldId: string,
    messageId: string,
    resolution: WorldConversationModerationResolution
  ): Promise<WorldConversationModerationCaseResolveResult> {
    return withDatabase<WorldConversationModerationCaseResolveResult>(async (db) => {
      const account = findAccountById(db, accountId);
      const world = findWorldById(db, worldId);
      const message = findWorldConversationMessageById(db, worldId, messageId);
      if (!account || !world || !message || !isWorldConversationModerationResolution(resolution)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      if (!canAccountResolveWorldConversationModerationCase(account, world)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "forbidden"
          }
        };
      }

      applyWorldConversationModerationResolution(message, account.id, resolution);

      return {
        persist: true,
        result: {
          ok: true,
          queue: buildWorldConversationModerationQueue(db, account, world.id)
        }
      };
    });
  },

  async createReceiptBadge(
    accountId: string,
    receiptId: string
  ): Promise<
    | { ok: true; badge: ReceiptBadge }
    | { ok: false; reason: "not_found" | "forbidden" | "conflict" }
  > {
    return withDatabase<
      | { ok: true; badge: ReceiptBadge }
      | { ok: false; reason: "not_found" | "forbidden" | "conflict" }
    >(async (db) => {
      const receipt = db.receipts.find((entry) => entry.id === receiptId) ?? null;
      if (!receipt) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found" as const
          }
        };
      }

      if (receipt.accountId !== accountId || receipt.status !== "completed") {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "forbidden" as const
          }
        };
      }

      const existing = db.receiptBadges.find((entry) => entry.receiptId === receipt.id) ?? null;
      if (existing) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "conflict" as const
          }
        };
      }

      const account = findAccountById(db, accountId);
      const drop = findDropById(db, receipt.dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found" as const
          }
        };
      }

      const world = findWorldById(db, drop.worldId);
      const nowIso = new Date().toISOString();
      const badgeRecord: ReceiptBadgeRecord = {
        id: `badge_${randomUUID()}`,
        dropTitle: drop.title,
        worldTitle: world?.title ?? drop.worldLabel,
        collectDate: resolveReceiptBadgeCollectDate(receipt),
        editionPosition: resolveReceiptBadgeEditionPosition(db, receipt),
        collectorHandle: account.handle,
        createdAt: nowIso,
        receiptId: receipt.id,
        ownerAccountId: account.id
      };

      db.receiptBadges.unshift(badgeRecord);

      return {
        persist: true,
        result: {
          ok: true,
          badge: toPublicReceiptBadge(badgeRecord)
        }
      };
    });
  },

  async getReceiptBadgeById(badgeId: string): Promise<ReceiptBadge | null> {
    return withDatabase(async (db) => {
      const badge = db.receiptBadges.find((entry) => entry.id === badgeId) ?? null;
      return {
        persist: false,
        result: badge ? toPublicReceiptBadge(badge) : null
      };
    });
  },

  async getDropOwnershipHistory(dropId: string): Promise<DropOwnershipHistory | null> {
    return withDatabase(async (db) => {
      const drop = findDropById(db, dropId);
      if (!drop) {
        return {
          persist: false,
          result: null
        };
      }

      return {
        persist: false,
        result: buildDropOwnershipHistory(db, drop.id)
      };
    });
  },

  async getDropLineage(dropId: string): Promise<DropLineageSnapshot | null> {
    return withDatabase(async (db) => {
      const drop = findDropById(db, dropId);
      if (!drop) {
        return {
          persist: false,
          result: null
        };
      }

      return {
        persist: false,
        result: buildDropLineageSnapshot(db, drop.id)
      };
    });
  },

  async getDropLiveArtifacts(dropId: string): Promise<DropLiveArtifactsSnapshot | null> {
    return withDatabase(async (db) => {
      const drop = findDropById(db, dropId);
      if (!drop) {
        return {
          persist: false,
          result: null
        };
      }

      return {
        persist: false,
        result: buildDropLiveArtifactsSnapshot(db, drop.id)
      };
    });
  },

  async createDropVersion(
    accountId: string,
    dropId: string,
    input: CreateDropVersionInput
  ): Promise<DropVersion | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop || !account.roles.includes("creator")) {
        return {
          persist: false,
          result: null
        };
      }

      if (account.handle !== drop.studioHandle) {
        return {
          persist: false,
          result: null
        };
      }

      if (!DROP_VERSION_LABEL_SET.has(input.label)) {
        return {
          persist: false,
          result: null
        };
      }

      const notes = input.notes?.trim() || null;
      const releasedAt = input.releasedAt?.trim() || null;
      if (releasedAt && !Number.isFinite(Date.parse(releasedAt))) {
        return {
          persist: false,
          result: null
        };
      }

      const createdAt = new Date().toISOString();
      const record: DropVersionRecord = {
        id: `dver_${randomUUID()}`,
        dropId: drop.id,
        label: input.label,
        notes,
        createdByHandle: account.handle,
        createdAt,
        releasedAt
      };

      db.dropVersions.unshift(record);

      return {
        persist: true,
        result: toDropVersion(record)
      };
    });
  },

  async createAuthorizedDerivative(
    accountId: string,
    sourceDropId: string,
    input: CreateAuthorizedDerivativeInput
  ): Promise<AuthorizedDerivative | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      const sourceDrop = findDropById(db, sourceDropId);
      const derivativeDrop = findDropById(db, input.derivativeDropId);
      if (!account || !sourceDrop || !derivativeDrop || !account.roles.includes("creator")) {
        return {
          persist: false,
          result: null
        };
      }

      if (account.handle !== sourceDrop.studioHandle) {
        return {
          persist: false,
          result: null
        };
      }

      if (sourceDrop.id === derivativeDrop.id) {
        return {
          persist: false,
          result: null
        };
      }

      if (!AUTHORIZED_DERIVATIVE_KIND_SET.has(input.kind)) {
        return {
          persist: false,
          result: null
        };
      }

      const attribution = input.attribution.trim();
      if (!attribution) {
        return {
          persist: false,
          result: null
        };
      }

      if (!Array.isArray(input.revenueSplits) || input.revenueSplits.length === 0) {
        return {
          persist: false,
          result: null
        };
      }

      const revenueSplits = input.revenueSplits
        .map((entry) => {
          const recipientHandle = entry.recipientHandle.trim();
          const sharePercent = Number(entry.sharePercent.toFixed(2));
          if (!recipientHandle || !Number.isFinite(sharePercent) || sharePercent <= 0 || sharePercent > 100) {
            return null;
          }

          return {
            recipientHandle,
            sharePercent
          };
        })
        .filter(
          (entry): entry is { recipientHandle: string; sharePercent: number } => entry !== null
        );

      if (revenueSplits.length !== input.revenueSplits.length || !hasValidRevenueSplitTotal(revenueSplits)) {
        return {
          persist: false,
          result: null
        };
      }

      const duplicate = db.authorizedDerivatives.find(
        (entry) =>
          entry.sourceDropId === sourceDrop.id &&
          entry.derivativeDropId === derivativeDrop.id &&
          entry.kind === input.kind
      );
      if (duplicate) {
        return {
          persist: false,
          result: null
        };
      }

      const record: AuthorizedDerivativeRecord = {
        id: `ader_${randomUUID()}`,
        sourceDropId: sourceDrop.id,
        derivativeDropId: derivativeDrop.id,
        kind: input.kind,
        attribution,
        revenueSplits,
        authorizedByHandle: account.handle,
        createdAt: new Date().toISOString()
      };

      db.authorizedDerivatives.unshift(record);

      return {
        persist: true,
        result: toAuthorizedDerivative(record)
      };
    });
  },

  async updateDropPreviewMedia(
    accountId: string,
    dropId: string,
    input: UpdateDropPreviewMediaInput
  ): Promise<DropPreviewMap | null> {
    const VALID_MODES = new Set(["watch", "listen", "read", "photos", "live"]);
    const VALID_TYPES = new Set(["video", "audio", "image", "text"]);

    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop || !account.roles.includes("creator")) {
        return { persist: false, result: null };
      }

      if (account.handle !== drop.studioHandle) {
        return { persist: false, result: null };
      }

      const updated: DropPreviewMap = { ...(drop.previewMedia ?? {}) };

      for (const [modeKey, value] of Object.entries(input)) {
        if (!VALID_MODES.has(modeKey)) continue;
        const mode = modeKey as DropPreviewMode;

        if (value === null) {
          delete updated[mode];
          continue;
        }

        if (!value || typeof value !== "object") continue;
        if (!VALID_TYPES.has(value.type)) continue;

        updated[mode] = {
          type: value.type,
          ...(value.src ? { src: value.src } : {}),
          ...(value.posterSrc ? { posterSrc: value.posterSrc } : {}),
          ...(value.alt ? { alt: value.alt } : {}),
          ...(value.text ? { text: value.text } : {})
        };
      }

      drop.previewMedia = updated;

      return { persist: true, result: updated };
    });
  },

  async createWatchAccessToken(
    accountId: string,
    dropId: string
  ): Promise<WatchAccessTokenIssueResult | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const entitlement = findOwnershipByDrop(db, account.id, drop.id);
      if (!entitlement) {
        return {
          persist: false,
          result: null
        };
      }

      const nowMs = Date.now();
      pruneExpiredWatchAccessGrants(db, nowMs);

      const issuedAt = new Date(nowMs).toISOString();
      const ttlSeconds = resolveWatchAccessTokenTtlSeconds();
      const expiresAt = new Date(nowMs + ttlSeconds * 1000).toISOString();
      const tokenId = `wat_${randomUUID()}`;
      const claims: WatchAccessTokenClaims = {
        v: WATCH_ACCESS_TOKEN_VERSION,
        jti: tokenId,
        accountId: account.id,
        dropId: drop.id,
        exp: Math.floor(Date.parse(expiresAt) / 1000)
      };

      const grant: WatchAccessGrantRecord = {
        tokenId,
        accountId: account.id,
        dropId: drop.id,
        issuedAt,
        expiresAt,
        consumedAt: null
      };

      db.watchAccessGrants.unshift(grant);
      trimWatchAccessGrants(db);

      return {
        persist: true,
        result: {
          token: encodeWatchAccessToken(claims),
          tokenId,
          expiresAt
        }
      };
    });
  },

  async consumeWatchAccessToken(input: {
    accountId: string;
    dropId: string;
    token: string;
  }): Promise<WatchAccessTokenConsumeResult> {
    const claims = decodeWatchAccessToken(input.token);
    if (!claims) {
      return {
        granted: false,
        reason: "invalid_token"
      };
    }

    if (claims.accountId !== input.accountId || claims.dropId !== input.dropId) {
      return {
        granted: false,
        reason: "binding_mismatch"
      };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (claims.exp <= nowSeconds) {
      return {
        granted: false,
        reason: "expired"
      };
    }

    return withDatabase<WatchAccessTokenConsumeResult>(async (db) => {
      const nowMs = Date.now();
      const grantsBeforePrune = db.watchAccessGrants.length;
      pruneExpiredWatchAccessGrants(db, nowMs);
      const prunedExpiredGrants = db.watchAccessGrants.length !== grantsBeforePrune;

      const grant = db.watchAccessGrants.find((entry) => entry.tokenId === claims.jti) ?? null;
      if (!grant) {
        return {
          persist: prunedExpiredGrants,
          result: {
            granted: false,
            reason: "not_found"
          }
        };
      }

      if (grant.accountId !== input.accountId || grant.dropId !== input.dropId) {
        return {
          persist: prunedExpiredGrants,
          result: {
            granted: false,
            reason: "binding_mismatch"
          }
        };
      }

      if (grant.consumedAt) {
        return {
          persist: prunedExpiredGrants,
          result: {
            granted: false,
            reason: "replayed"
          }
        };
      }

      const grantExpiresAtMs = Date.parse(grant.expiresAt);
      if (!Number.isFinite(grantExpiresAtMs) || grantExpiresAtMs <= nowMs) {
        db.watchAccessGrants = db.watchAccessGrants.filter((entry) => entry.tokenId !== grant.tokenId);
        return {
          persist: true,
          result: {
            granted: false,
            reason: "expired"
          }
        };
      }

      const entitlement = findOwnershipByDrop(db, input.accountId, input.dropId);
      if (!entitlement) {
        return {
          persist: prunedExpiredGrants,
          result: {
            granted: false,
            reason: "entitlement_revoked"
          }
        };
      }

      grant.consumedAt = new Date(nowMs).toISOString();
      return {
        persist: true,
        result: {
          granted: true,
          tokenId: grant.tokenId,
          expiresAt: grant.expiresAt
        }
      };
    });
  },

  async startWatchSession(
    accountId: string,
    dropId: string
  ): Promise<WatchSessionSnapshot | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const entitlement = findOwnershipByDrop(db, account.id, drop.id);
      if (!entitlement) {
        return {
          persist: false,
          result: null
        };
      }

      const nowIso = new Date().toISOString();
      const record: WatchSessionRecord = {
        id: `wss_${randomUUID()}`,
        accountId: account.id,
        dropId: drop.id,
        status: "active",
        startedAt: nowIso,
        lastHeartbeatAt: nowIso,
        endedAt: null,
        endReason: null,
        heartbeatCount: 0,
        totalWatchTimeSeconds: 0,
        completionPercent: 0,
        rebufferCount: 0,
        qualityStepDownCount: 0,
        lastQualityMode: null,
        lastQualityLevel: null
      };

      db.watchSessions.unshift(record);
      trimWatchSessions(db);
      appendTownhallTelemetryEvent(db, {
        accountId: account.id,
        dropId: drop.id,
        eventType: "access_start",
        metadata: {
          source: "drop",
          surface: "watch",
          action: "start"
        },
        occurredAt: nowIso
      });

      return {
        persist: true,
        result: toWatchSessionSnapshot(record)
      };
    });
  },

  async heartbeatWatchSession(
    input: WatchSessionHeartbeatInput
  ): Promise<WatchSessionLifecycleMutationResult> {
    return withDatabase<WatchSessionLifecycleMutationResult>(async (db) => {
      const account = findAccountById(db, input.accountId);
      if (!account) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      const session = db.watchSessions.find(
        (entry) => entry.id === input.sessionId && entry.accountId === account.id
      );
      if (!session) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      if (session.status !== "active") {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "session_ended"
          }
        };
      }

      const nowIso = new Date().toISOString();
      const normalizedWatchTime = normalizeWatchTimeSeconds(input.watchTimeSeconds);
      const normalizedCompletion = normalizeCompletionPercent(input.completionPercent);
      session.heartbeatCount += 1;
      session.lastHeartbeatAt = nowIso;
      session.totalWatchTimeSeconds = Number(
        (session.totalWatchTimeSeconds + normalizedWatchTime).toFixed(2)
      );
      session.completionPercent = Number(
        Math.max(session.completionPercent, normalizedCompletion).toFixed(2)
      );

      if (input.qualityMode) {
        session.lastQualityMode = input.qualityMode;
      }
      if (input.qualityLevel) {
        session.lastQualityLevel = input.qualityLevel;
      }
      if (input.rebufferReason) {
        session.rebufferCount += 1;
      }
      if (
        input.qualityReason === "auto_step_down_error" ||
        input.qualityReason === "auto_step_down_stalled"
      ) {
        session.qualityStepDownCount += 1;
      }

      if (normalizedWatchTime > 0) {
        appendTownhallTelemetryEvent(db, {
          accountId: account.id,
          dropId: session.dropId,
          eventType: "watch_time",
          watchTimeSeconds: normalizedWatchTime,
          metadata: {
            source: "drop",
            surface: "watch",
            qualityMode: input.qualityMode,
            qualityLevel: input.qualityLevel
          },
          occurredAt: nowIso
        });
      }

      if (input.qualityMode || input.qualityLevel || input.qualityReason) {
        appendTownhallTelemetryEvent(db, {
          accountId: account.id,
          dropId: session.dropId,
          eventType: "quality_change",
          metadata: {
            source: "drop",
            surface: "watch",
            action: "toggle",
            qualityMode: input.qualityMode,
            qualityLevel: input.qualityLevel,
            qualityReason: input.qualityReason
          },
          occurredAt: nowIso
        });
      }

      if (input.rebufferReason) {
        appendTownhallTelemetryEvent(db, {
          accountId: account.id,
          dropId: session.dropId,
          eventType: "rebuffer",
          metadata: {
            source: "drop",
            surface: "watch",
            action: "toggle",
            qualityMode: input.qualityMode,
            qualityLevel: input.qualityLevel,
            rebufferReason: input.rebufferReason
          },
          occurredAt: nowIso
        });
      }

      return {
        persist: true,
        result: {
          ok: true,
          session: toWatchSessionSnapshot(session)
        }
      };
    });
  },

  async endWatchSession(input: WatchSessionEndInput): Promise<WatchSessionLifecycleMutationResult> {
    return withDatabase<WatchSessionLifecycleMutationResult>(async (db) => {
      const account = findAccountById(db, input.accountId);
      if (!account) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      const session = db.watchSessions.find(
        (entry) => entry.id === input.sessionId && entry.accountId === account.id
      );
      if (!session) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      if (session.status !== "active") {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "session_ended"
          }
        };
      }

      const nowIso = new Date().toISOString();
      const normalizedWatchTime = normalizeWatchTimeSeconds(input.watchTimeSeconds);
      const normalizedCompletion = normalizeCompletionPercent(input.completionPercent);
      const normalizedEndReason = normalizeWatchSessionEndReason(input.endReason);

      session.status = "ended";
      session.endedAt = nowIso;
      session.lastHeartbeatAt = nowIso;
      session.totalWatchTimeSeconds = Number(
        (session.totalWatchTimeSeconds + normalizedWatchTime).toFixed(2)
      );
      session.completionPercent = Number(
        Math.max(session.completionPercent, normalizedCompletion).toFixed(2)
      );
      session.endReason =
        normalizedEndReason ??
        (session.completionPercent >= 100 ? "completed" : "user_exit");

      if (input.qualityMode) {
        session.lastQualityMode = input.qualityMode;
      }
      if (input.qualityLevel) {
        session.lastQualityLevel = input.qualityLevel;
      }
      if (input.rebufferReason) {
        session.rebufferCount += 1;
      }
      if (
        input.qualityReason === "auto_step_down_error" ||
        input.qualityReason === "auto_step_down_stalled"
      ) {
        session.qualityStepDownCount += 1;
      }

      if (normalizedWatchTime > 0) {
        appendTownhallTelemetryEvent(db, {
          accountId: account.id,
          dropId: session.dropId,
          eventType: "watch_time",
          watchTimeSeconds: normalizedWatchTime,
          metadata: {
            source: "drop",
            surface: "watch",
            qualityMode: input.qualityMode,
            qualityLevel: input.qualityLevel
          },
          occurredAt: nowIso
        });
      }

      if (input.qualityMode || input.qualityLevel || input.qualityReason) {
        appendTownhallTelemetryEvent(db, {
          accountId: account.id,
          dropId: session.dropId,
          eventType: "quality_change",
          metadata: {
            source: "drop",
            surface: "watch",
            action: "toggle",
            qualityMode: input.qualityMode,
            qualityLevel: input.qualityLevel,
            qualityReason: input.qualityReason
          },
          occurredAt: nowIso
        });
      }

      if (input.rebufferReason) {
        appendTownhallTelemetryEvent(db, {
          accountId: account.id,
          dropId: session.dropId,
          eventType: "rebuffer",
          metadata: {
            source: "drop",
            surface: "watch",
            action: "toggle",
            qualityMode: input.qualityMode,
            qualityLevel: input.qualityLevel,
            rebufferReason: input.rebufferReason
          },
          occurredAt: nowIso
        });
      }

      if (session.completionPercent > 0) {
        appendTownhallTelemetryEvent(db, {
          accountId: account.id,
          dropId: session.dropId,
          eventType: "completion",
          completionPercent: session.completionPercent,
          metadata: {
            source: "drop",
            surface: "watch",
            action: "complete",
            qualityMode: session.lastQualityMode ?? undefined,
            qualityLevel: session.lastQualityLevel ?? undefined
          },
          occurredAt: nowIso
        });
      }

      appendTownhallTelemetryEvent(db, {
        accountId: account.id,
        dropId: session.dropId,
        eventType: "access_complete",
        completionPercent: session.completionPercent,
        metadata: {
          source: "drop",
          surface: "watch",
          action: "complete",
          qualityMode: session.lastQualityMode ?? undefined,
          qualityLevel: session.lastQualityLevel ?? undefined
        },
        occurredAt: nowIso
      });

      return {
        persist: true,
        result: {
          ok: true,
          session: toWatchSessionSnapshot(session)
        }
      };
    });
  },

  async getCollectInventory(
    accountId: string | null,
    lane: CollectMarketLane = "all"
  ): Promise<{ lane: CollectMarketLane; listings: CollectInventoryListing[] }> {
    return withDatabase(async (db) => ({
      persist: false,
      result: buildCollectInventoryView(db, accountId, lane)
    }));
  },

  async getCollectDropOffers(
    dropId: string,
    accountId: string | null
  ): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null> {
    return withDatabase(async (db) => ({
      persist: false,
      result: buildCollectDropOffersView(db, dropId, accountId)
    }));
  },

  async listCollectWorldBundles(accountId: string): Promise<WorldCollectBundleSnapshot[]> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: []
        };
      }

      const snapshots = db.catalog.worlds
        .map((world) => buildWorldCollectBundleSnapshot(db, account.id, world))
        .sort((a, b) => a.world.title.localeCompare(b.world.title));

      return {
        persist: false,
        result: snapshots
      };
    });
  },

  async getCollectWorldBundlesForWorld(
    accountId: string,
    worldId: string
  ): Promise<WorldCollectBundleSnapshot | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      const world = findWorldById(db, worldId);
      if (!account || !world) {
        return {
          persist: false,
          result: null
        };
      }

      return {
        persist: false,
        result: buildWorldCollectBundleSnapshot(db, account.id, world)
      };
    });
  },

  async getCollectWorldUpgradePreview(
    accountId: string,
    worldId: string,
    targetBundleType: WorldCollectBundleType
  ): Promise<WorldCollectUpgradePreview | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      const world = findWorldById(db, worldId);
      if (!account || !world) {
        return {
          persist: false,
          result: null
        };
      }

      const snapshot = buildWorldCollectBundleSnapshot(db, account.id, world);
      const target = snapshot.bundles.find(
        (entry) => entry.bundle.bundleType === targetBundleType
      );
      if (!target) {
        return {
          persist: false,
          result: null
        };
      }

      return {
        persist: false,
        result: target.upgradePreview
      };
    });
  },

  async collectWorldBundle(input: {
    accountId: string;
    worldId: string;
    bundleType: WorldCollectBundleType;
  }): Promise<WorldCollectBundleCollectResult | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, input.accountId);
      const world = findWorldById(db, input.worldId);
      if (!account || !world) {
        return {
          persist: false,
          result: null
        };
      }

      const snapshot = buildWorldCollectBundleSnapshot(db, account.id, world);
      const targetOption = snapshot.bundles.find(
        (entry) => entry.bundle.bundleType === input.bundleType
      );
      if (!targetOption || !targetOption.upgradePreview.eligible) {
        return {
          persist: false,
          result: null
        };
      }

      const nowIso = new Date().toISOString();
      if (snapshot.activeOwnership) {
        const existing = db.worldCollectOwnerships.find(
          (ownership) => ownership.id === snapshot.activeOwnership?.id
        );
        if (existing) {
          existing.status = "upgraded";
          existing.upgradedToBundleType = targetOption.bundle.bundleType;
          existing.upgradedAt = nowIso;
        }
      }

      const record: WorldCollectOwnershipRecord = {
        id: `wown_${randomUUID()}`,
        accountId: account.id,
        worldId: world.id,
        bundleType: targetOption.bundle.bundleType,
        status: "active",
        purchasedAt: nowIso,
        amountPaidUsd: clampCurrencyAmount(targetOption.upgradePreview.totalUsd),
        previousOwnershipCreditUsd: clampCurrencyAmount(
          targetOption.upgradePreview.previousOwnershipCreditUsd
        ),
        prorationStrategy: targetOption.upgradePreview.prorationStrategy,
        upgradedToBundleType: null,
        upgradedAt: null
      };

      db.worldCollectOwnerships.unshift(record);
      trimWorldCollectOwnerships(db);

      return {
        persist: true,
        result: {
          worldId: world.id,
          bundleType: record.bundleType,
          ownership: toWorldCollectOwnership(record),
          upgradePreview: targetOption.upgradePreview
        }
      };
    });
  },

  async getCollectIntegritySnapshot(input?: {
    dropId?: string | null;
    limit?: number;
  }): Promise<CollectIntegritySnapshot> {
    return withDatabase(async (db) => ({
      persist: false,
      result: buildCollectIntegritySnapshot(db, input)
    }));
  },

  async recordCollectEnforcementSignal(input: {
    signalType: CollectEnforcementSignalType;
    reason: string;
    dropId?: string | null;
    offerId?: string | null;
    accountId?: string | null;
    occurredAt?: string;
  }): Promise<CollectEnforcementSignal> {
    return withDatabase(async (db) => ({
      persist: true,
      result: toCollectEnforcementSignal(recordCollectEnforcementSignalInDatabase(db, input))
    }));
  },

  async submitCollectResaleOffer(input: {
    accountId: string;
    dropId: string;
    amountUsd: number;
  }): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, input.accountId);
      const drop = findDropById(db, input.dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const listingType = resolveCollectListingTypeByDropId(db.catalog.drops, drop.id);
      if (listingType !== "resale") {
        recordCollectEnforcementSignalInDatabase(db, {
          signalType: "invalid_listing_action_blocked",
          dropId: drop.id,
          accountId: account.id,
          reason: "resale offer submission attempted on non-resale drop"
        });
        return {
          persist: true,
          result: null
        };
      }

      const normalizedAmount = normalizePositiveAmountUsd(input.amountUsd);
      if (normalizedAmount === null) {
        recordCollectEnforcementSignalInDatabase(db, {
          signalType: "invalid_amount_rejected",
          dropId: drop.id,
          accountId: account.id,
          reason: "resale offer amount must be positive"
        });
        return {
          persist: true,
          result: null
        };
      }

      db.collectOffers.unshift(
        createSubmittedOfferRecord({
          account,
          drop,
          listingType: "resale",
          amountUsd: normalizedAmount,
          executionVisibility: "private"
        })
      );
      trimCollectOffers(db);

      return {
        persist: true,
        result: buildCollectDropOffersView(db, drop.id, account.id)
      };
    });
  },

  async submitCollectAuctionBid(input: {
    accountId: string;
    dropId: string;
    amountUsd: number;
  }): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, input.accountId);
      const drop = findDropById(db, input.dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const listingType = resolveCollectListingTypeByDropId(db.catalog.drops, drop.id);
      if (listingType !== "auction") {
        recordCollectEnforcementSignalInDatabase(db, {
          signalType: "invalid_listing_action_blocked",
          dropId: drop.id,
          accountId: account.id,
          reason: "auction bid submission attempted on non-auction drop"
        });
        return {
          persist: true,
          result: null
        };
      }

      const normalizedAmount = normalizePositiveAmountUsd(input.amountUsd);
      if (normalizedAmount === null) {
        recordCollectEnforcementSignalInDatabase(db, {
          signalType: "invalid_amount_rejected",
          dropId: drop.id,
          accountId: account.id,
          reason: "auction bid amount must be positive"
        });
        return {
          persist: true,
          result: null
        };
      }

      db.collectOffers.unshift(
        createSubmittedOfferRecord({
          account,
          drop,
          listingType: "auction",
          amountUsd: normalizedAmount,
          executionVisibility: "public"
        })
      );
      trimCollectOffers(db);

      return {
        persist: true,
        result: buildCollectDropOffersView(db, drop.id, account.id)
      };
    });
  },

  async awardCollectAuctionBid(input: {
    accountId: string;
    dropId: string;
  }): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, input.accountId);
      const drop = findDropById(db, input.dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const listingType = resolveCollectListingTypeByDropId(db.catalog.drops, drop.id);
      if (listingType !== "auction" || !canModerateCollectOfferTransition(account, drop)) {
        recordCollectEnforcementSignalInDatabase(db, {
          signalType: "unauthorized_transition_blocked",
          dropId: drop.id,
          accountId: account.id,
          reason: "auction award attempted without creator authorization"
        });
        return {
          persist: true,
          result: null
        };
      }

      const offers = getDropAuctionOffers(db, drop.id);
      const hasLockedAuctionWinner = offers.some(
        (offer) => offer.state === "accepted" || offer.state === "settled"
      );
      if (hasLockedAuctionWinner) {
        recordCollectEnforcementSignalInDatabase(db, {
          signalType: "reaward_blocked",
          dropId: drop.id,
          accountId: account.id,
          reason: "auction award attempted while winner already accepted or settled"
        });
        return {
          persist: true,
          result: null
        };
      }

      const openCandidates = rankAuctionCandidates(
        offers.filter((offer) => offer.state === "offer_submitted" || offer.state === "countered")
      );
      const winner = openCandidates[0];
      if (!winner) {
        return {
          persist: false,
          result: null
        };
      }

      const accepted = applyCollectOfferAction(
        {
          id: winner.id,
          dropId: winner.dropId,
          listingType: winner.listingType,
          amountUsd: winner.amountUsd,
          state: winner.state,
          actorHandle: account.handle,
          createdAt: winner.createdAt,
          updatedAt: winner.updatedAt,
          expiresAt: winner.expiresAt,
          executionVisibility: winner.executionVisibility,
          executionPriceUsd: winner.executionPriceUsd
        },
        "accept_offer",
        {
          updatedAt: new Date().toISOString()
        }
      );

      winner.state = accepted.state;
      winner.updatedAt = accepted.updatedAt;
      winner.expiresAt = accepted.expiresAt;
      winner.amountUsd = accepted.amountUsd;

      return {
        persist: true,
        result: buildCollectDropOffersView(db, drop.id, account.id)
      };
    });
  },

  async settleCollectAuctionBid(input: {
    accountId: string;
    dropId: string;
    executionPriceUsd?: number;
  }): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, input.accountId);
      const drop = findDropById(db, input.dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const listingType = resolveCollectListingTypeByDropId(db.catalog.drops, drop.id);
      if (listingType !== "auction" || !canModerateCollectOfferTransition(account, drop)) {
        recordCollectEnforcementSignalInDatabase(db, {
          signalType: "unauthorized_transition_blocked",
          dropId: drop.id,
          accountId: account.id,
          reason: "auction settle attempted without creator authorization"
        });
        return {
          persist: true,
          result: null
        };
      }

      const acceptedOffer = getDropAuctionOffers(db, drop.id).find(
        (offer) => offer.state === "accepted"
      );
      if (!acceptedOffer) {
        recordCollectEnforcementSignalInDatabase(db, {
          signalType: "invalid_transition_blocked",
          dropId: drop.id,
          accountId: account.id,
          reason: "auction settle attempted without accepted offer"
        });
        return {
          persist: true,
          result: null
        };
      }

      const settled = applyCollectOfferAction(
        {
          id: acceptedOffer.id,
          dropId: acceptedOffer.dropId,
          listingType: acceptedOffer.listingType,
          amountUsd: acceptedOffer.amountUsd,
          state: acceptedOffer.state,
          actorHandle: account.handle,
          createdAt: acceptedOffer.createdAt,
          updatedAt: acceptedOffer.updatedAt,
          expiresAt: acceptedOffer.expiresAt,
          executionVisibility: acceptedOffer.executionVisibility,
          executionPriceUsd: acceptedOffer.executionPriceUsd
        },
        "settle_offer",
        {
          updatedAt: new Date().toISOString()
        }
      );

      let normalizedExecution = acceptedOffer.amountUsd;
      if (input.executionPriceUsd !== undefined) {
        const explicitExecution = normalizePositiveAmountUsd(input.executionPriceUsd);
        if (explicitExecution === null) {
          recordCollectEnforcementSignalInDatabase(db, {
            signalType: "invalid_settle_price_rejected",
            dropId: drop.id,
            offerId: acceptedOffer.id,
            accountId: account.id,
            reason: "auction settle execution price must be positive"
          });
          return {
            persist: true,
            result: null
          };
        }
        normalizedExecution = explicitExecution;
      }

      acceptedOffer.state = settled.state;
      acceptedOffer.updatedAt = settled.updatedAt;
      acceptedOffer.expiresAt = settled.expiresAt;
      acceptedOffer.amountUsd = settled.amountUsd;
      acceptedOffer.executionPriceUsd = normalizedExecution;
      acceptedOffer.executionVisibility = "public";

      return {
        persist: true,
        result: buildCollectDropOffersView(db, drop.id, account.id)
      };
    });
  },

  async fallbackCollectAuctionBid(input: {
    accountId: string;
    dropId: string;
  }): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, input.accountId);
      const drop = findDropById(db, input.dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const listingType = resolveCollectListingTypeByDropId(db.catalog.drops, drop.id);
      if (listingType !== "auction" || !canModerateCollectOfferTransition(account, drop)) {
        recordCollectEnforcementSignalInDatabase(db, {
          signalType: "unauthorized_transition_blocked",
          dropId: drop.id,
          accountId: account.id,
          reason: "auction fallback attempted without creator authorization"
        });
        return {
          persist: true,
          result: null
        };
      }

      const offers = getDropAuctionOffers(db, drop.id);
      const acceptedOffer = offers.find((offer) => offer.state === "accepted");
      if (!acceptedOffer) {
        recordCollectEnforcementSignalInDatabase(db, {
          signalType: "invalid_transition_blocked",
          dropId: drop.id,
          accountId: account.id,
          reason: "auction fallback attempted without accepted offer"
        });
        return {
          persist: true,
          result: null
        };
      }

      const expired = applyCollectOfferAction(
        {
          id: acceptedOffer.id,
          dropId: acceptedOffer.dropId,
          listingType: acceptedOffer.listingType,
          amountUsd: acceptedOffer.amountUsd,
          state: acceptedOffer.state,
          actorHandle: account.handle,
          createdAt: acceptedOffer.createdAt,
          updatedAt: acceptedOffer.updatedAt,
          expiresAt: acceptedOffer.expiresAt,
          executionVisibility: acceptedOffer.executionVisibility,
          executionPriceUsd: acceptedOffer.executionPriceUsd
        },
        "expire_offer",
        {
          updatedAt: new Date().toISOString()
        }
      );

      acceptedOffer.state = expired.state;
      acceptedOffer.updatedAt = expired.updatedAt;
      acceptedOffer.expiresAt = expired.expiresAt;
      acceptedOffer.amountUsd = expired.amountUsd;

      const fallbackCandidate = rankAuctionCandidates(
        offers.filter(
          (offer) =>
            offer.id !== acceptedOffer.id &&
            (offer.state === "offer_submitted" || offer.state === "countered")
        )
      )[0];

      if (fallbackCandidate) {
        const acceptedFallback = applyCollectOfferAction(
          {
            id: fallbackCandidate.id,
            dropId: fallbackCandidate.dropId,
            listingType: fallbackCandidate.listingType,
            amountUsd: fallbackCandidate.amountUsd,
            state: fallbackCandidate.state,
            actorHandle: account.handle,
            createdAt: fallbackCandidate.createdAt,
            updatedAt: fallbackCandidate.updatedAt,
            expiresAt: fallbackCandidate.expiresAt,
            executionVisibility: fallbackCandidate.executionVisibility,
            executionPriceUsd: fallbackCandidate.executionPriceUsd
          },
          "accept_offer",
          {
            updatedAt: new Date().toISOString()
          }
        );

        fallbackCandidate.state = acceptedFallback.state;
        fallbackCandidate.updatedAt = acceptedFallback.updatedAt;
        fallbackCandidate.expiresAt = acceptedFallback.expiresAt;
        fallbackCandidate.amountUsd = acceptedFallback.amountUsd;
      }

      return {
        persist: true,
        result: buildCollectDropOffersView(db, drop.id, account.id)
      };
    });
  },

  async transitionCollectOffer(input: {
    accountId: string;
    offerId: string;
    action: CollectOfferAction;
    executionPriceUsd?: number;
  }): Promise<{ listing: CollectInventoryListing; offers: CollectOffer[] } | null> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, input.accountId);
      if (!account) {
        return {
          persist: false,
          result: null
        };
      }

      const offer = db.collectOffers.find((entry) => entry.id === input.offerId) ?? null;
      if (!offer) {
        return {
          persist: false,
          result: null
        };
      }

      if (!canApplyCollectOfferAction(offer.state, input.action)) {
        recordCollectEnforcementSignalInDatabase(db, {
          signalType: "invalid_transition_blocked",
          dropId: offer.dropId,
          offerId: offer.id,
          accountId: account.id,
          reason: `invalid offer transition requested: ${offer.state} -> ${input.action}`
        });
        return {
          persist: true,
          result: null
        };
      }

      if (!canTransitionCollectOffer(db, account, offer, input.action)) {
        recordCollectEnforcementSignalInDatabase(db, {
          signalType: "unauthorized_transition_blocked",
          dropId: offer.dropId,
          offerId: offer.id,
          accountId: account.id,
          reason: `offer transition blocked for account role: ${input.action}`
        });
        return {
          persist: true,
          result: null
        };
      }

      const actorHandle = account.handle;
      const transitioned = applyCollectOfferAction(
        {
          id: offer.id,
          dropId: offer.dropId,
          listingType: offer.listingType,
          amountUsd: offer.amountUsd,
          state: offer.state,
          actorHandle,
          createdAt: offer.createdAt,
          updatedAt: offer.updatedAt,
          expiresAt: offer.expiresAt,
          executionVisibility: offer.executionVisibility,
          executionPriceUsd: offer.executionPriceUsd
        },
        input.action,
        {
          updatedAt: new Date().toISOString()
        }
      );

      offer.state = transitioned.state;
      offer.updatedAt = transitioned.updatedAt;
      offer.expiresAt = transitioned.expiresAt;
      offer.amountUsd = transitioned.amountUsd;

      if (input.action === "settle_offer") {
        let normalizedExecution = offer.amountUsd;
        if (input.executionPriceUsd !== undefined) {
          const explicitExecution = normalizePositiveAmountUsd(input.executionPriceUsd);
          if (explicitExecution === null) {
            recordCollectEnforcementSignalInDatabase(db, {
              signalType: "invalid_settle_price_rejected",
              dropId: offer.dropId,
              offerId: offer.id,
              accountId: account.id,
              reason: "offer settle execution price must be positive"
            });
            return {
              persist: true,
              result: null
            };
          }
          normalizedExecution = explicitExecution;
        }
        offer.executionPriceUsd = normalizedExecution;
        offer.executionVisibility = offer.listingType === "resale" ? "private" : "public";

        /* ── resale settlement: quote → ledger → ownership transfer → notifications ── */
        if (offer.listingType === "resale") {
          const drop = findDropById(db, offer.dropId);
          if (drop) {
            const buyerAccount = findAccountById(db, offer.accountId);
            const settledAt = new Date().toISOString();

            // Resolve the original creator (royalty recipient) from the drop's studio
            const creatorAccount = findAccountByHandle(db, drop.studioHandle);
            const creatorAccountId = creatorAccount?.id ?? null;

            // Resolve the seller: the current owner of the drop (NOT the caller — the
            // caller is the creator who moderates the settlement)
            const sellerOwnership = db.ownerships.find(
              (entry) => entry.dropId === drop.id
            );
            const sellerAccountId = sellerOwnership?.accountId ?? account.id;

            // Compute the resale quote — honors per-drop royalty override if set
            const resaleQuote = buildResaleSettlementQuote({
              executionPriceUsd: normalizedExecution,
              processingUsd: PROCESSING_FEE_USD,
              creatorAccountId,
              sellerAccountId,
              creatorRoyaltyOverrideBps: drop.resaleRoyaltyBps ?? null
            });

            // Create a receipt for the buyer
            const receiptId = `rcpt_${randomUUID()}`;
            const receipt: PurchaseReceipt = {
              id: receiptId,
              accountId: offer.accountId,
              dropId: drop.id,
              amountUsd: resaleQuote.totalUsd,
              subtotalUsd: resaleQuote.subtotalUsd,
              processingUsd: resaleQuote.processingUsd,
              commissionUsd: resaleQuote.commissionUsd,
              payoutUsd: resaleQuote.payoutUsd,
              quoteEngineVersion: resaleQuote.engineVersion,
              ledgerTransactionId: null,
              lineItems: [],
              status: "completed",
              purchasedAt: settledAt
            };

            // Record ledger entries
            const ledger = appendLedgerEntries(db, {
              kind: "resale",
              accountId: offer.accountId,
              dropId: drop.id,
              paymentId: null,
              receiptId,
              quote: resaleQuote,
              createdAt: settledAt
            });
            receipt.ledgerTransactionId = ledger.transaction.id;
            receipt.lineItems = ledger.lineItems;
            db.receipts.unshift(receipt);

            // Transfer ownership: revoke seller's certificate and ownership
            const sellerOwnershipIndex = db.ownerships.findIndex(
              (entry) => entry.accountId === sellerAccountId && entry.dropId === drop.id
            );
            if (sellerOwnershipIndex >= 0) {
              db.ownerships.splice(sellerOwnershipIndex, 1);
            }
            const sellerCertificate = db.certificates.find(
              (entry) => entry.ownerAccountId === sellerAccountId && entry.dropId === drop.id && entry.status === "verified"
            );
            if (sellerCertificate) {
              sellerCertificate.status = "revoked";
            }

            // Issue new certificate and ownership for buyer
            if (buyerAccount) {
              const newCertificateId = `cert_${randomUUID()}`;
              db.certificates.push({
                id: newCertificateId,
                dropId: drop.id,
                dropTitle: drop.title,
                ownerHandle: buyerAccount.handle,
                issuedAt: settledAt,
                receiptId,
                status: "verified",
                ownerAccountId: buyerAccount.id
              });
              db.ownerships.unshift({
                accountId: buyerAccount.id,
                dropId: drop.id,
                certificateId: newCertificateId,
                receiptId,
                acquiredAt: settledAt
              });
            }

            // Emit notifications to all ecosystem participants
            // 1. Seller: your resale completed
            emitNotification(
              db,
              sellerAccountId,
              "resale_completed",
              "Resale completed",
              `Your listing for "${drop.title}" has been sold for $${normalizedExecution.toFixed(2)}.`,
              `/my-collection`
            );

            // 2. Buyer: drop collected via resale
            if (buyerAccount) {
              emitNotification(
                db,
                buyerAccount.id,
                "drop_collected",
                "Drop collected",
                `You acquired "${drop.title}" via resale.`,
                `/my-collection`
              );
            }

            // 3. Creator: royalty earned from resale
            if (creatorAccountId) {
              const royaltyLine = resaleQuote.lineItems.find((li) => li.kind === "creator_royalty_resale");
              const royaltyAmount = royaltyLine?.amountUsd ?? 0;
              if (royaltyAmount > 0) {
                emitNotification(
                  db,
                  creatorAccountId,
                  "resale_royalty_earned",
                  "Royalty earned",
                  `You earned $${royaltyAmount.toFixed(2)} in royalties from a resale of "${drop.title}".`,
                  `/workshop`
                );
              }
            }
          }
        }
      }

      return {
        persist: true,
        result: buildCollectDropOffersView(db, offer.dropId, account.id)
      };
    });
  },

  async getTownhallPosts(
    accountId: string | null,
    options?: {
      limit?: number;
      filter?: TownhallPostsFilter;
    }
  ): Promise<TownhallPostsSnapshot> {
    return withDatabase<TownhallPostsSnapshot>(async (db) => {
      const viewerAccount = accountId ? findAccountById(db, accountId) : null;
      const normalizedFilter = isTownhallPostsFilter(options?.filter ?? "all")
        ? (options?.filter ?? "all")
        : "all";

      return {
        persist: false,
        result: buildTownhallPostsSnapshot(db, viewerAccount?.id ?? null, {
          limit: options?.limit,
          filter: normalizedFilter
        })
      };
    });
  },

  async getTownhallPost(
    accountId: string | null,
    postId: string
  ): Promise<TownhallPost | null> {
    return withDatabase<TownhallPost | null>(async (db): Promise<TownhallPostMutationResult> => {
      const viewerAccount = accountId ? findAccountById(db, accountId) : null;
      const post = findTownhallPostById(db, postId);
      if (!post) {
        return {
          persist: false,
          result: null
        };
      }

      if (!canAccountViewTownhallPost(viewerAccount, post)) {
        return {
          persist: false,
          result: null
        };
      }

      return {
        persist: false,
        result: toTownhallPost(db, post, accountHandleLookup(db), viewerAccount)
      };
    });
  },

  async createTownhallPost(
    accountId: string,
    input: {
      body: string;
      linkedObject?: TownhallPostLinkedObjectInput | null;
    }
  ): Promise<TownhallPost | null> {
    return withDatabase<TownhallPost | null>(async (db): Promise<TownhallPostMutationResult> => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: null
        };
      }

      const normalizedBody = normalizeTownhallPostBody(input.body);
      if (!normalizedBody) {
        return {
          persist: false,
          result: null
        };
      }

      const linkedObject = resolveTownhallPostLinkedObjectRecord(db, input.linkedObject);
      if (input.linkedObject && !linkedObject) {
        return {
          persist: false,
          result: null
        };
      }

      const record: TownhallPostRecord = {
        id: `post_${randomUUID()}`,
        accountId: account.id,
        body: normalizedBody,
        createdAt: new Date().toISOString(),
        visibility: "visible",
        reportCount: 0,
        reportedAt: null,
        moderatedAt: null,
        moderatedByAccountId: null,
        appealRequestedAt: null,
        appealRequestedByAccountId: null,
        linkedObjectKind: linkedObject?.kind ?? null,
        linkedObjectId: linkedObject?.id ?? null,
        linkedObjectLabel: linkedObject?.label ?? null,
        linkedObjectHref: linkedObject?.href ?? null
      };

      db.townhallPosts.unshift(record);
      trimTownhallPosts(db);

      return {
        persist: true,
        result: toTownhallPost(db, record, accountHandleLookup(db), account)
      };
    });
  },

  async saveTownhallPost(accountId: string, postId: string): Promise<TownhallPost | null> {
    return withDatabase<TownhallPost | null>(async (db): Promise<TownhallPostMutationResult> => {
      const account = findAccountById(db, accountId);
      const post = findTownhallPostById(db, postId);
      if (!account || !post || !canAccountViewTownhallPost(account, post)) {
        return {
          persist: false,
          result: null
        };
      }

      const alreadySaved = db.townhallPostSaves.some(
        (entry) => entry.accountId === account.id && entry.postId === post.id
      );
      if (alreadySaved) {
        return {
          persist: false,
          result: toTownhallPost(db, post, accountHandleLookup(db), account)
        };
      }

      db.townhallPostSaves.unshift({
        accountId: account.id,
        postId: post.id,
        savedAt: new Date().toISOString()
      } satisfies TownhallPostSaveRecord);
      trimTownhallPostSaves(db);

      return {
        persist: true,
        result: toTownhallPost(db, post, accountHandleLookup(db), account)
      };
    });
  },

  async unsaveTownhallPost(accountId: string, postId: string): Promise<TownhallPost | null> {
    return withDatabase<TownhallPost | null>(async (db): Promise<TownhallPostMutationResult> => {
      const account = findAccountById(db, accountId);
      const post = findTownhallPostById(db, postId);
      if (!account || !post || !canAccountViewTownhallPost(account, post)) {
        return {
          persist: false,
          result: null
        };
      }

      const nextSaves = db.townhallPostSaves.filter(
        (entry) => !(entry.accountId === account.id && entry.postId === post.id)
      );
      const didChange = nextSaves.length !== db.townhallPostSaves.length;
      if (didChange) {
        db.townhallPostSaves = nextSaves;
      }

      return {
        persist: didChange,
        result: toTownhallPost(db, post, accountHandleLookup(db), account)
      };
    });
  },

  async followTownhallPost(accountId: string, postId: string): Promise<TownhallPost | null> {
    return withDatabase<TownhallPost | null>(async (db): Promise<TownhallPostMutationResult> => {
      const account = findAccountById(db, accountId);
      const post = findTownhallPostById(db, postId);
      if (!account || !post || !canAccountViewTownhallPost(account, post)) {
        return {
          persist: false,
          result: null
        };
      }

      const alreadyFollowing = db.townhallPostFollows.some(
        (entry) => entry.accountId === account.id && entry.postId === post.id
      );
      if (alreadyFollowing) {
        return {
          persist: false,
          result: toTownhallPost(db, post, accountHandleLookup(db), account)
        };
      }

      db.townhallPostFollows.unshift({
        accountId: account.id,
        postId: post.id,
        followedAt: new Date().toISOString()
      } satisfies TownhallPostFollowRecord);
      trimTownhallPostFollows(db);

      return {
        persist: true,
        result: toTownhallPost(db, post, accountHandleLookup(db), account)
      };
    });
  },

  async unfollowTownhallPost(accountId: string, postId: string): Promise<TownhallPost | null> {
    return withDatabase<TownhallPost | null>(async (db): Promise<TownhallPostMutationResult> => {
      const account = findAccountById(db, accountId);
      const post = findTownhallPostById(db, postId);
      if (!account || !post || !canAccountViewTownhallPost(account, post)) {
        return {
          persist: false,
          result: null
        };
      }

      const nextFollows = db.townhallPostFollows.filter(
        (entry) => !(entry.accountId === account.id && entry.postId === post.id)
      );
      const didChange = nextFollows.length !== db.townhallPostFollows.length;
      if (didChange) {
        db.townhallPostFollows = nextFollows;
      }

      return {
        persist: didChange,
        result: toTownhallPost(db, post, accountHandleLookup(db), account)
      };
    });
  },

  async recordTownhallPostShare(
    accountId: string,
    postId: string,
    channel: TownhallShareChannel
  ): Promise<TownhallPost | null> {
    return withDatabase<TownhallPost | null>(async (db): Promise<TownhallPostMutationResult> => {
      const account = findAccountById(db, accountId);
      const post = findTownhallPostById(db, postId);
      if (!account || !post || !canAccountViewTownhallPost(account, post) || !isTownhallShareChannel(channel)) {
        return {
          persist: false,
          result: null
        };
      }

      db.townhallPostShares.unshift({
        id: `pshr_${randomUUID()}`,
        accountId: account.id,
        postId: post.id,
        channel,
        sharedAt: new Date().toISOString()
      } satisfies TownhallPostShareRecord);
      trimTownhallPostShares(db);

      return {
        persist: true,
        result: toTownhallPost(db, post, accountHandleLookup(db), account)
      };
    });
  },

  async reportTownhallPost(accountId: string, postId: string): Promise<TownhallPost | null> {
    return withDatabase<TownhallPost | null>(async (db): Promise<TownhallPostMutationResult> => {
      const account = findAccountById(db, accountId);
      const post = findTownhallPostById(db, postId);
      if (!account || !post) {
        return {
          persist: false,
          result: null
        };
      }

      if (!canAccountReportTownhallPost(account, post)) {
        return {
          persist: false,
          result: toTownhallPost(db, post, accountHandleLookup(db), account)
        };
      }

      post.reportCount += 1;
      post.reportedAt = new Date().toISOString();

      return {
        persist: true,
        result: toTownhallPost(db, post, accountHandleLookup(db), account)
      };
    });
  },

  async moderateTownhallPost(
    accountId: string,
    postId: string,
    action: "hide" | "restrict" | "delete" | "restore" | "dismiss"
  ): Promise<TownhallPost | null> {
    return withDatabase<TownhallPost | null>(async (db): Promise<TownhallPostMutationResult> => {
      const account = findAccountById(db, accountId);
      const post = findTownhallPostById(db, postId);
      if (!account || !post) {
        return {
          persist: false,
          result: null
        };
      }

      if (!canAccountModerateTownhallPost(account, post)) {
        return {
          persist: false,
          result: toTownhallPost(db, post, accountHandleLookup(db), account)
        };
      }

      if (action === "hide") {
        post.visibility = "hidden";
      } else if (action === "restrict") {
        post.visibility = "restricted";
      } else if (action === "delete") {
        post.visibility = "deleted";
      } else if (action === "restore") {
        post.visibility = "visible";
      }

      const nowIso = new Date().toISOString();
      post.moderatedAt = nowIso;
      post.moderatedByAccountId = account.id;
      post.appealRequestedAt = null;
      post.appealRequestedByAccountId = null;
      post.reportCount = 0;
      post.reportedAt = null;

      return {
        persist: true,
        result: toTownhallPost(db, post, accountHandleLookup(db), account)
      };
    });
  },

  async appealTownhallPost(accountId: string, postId: string): Promise<TownhallPost | null> {
    return withDatabase<TownhallPost | null>(async (db): Promise<TownhallPostMutationResult> => {
      const account = findAccountById(db, accountId);
      const post = findTownhallPostById(db, postId);
      if (!account || !post) {
        return {
          persist: false,
          result: null
        };
      }

      if (!canAccountAppealTownhallPost(account, post)) {
        return {
          persist: false,
          result: toTownhallPost(db, post, accountHandleLookup(db), account)
        };
      }

      post.appealRequestedAt = new Date().toISOString();
      post.appealRequestedByAccountId = account.id;

      return {
        persist: true,
        result: toTownhallPost(db, post, accountHandleLookup(db), account)
      };
    });
  },

  async getTownhallSocialSnapshot(
    accountId: string | null,
    dropIds: string[]
  ): Promise<TownhallSocialSnapshot> {
    return withDatabase<TownhallSocialSnapshot>(async (db) => {
      const viewerAccount = accountId ? findAccountById(db, accountId) : null;
      const uniqueDropIds = Array.from(new Set(dropIds.map((dropId) => dropId.trim()).filter(Boolean)));

      return {
        persist: false,
        result: buildTownhallSocialSnapshot(db, viewerAccount?.id ?? null, uniqueDropIds)
      };
    });
  },

  async getTownhallTelemetrySignals(
    dropIds: string[]
  ): Promise<Record<string, TownhallTelemetrySignals>> {
    return withDatabase<Record<string, TownhallTelemetrySignals>>(async (db) => {
      const uniqueDropIds = Array.from(new Set(dropIds.map((dropId) => dropId.trim()).filter(Boolean)));
      return {
        persist: false,
        result: buildTownhallTelemetrySignals(db, uniqueDropIds)
      };
    });
  },

  async listWatchTelemetryLogs(input: {
    accountId: string;
    dropId?: string | null;
    limit?: number;
  }): Promise<WatchTelemetryLogEntry[]> {
    return withDatabase<WatchTelemetryLogEntry[]>(async (db) => {
      const account = findAccountById(db, input.accountId);
      if (!account) {
        return {
          persist: false,
          result: []
        };
      }

      const normalizedDropId = input.dropId?.trim() || null;
      const normalizedLimit = normalizeWatchTelemetryLogLimit(input.limit);

      const logs = db.townhallTelemetryEvents
        .filter((entry) => entry.accountId === account.id)
        .filter((entry) => (normalizedDropId ? entry.dropId === normalizedDropId : true))
        .filter((entry) => entry.metadata?.surface === "watch")
        .map((entry) => toWatchTelemetryLogEntry(entry))
        .filter((entry): entry is WatchTelemetryLogEntry => entry !== null)
        .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
        .slice(0, normalizedLimit);

      return {
        persist: false,
        result: logs
      };
    });
  },

  async recordTownhallTelemetryEvent(input: {
    accountId: string | null;
    dropId: string;
    eventType: TownhallTelemetryEventType;
    watchTimeSeconds?: number;
    completionPercent?: number;
    metadata?: TownhallTelemetryMetadata;
    occurredAt?: string;
  }): Promise<boolean> {
    return withDatabase<boolean>(async (db): Promise<TownhallTelemetryMutationResult> => {
      const drop = findDropById(db, input.dropId);
      if (!drop || !isTownhallTelemetryEventType(input.eventType)) {
        return {
          persist: false,
          result: false
        };
      }

      const account = input.accountId ? findAccountById(db, input.accountId) : null;
      const normalizedWatchTime =
        input.eventType === "watch_time" || input.eventType === "drop_dwell_time"
          ? normalizeWatchTimeSeconds(input.watchTimeSeconds)
          : 0;
      const normalizedCompletion =
        input.eventType === "completion"
          ? normalizeCompletionPercent(input.completionPercent ?? 100)
          : 0;

      db.townhallTelemetryEvents.unshift({
        id: `tel_${randomUUID()}`,
        accountId: account?.id ?? null,
        dropId: drop.id,
        eventType: input.eventType,
        watchTimeSeconds: normalizedWatchTime,
        completionPercent: normalizedCompletion,
        metadata: normalizeTownhallTelemetryMetadata(input.metadata),
        occurredAt: input.occurredAt ?? new Date().toISOString()
      } satisfies TownhallTelemetryEventRecord);

      if (db.townhallTelemetryEvents.length > TOWNHALL_TELEMETRY_EVENT_LOG_LIMIT) {
        db.townhallTelemetryEvents.length = TOWNHALL_TELEMETRY_EVENT_LOG_LIMIT;
      }

      return {
        persist: true,
        result: true
      };
    });
  },

  async toggleTownhallLike(accountId: string, dropId: string): Promise<TownhallDropSocialSnapshot | null> {
    return withDatabase<TownhallDropSocialSnapshot | null>(async (db): Promise<TownhallSocialMutationResult> => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const existingIndex = db.townhallLikes.findIndex(
        (entry) => entry.accountId === account.id && entry.dropId === drop.id
      );
      if (existingIndex >= 0) {
        db.townhallLikes.splice(existingIndex, 1);
      } else {
        db.townhallLikes.unshift({
          accountId: account.id,
          dropId: drop.id,
          likedAt: new Date().toISOString()
        });
      }

      return {
        persist: true,
        result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
      };
    });
  },

  async toggleTownhallSavedDrop(
    accountId: string,
    dropId: string
  ): Promise<TownhallDropSocialSnapshot | null> {
    return withDatabase<TownhallDropSocialSnapshot | null>(async (db): Promise<TownhallSocialMutationResult> => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const existingIndex = db.savedDrops.findIndex(
        (entry) => entry.accountId === account.id && entry.dropId === drop.id
      );
      if (existingIndex >= 0) {
        db.savedDrops.splice(existingIndex, 1);
      } else {
        db.savedDrops.unshift({
          accountId: account.id,
          dropId: drop.id,
          savedAt: new Date().toISOString()
        });
      }

      return {
        persist: true,
        result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
      };
    });
  },

  async addTownhallComment(
    accountId: string,
    dropId: string,
    body: string,
    parentCommentId?: string | null
  ): Promise<TownhallDropSocialSnapshot | null> {
    return withDatabase<TownhallDropSocialSnapshot | null>(async (db): Promise<TownhallSocialMutationResult> => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop) {
        return {
          persist: false,
          result: null
        };
      }

      const normalizedBody = normalizeTownhallCommentBody(body);
      if (!normalizedBody) {
        return {
          persist: false,
          result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
        };
      }

      let normalizedParentCommentId: string | null = null;
      if (typeof parentCommentId === "string" && parentCommentId.trim()) {
        const parent = findTownhallCommentById(db, drop.id, parentCommentId.trim());
        if (!parent || parent.visibility !== "visible") {
          return {
            persist: false,
            result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
          };
        }
        normalizedParentCommentId = parent.id;
      }

      db.townhallComments.unshift({
        id: `cmt_${randomUUID()}`,
        accountId: account.id,
        dropId: drop.id,
        parentCommentId: normalizedParentCommentId,
        body: normalizedBody,
        createdAt: new Date().toISOString(),
        visibility: "visible",
        reportCount: 0,
        reportedAt: null,
        moderatedAt: null,
        moderatedByAccountId: null,
        appealRequestedAt: null,
        appealRequestedByAccountId: null
      });

      return {
        persist: true,
        result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
      };
    });
  },

  async reportTownhallComment(
    accountId: string,
    dropId: string,
    commentId: string
  ): Promise<TownhallDropSocialSnapshot | null> {
    return withDatabase<TownhallDropSocialSnapshot | null>(async (db): Promise<TownhallSocialMutationResult> => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      const comment = findTownhallCommentById(db, dropId, commentId);
      if (!account || !drop || !comment) {
        return {
          persist: false,
          result: null
        };
      }

      if (!canAccountReportTownhallComment(account, comment)) {
        return {
          persist: false,
          result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
        };
      }

      comment.reportCount += 1;
      comment.reportedAt = new Date().toISOString();

      return {
        persist: true,
        result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
      };
    });
  },

  async hideTownhallComment(
    accountId: string,
    dropId: string,
    commentId: string
  ): Promise<TownhallCommentModerationResult> {
    return withDatabase<TownhallCommentModerationResult>(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      const comment = findTownhallCommentById(db, dropId, commentId);
      if (!account || !drop || !comment) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      if (!canAccountModerateTownhallComment(account, drop, comment)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "forbidden"
          }
        };
      }

      if (comment.visibility !== "hidden") {
        comment.visibility = "hidden";
        comment.moderatedAt = new Date().toISOString();
        comment.moderatedByAccountId = account.id;
        comment.appealRequestedAt = null;
        comment.appealRequestedByAccountId = null;
      }

      return {
        persist: true,
        result: {
          ok: true,
          social: buildTownhallDropSocialSnapshot(db, drop.id, account.id)!
        }
      };
    });
  },

  async restrictTownhallComment(
    accountId: string,
    dropId: string,
    commentId: string
  ): Promise<TownhallCommentModerationResult> {
    return withDatabase<TownhallCommentModerationResult>(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      const comment = findTownhallCommentById(db, dropId, commentId);
      if (!account || !drop || !comment) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      if (!canAccountModerateTownhallComment(account, drop, comment)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "forbidden"
          }
        };
      }

      if (comment.visibility !== "restricted") {
        comment.visibility = "restricted";
        comment.moderatedAt = new Date().toISOString();
        comment.moderatedByAccountId = account.id;
        comment.appealRequestedAt = null;
        comment.appealRequestedByAccountId = null;
      }

      return {
        persist: true,
        result: {
          ok: true,
          social: buildTownhallDropSocialSnapshot(db, drop.id, account.id)!
        }
      };
    });
  },

  async deleteTownhallComment(
    accountId: string,
    dropId: string,
    commentId: string
  ): Promise<TownhallCommentModerationResult> {
    return withDatabase<TownhallCommentModerationResult>(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      const comment = findTownhallCommentById(db, dropId, commentId);
      if (!account || !drop || !comment) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      if (!canAccountModerateTownhallComment(account, drop, comment)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "forbidden"
          }
        };
      }

      if (comment.visibility !== "deleted") {
        comment.visibility = "deleted";
        comment.moderatedAt = new Date().toISOString();
        comment.moderatedByAccountId = account.id;
        comment.appealRequestedAt = null;
        comment.appealRequestedByAccountId = null;
      }

      return {
        persist: true,
        result: {
          ok: true,
          social: buildTownhallDropSocialSnapshot(db, drop.id, account.id)!
        }
      };
    });
  },

  async restoreTownhallComment(
    accountId: string,
    dropId: string,
    commentId: string
  ): Promise<TownhallCommentModerationResult> {
    return withDatabase<TownhallCommentModerationResult>(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      const comment = findTownhallCommentById(db, dropId, commentId);
      if (!account || !drop || !comment) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "not_found"
          }
        };
      }

      if (!canAccountModerateTownhallComment(account, drop, comment)) {
        return {
          persist: false,
          result: {
            ok: false,
            reason: "forbidden"
          }
        };
      }

      if (comment.visibility !== "visible") {
        comment.visibility = "visible";
        comment.moderatedAt = new Date().toISOString();
        comment.moderatedByAccountId = account.id;
        comment.appealRequestedAt = null;
        comment.appealRequestedByAccountId = null;
      }

      return {
        persist: true,
        result: {
          ok: true,
          social: buildTownhallDropSocialSnapshot(db, drop.id, account.id)!
        }
      };
    });
  },

  async appealTownhallComment(
    accountId: string,
    dropId: string,
    commentId: string
  ): Promise<TownhallDropSocialSnapshot | null> {
    return withDatabase<TownhallDropSocialSnapshot | null>(
      async (db): Promise<TownhallSocialMutationResult> => {
        const account = findAccountById(db, accountId);
        const drop = findDropById(db, dropId);
        const comment = findTownhallCommentById(db, dropId, commentId);
        if (!account || !drop || !comment) {
          return {
            persist: false,
            result: null
          };
        }

        if (!canAccountAppealTownhallComment(account, comment)) {
          return {
            persist: false,
            result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
          };
        }

        comment.appealRequestedAt = new Date().toISOString();
        comment.appealRequestedByAccountId = account.id;

        return {
          persist: true,
          result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
        };
      }
    );
  },

  async listTownhallModerationQueue(accountId: string): Promise<TownhallModerationQueueItem[]> {
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      if (!account) {
        return {
          persist: false,
          result: []
        };
      }

      return {
        persist: false,
        result: buildTownhallModerationQueue(db, account)
      };
    });
  },

  async recordTownhallShare(
    accountId: string,
    dropId: string,
    channel: TownhallShareChannel
  ): Promise<TownhallDropSocialSnapshot | null> {
    return withDatabase<TownhallDropSocialSnapshot | null>(async (db): Promise<TownhallSocialMutationResult> => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop || !isTownhallShareChannel(channel)) {
        return {
          persist: false,
          result: null
        };
      }

      db.townhallShares.unshift({
        id: `shr_${randomUUID()}`,
        accountId: account.id,
        dropId: drop.id,
        channel,
        sharedAt: new Date().toISOString()
      });

      return {
        persist: true,
        result: buildTownhallDropSocialSnapshot(db, drop.id, account.id)
      };
    });
  },

  async applyStripeWebhook(request: Request): Promise<StripeWebhookApplyResult> {
    const parsed = await parseStripeWebhook(request);
    if (parsed === "invalid_signature") {
      return {
        received: false,
        effect: "invalid_signature"
      };
    }
    if (!parsed) {
      return {
        received: true,
        effect: "ignored"
      };
    }

    const eventId = parsed.eventId;
    if (eventId) {
      return withDatabase<StripeWebhookApplyResult>(async (db) => {
        if (hasProcessedStripeWebhookEvent(db, eventId)) {
          return {
            persist: false,
            result: {
              received: true,
              effect: "ignored"
            }
          };
        }

        const applied = applyParsedStripeWebhookInDatabase(db, parsed.event);
        rememberProcessedStripeWebhookEvent(db, eventId);

        return {
          persist: true,
          result: applied.result
        };
      });
    }

    return applyParsedStripeWebhook(parsed.event);
  },

  async joinOrLeaveWorld(
    accountId: string,
    worldId: string,
    action: "join" | "leave"
  ): Promise<
    | {
        ok: true;
        membership: {
          status: "active" | "expired";
          worldId: string;
          studioHandle: string;
        };
      }
    | { ok: false; reason: "not_found" | "already_member" | "not_member" }
  > {
    return withDatabase<
      | {
          ok: true;
          membership: {
            status: "active" | "expired";
            worldId: string;
            studioHandle: string;
          };
        }
      | { ok: false; reason: "not_found" | "already_member" | "not_member" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const world = findWorldById(db, worldId);
      if (!account || !world) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_found" as const
          }
        };
      }

      const nowIso = new Date().toISOString();

      if (action === "join") {
        const existing = db.membershipEntitlements.find(
          (entitlement) =>
            entitlement.accountId === account.id &&
            entitlement.worldId === world.id &&
            entitlement.status === "active"
        );

        if (existing) {
          return {
            persist: false,
            result: {
              ok: false as const,
              reason: "already_member" as const
            }
          };
        }

        const record: MembershipEntitlementRecord = {
          id: `ment_${randomUUID()}`,
          accountId: account.id,
          studioHandle: world.studioHandle,
          worldId: world.id,
          status: "active",
          startedAt: nowIso,
          endsAt: null
        };

        db.membershipEntitlements.push(record);

        return {
          persist: true,
          result: {
            ok: true as const,
            membership: {
              status: "active" as const,
              worldId: world.id,
              studioHandle: world.studioHandle
            }
          }
        };
      }

      // action === "leave"
      const active = db.membershipEntitlements.find(
        (entitlement) =>
          entitlement.accountId === account.id &&
          entitlement.worldId === world.id &&
          entitlement.status === "active"
      );

      if (!active) {
        return {
          persist: false,
          result: {
            ok: false as const,
            reason: "not_member" as const
          }
        };
      }

      active.status = "expired";
      active.endsAt = nowIso;

      return {
        persist: true,
        result: {
          ok: true as const,
          membership: {
            status: "expired" as const,
            worldId: world.id,
            studioHandle: world.studioHandle
          }
        }
      };
    });
  },

  async hasActiveMembership(
    accountId: string,
    worldId: string
  ): Promise<boolean> {
    return withDatabase<boolean>(async (db) => {
      const account = findAccountById(db, accountId);
      const world = findWorldById(db, worldId);
      if (!account || !world) {
        return { persist: false, result: false };
      }

      return {
        persist: false,
        result: hasActiveMembershipForWorld(db, account, world)
      };
    });
  },

  async followStudio(
    accountId: string,
    studioHandle: string
  ): Promise<{ ok: true; following: boolean; followerCount: number } | { ok: false; reason: "not_found" | "already_following" }> {
    return withDatabase<
      { ok: true; following: boolean; followerCount: number } | { ok: false; reason: "not_found" | "already_following" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const studio = db.catalog.studios.find((s) => s.handle.toLowerCase() === studioHandle.toLowerCase());
      if (!account || !studio) {
        return { persist: false, result: { ok: false as const, reason: "not_found" as const } };
      }

      const existing = db.studioFollows.find(
        (f) => f.accountId === account.id && f.studioHandle.toLowerCase() === studio.handle.toLowerCase()
      );
      if (existing) {
        return { persist: false, result: { ok: false as const, reason: "already_following" as const } };
      }

      db.studioFollows.push({
        id: `sf_${randomUUID()}`,
        accountId: account.id,
        studioHandle: studio.handle,
        createdAt: new Date().toISOString()
      });

      const followerCount = db.studioFollows.filter(
        (f) => f.studioHandle.toLowerCase() === studio.handle.toLowerCase()
      ).length;

      const creatorAccount = db.accounts.find((a) => a.handle === studio.handle);
      if (creatorAccount) {
        emitNotification(
          db,
          creatorAccount.id,
          "world_update",
          `@${account.handle} followed your studio`,
          `you now have ${followerCount} follower${followerCount === 1 ? "" : "s"}.`,
          `/studio/${studio.handle}`
        );
      }

      return {
        persist: true,
        result: { ok: true as const, following: true, followerCount }
      };
    });
  },

  async unfollowStudio(
    accountId: string,
    studioHandle: string
  ): Promise<{ ok: true; following: boolean; followerCount: number } | { ok: false; reason: "not_found" | "not_following" }> {
    return withDatabase<
      { ok: true; following: boolean; followerCount: number } | { ok: false; reason: "not_found" | "not_following" }
    >(async (db) => {
      const account = findAccountById(db, accountId);
      const studio = db.catalog.studios.find((s) => s.handle.toLowerCase() === studioHandle.toLowerCase());
      if (!account || !studio) {
        return { persist: false, result: { ok: false as const, reason: "not_found" as const } };
      }

      const index = db.studioFollows.findIndex(
        (f) => f.accountId === account.id && f.studioHandle.toLowerCase() === studio.handle.toLowerCase()
      );
      if (index === -1) {
        return { persist: false, result: { ok: false as const, reason: "not_following" as const } };
      }

      db.studioFollows.splice(index, 1);

      const followerCount = db.studioFollows.filter(
        (f) => f.studioHandle.toLowerCase() === studio.handle.toLowerCase()
      ).length;

      return {
        persist: true,
        result: { ok: true as const, following: false, followerCount }
      };
    });
  },

  async isFollowingStudio(accountId: string, studioHandle: string): Promise<boolean> {
    return withDatabase<boolean>(async (db) => {
      const exists = db.studioFollows.some(
        (f) => f.accountId === accountId && f.studioHandle.toLowerCase() === studioHandle.toLowerCase()
      );
      return { persist: false, result: exists };
    });
  },

  async getStudioFollowerCount(studioHandle: string): Promise<number> {
    return withDatabase<number>(async (db) => {
      const count = db.studioFollows.filter(
        (f) => f.studioHandle.toLowerCase() === studioHandle.toLowerCase()
      ).length;
      return { persist: false, result: count };
    });
  },

  async getViewerFollowedStudioHandles(accountId: string): Promise<string[]> {
    return withDatabase<string[]>(async (db) => {
      const handles = db.studioFollows
        .filter((f) => f.accountId === accountId)
        .map((f) => f.studioHandle);
      return { persist: false, result: handles };
    });
  },

  async getViewerPatronIndicator(
    accountId: string,
    studioHandle: string
  ): Promise<{ recognitionTier: "founding" | "active"; status: "active" | "lapsed"; committedAt: string } | null> {
    return withDatabase<{
      recognitionTier: "founding" | "active";
      status: "active" | "lapsed";
      committedAt: string;
    } | null>(async (db) => {
      const patron = db.patrons.find(
        (p) => p.accountId === accountId && p.studioHandle.toLowerCase() === studioHandle.toLowerCase()
      );
      if (!patron) {
        return { persist: false, result: null };
      }
      const studioPatrons = db.patrons
        .filter((p) => p.studioHandle.toLowerCase() === studioHandle.toLowerCase() && p.status === "active")
        .sort((a, b) => a.committedAt.localeCompare(b.committedAt));
      const foundingIds = new Set(studioPatrons.slice(0, 3).map((p) => p.id));
      const recognitionTier: "founding" | "active" = foundingIds.has(patron.id) ? "founding" : "active";
      return {
        persist: false,
        result: { recognitionTier, status: patron.status, committedAt: patron.committedAt }
      };
    });
  },

  async getCollectorPublic(handle: string): Promise<{
    handle: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    roles: string[];
    memberSince: string;
    collectionCount: number;
    badgeCount: number;
    patronWorlds: Array<{ worldId: string; worldTitle: string; status: string; recognitionTier: "founding" | "active" }>;
    ownedDrops: Array<{ dropId: string; title: string; studioHandle: string; posterSrc: string | null; acquiredAt: string }>;
  } | null> {
    return withDatabase<{
      handle: string;
      displayName: string;
      avatarUrl: string | null;
      bio: string | null;
      roles: string[];
      memberSince: string;
      collectionCount: number;
      badgeCount: number;
      patronWorlds: Array<{ worldId: string; worldTitle: string; status: string; recognitionTier: "founding" | "active" }>;
      ownedDrops: Array<{ dropId: string; title: string; studioHandle: string; posterSrc: string | null; acquiredAt: string }>;
    } | null>(async (db) => {
      const account = findAccountByHandle(db, handle);
      if (!account) {
        return { persist: false, result: null };
      }

      const ownerships = db.ownerships.filter((o) => o.accountId === account.id);
      const collectionCount = ownerships.length;
      const badgeCount = db.receiptBadges.filter((b) => b.ownerAccountId === account.id).length;
      const patronRecords = db.patrons.filter((p) => p.accountId === account.id);
      const patronWorlds = patronRecords
        .map((p) => {
          const world = db.catalog.worlds.find((w) => w.studioHandle === p.studioHandle);
          if (!world) return null;
          const studioPatrons = db.patrons
            .filter((sp) => sp.studioHandle === p.studioHandle && sp.status === "active")
            .sort((a, b) => a.committedAt.localeCompare(b.committedAt));
          const foundingIds = new Set(studioPatrons.slice(0, 3).map((sp) => sp.id));
          const recognitionTier: "founding" | "active" = foundingIds.has(p.id) ? "founding" : "active";
          return { worldId: world.id, worldTitle: world.title, status: p.status, recognitionTier };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      // Resolve owned drops with poster images (public drops only).
      const ownedDrops = ownerships
        .map((o) => {
          const drop = db.catalog.drops.find((d) => d.id === o.dropId);
          if (!drop || drop.visibility !== "public") return null;
          const posterSrc = drop.previewMedia?.watch?.posterSrc ?? drop.previewMedia?.photos?.src ?? null;
          return {
            dropId: drop.id,
            title: drop.title,
            studioHandle: drop.studioHandle,
            posterSrc,
            acquiredAt: o.acquiredAt
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt));

      return {
        persist: false,
        result: {
          handle: account.handle,
          displayName: account.displayName,
          avatarUrl: account.avatarUrl ?? null,
          bio: account.bio ?? null,
          roles: account.roles,
          memberSince: account.createdAt,
          collectionCount,
          badgeCount,
          patronWorlds,
          ownedDrops
        }
      };
    });
  },

  // ── notifications ──────────────────────────────────────────────────

  async getNotificationFeed(accountId: string): Promise<NotificationFeed> {
    return withDatabase(async (db) => {
      const entries = db.notificationEntries.filter((e) => e.accountId === accountId);
      entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const unreadCount = entries.filter((e) => !e.read).length;
      return {
        persist: false,
        result: {
          entries: entries.map((e) => ({
            id: e.id,
            accountId: e.accountId,
            type: e.type as NotificationEntry["type"],
            title: e.title,
            body: e.body,
            href: e.href,
            read: e.read,
            createdAt: e.createdAt
          })),
          unreadCount
        }
      };
    });
  },

  async getNotificationUnreadCount(accountId: string): Promise<number> {
    return withDatabase(async (db) => {
      const count = db.notificationEntries.filter(
        (e) => e.accountId === accountId && !e.read
      ).length;
      return { persist: false, result: count };
    });
  },

  async markNotificationRead(accountId: string, notificationId: string): Promise<void> {
    return withDatabase(async (db) => {
      const entry = db.notificationEntries.find(
        (e) => e.id === notificationId && e.accountId === accountId
      );
      if (entry) {
        entry.read = true;
      }
      return { persist: true, result: undefined };
    });
  },

  async markAllNotificationsRead(accountId: string): Promise<void> {
    return withDatabase(async (db) => {
      for (const entry of db.notificationEntries) {
        if (entry.accountId === accountId) {
          entry.read = true;
        }
      }
      return { persist: true, result: undefined };
    });
  }
};
