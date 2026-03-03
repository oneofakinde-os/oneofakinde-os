import type {
  Certificate,
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
  CreateSessionInput,
  Drop,
  LibraryDrop,
  LibrarySnapshot,
  LiveSession,
  LiveSessionEligibility,
  MyCollectionSnapshot,
  MembershipEntitlement,
  OwnedDrop,
  PurchaseReceipt,
  Session,
  Studio,
  TownhallModerationCaseResolution,
  TownhallModerationCaseResolveResult,
  TownhallComment,
  TownhallDropSocialSnapshot,
  TownhallModerationQueueItem,
  TownhallShareChannel,
  TownhallSocialSnapshot,
  TownhallTelemetryMetadata,
  TownhallTelemetryEventType,
  TownhallTelemetrySignals,
  WorldReleaseQueueItem,
  WorldReleaseQueuePacingMode,
  WorldReleaseQueueStatus,
  WorldCollectBundleCollectResult,
  WorldCollectBundleSnapshot,
  WorldCollectBundleType,
  WorldCollectOwnership,
  WorldCollectUpgradePreview,
  World
} from "@/lib/domain/contracts";
import type { CommerceGateway } from "@/lib/domain/ports";
import type { CheckoutSessionResult, CreateCheckoutSessionInput, StripeWebhookApplyResult } from "@/lib/bff/contracts";
import {
  buildCollectInventorySnapshotFromOffers,
  listCollectInventoryByLane,
  resolveCollectListingTypeByDropId
} from "@/lib/collect/market-lanes";
import {
  buildWorldCollectBundleOptions,
  getActiveWorldCollectOwnership
} from "@/lib/collect/world-bundles";
import { sortDropsForStudioSurface, sortDropsForWorldSurface } from "@/lib/catalog/drop-curation";
import { applyCollectOfferAction, canApplyCollectOfferAction } from "@/lib/collect/offer-state-machine";
import { createCheckoutSession, parseStripeWebhook, type ParsedStripeWebhookEvent } from "@/lib/bff/payments";
import {
  type CollectEnforcementSignalRecord,
  type CollectOfferRecord,
  type LiveSessionRecord,
  type MembershipEntitlementRecord,
  type WorldReleaseQueueRecord,
  type WorldCollectOwnershipRecord,
  type WatchAccessGrantRecord,
  createAccountFromEmail,
  getDropPriceTotalUsd,
  normalizeEmail,
  withDatabase,
  type AccountRecord,
  type BffDatabase,
  type CertificateRecord,
  type PaymentRecord,
  type TownhallCommentRecord,
  type TownhallTelemetryEventRecord
} from "@/lib/bff/persistence";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const PROCESSING_FEE_USD = 1.99;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const STRIPE_WEBHOOK_EVENT_LOG_LIMIT = 1000;
const TOWNHALL_COMMENT_MAX_LENGTH = 600;
const TOWNHALL_COMMENTS_PREVIEW_LIMIT = 24;
const COLLECT_OFFERS_LOG_LIMIT = 50_000;
const COLLECT_ENFORCEMENT_SIGNAL_LOG_LIMIT = 10_000;
const COLLECT_INTEGRITY_RECENT_SIGNAL_LIMIT = 100;
const WORLD_COLLECT_OWNERSHIP_LOG_LIMIT = 20_000;
const WORLD_RELEASE_QUEUE_LOG_LIMIT = 20_000;
const WATCH_ACCESS_GRANTS_LOG_LIMIT = 20_000;
const WATCH_ACCESS_TOKEN_VERSION = 1 as const;
const WATCH_ACCESS_TOKEN_DEFAULT_TTL_SECONDS = 300;
const WATCH_ACCESS_TOKEN_MIN_TTL_SECONDS = 1;
const WATCH_ACCESS_TOKEN_MAX_TTL_SECONDS = 3600;

const COLLECT_ENFORCEMENT_SIGNAL_TYPES: CollectEnforcementSignalType[] = [
  "invalid_listing_action_blocked",
  "invalid_amount_rejected",
  "invalid_transition_blocked",
  "unauthorized_transition_blocked",
  "cross_drop_transition_blocked",
  "invalid_settle_price_rejected",
  "reaward_blocked"
];

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

function toSession(account: AccountRecord, sessionToken: string): Session {
  return {
    accountId: account.id,
    email: account.email,
    handle: account.handle,
    displayName: account.displayName,
    roles: account.roles,
    sessionToken
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

function findAccountById(db: BffDatabase, accountId: string): AccountRecord | null {
  return db.accounts.find((account) => account.id === accountId) ?? null;
}

function findDropById(db: BffDatabase, dropId: string): Drop | null {
  return db.catalog.drops.find((drop) => drop.id === dropId) ?? null;
}

function findWorldById(db: BffDatabase, worldId: string): World | null {
  return db.catalog.worlds.find((world) => world.id === worldId) ?? null;
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

function trimWorldCollectOwnerships(db: BffDatabase): void {
  if (db.worldCollectOwnerships.length > WORLD_COLLECT_OWNERSHIP_LOG_LIMIT) {
    db.worldCollectOwnerships.length = WORLD_COLLECT_OWNERSHIP_LOG_LIMIT;
  }
}

function findOwnershipByDrop(db: BffDatabase, accountId: string, dropId: string) {
  return db.ownerships.find((entry) => entry.accountId === accountId && entry.dropId === dropId) ?? null;
}

function issueOwnershipAndReceipt(
  db: BffDatabase,
  account: AccountRecord,
  drop: Drop,
  options: {
    amountUsd: number;
    receiptId?: string;
    purchasedAt?: string;
  }
): PurchaseReceipt {
  const purchasedAt = options.purchasedAt ?? new Date().toISOString();
  const receiptId = options.receiptId ?? `rcpt_${randomUUID()}`;

  const receipt: PurchaseReceipt = {
    id: receiptId,
    accountId: account.id,
    dropId: drop.id,
    amountUsd: options.amountUsd,
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

  return receipt;
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

function isTownhallTelemetryEventType(value: string): value is TownhallTelemetryEventType {
  return TOWNHALL_TELEMETRY_EVENT_SET.has(value as TownhallTelemetryEventType);
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
    value.mediaFilter === "watch" ||
    value.mediaFilter === "listen" ||
    value.mediaFilter === "read" ||
    value.mediaFilter === "photos" ||
    value.mediaFilter === "live"
  ) {
    metadata.mediaFilter = value.mediaFilter;
  }

  if (
    value.ordering === "rising" ||
    value.ordering === "newest" ||
    value.ordering === "most_collected"
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

function normalizeTownhallCommentBody(value: string): string {
  return value.trim().slice(0, TOWNHALL_COMMENT_MAX_LENGTH);
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

  return comment.accountId !== account.id;
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

  if (comment.visibility !== "hidden") {
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
  if (resolution === "hide") {
    comment.visibility = "hidden";
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
    body: record.visibility === "hidden" && !canModerate ? "comment hidden by moderation." : record.body,
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
    whatYouGet: toLiveSessionWhatYouGet(db, liveSession)
  };
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
    eligibilityRule: input.eligibilityRule
  };

  db.liveSessions.unshift(record);

  return {
    persist: true,
    result: toLiveSession(db, record)
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

const gatewayMethods: CommerceGateway = {
  async listDrops(): Promise<Drop[]> {
    return withDatabase(async (db) => ({
      persist: false,
      result: [...db.catalog.drops].sort((a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate))
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

  async listDropsByWorldId(worldId: string): Promise<Drop[]> {
    return withDatabase(async (db) => ({
      persist: false,
      result: sortDropsForWorldSurface(db.catalog.drops.filter((drop) => drop.worldId === worldId))
    }));
  },

  async getStudioByHandle(handle: string): Promise<Studio | null> {
    return withDatabase(async (db) => ({
      persist: false,
      result: db.catalog.studios.find((studio) => studio.handle === handle) ?? null
    }));
  },

  async listDropsByStudioHandle(handle: string): Promise<Drop[]> {
    return withDatabase(async (db) => ({
      persist: false,
      result: sortDropsForStudioSurface(
        db.catalog.drops.filter((drop) => drop.studioHandle === handle)
      )
    }));
  },

  async getDropById(dropId: string): Promise<Drop | null> {
    return withDatabase(async (db) => ({
      persist: false,
      result: findDropById(db, dropId)
    }));
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

      const existing = findOwnershipByDrop(db, account.id, drop.id);
      const subtotalUsd = existing ? 0 : drop.priceUsd;
      const processingUsd = existing ? 0 : PROCESSING_FEE_USD;

      return {
        persist: false,
        result: {
          drop,
          subtotalUsd,
          processingUsd,
          totalUsd: Number((subtotalUsd + processingUsd).toFixed(2)),
          currency: "USD"
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
    return withDatabase(async (db) => {
      const account = findAccountById(db, accountId);
      const drop = findDropById(db, dropId);
      if (!account || !drop) {
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
            id: existing.receiptId,
            accountId: account.id,
            dropId: drop.id,
            amountUsd: 0,
            status: "already_owned",
            purchasedAt: existing.acquiredAt
          }
        };
      }

      const amountUsd = getDropPriceTotalUsd(drop);
      const receipt = issueOwnershipAndReceipt(db, account, drop, {
        amountUsd
      });

      db.payments.unshift({
        id: `pay_${randomUUID()}`,
        provider: "manual",
        status: "succeeded",
        accountId: account.id,
        dropId: drop.id,
        amountUsd,
        currency: "USD",
        receiptId: receipt.id,
        createdAt: receipt.purchasedAt,
        updatedAt: receipt.purchasedAt
      });

      return {
        persist: true,
        result: receipt
      };
    });
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

  async getLibrary(accountId: string): Promise<LibrarySnapshot | null> {
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
        result: {
          account: {
            accountId: account.id,
            handle: account.handle,
            displayName: account.displayName
          },
          savedDrops: getSavedDrops(db, account.id)
        }
      };
    });
  },

  async getReceipt(accountId: string, receiptId: string): Promise<PurchaseReceipt | null> {
    return withDatabase(async (db) => ({
      persist: false,
      result: db.receipts.find((receipt) => receipt.accountId === accountId && receipt.id === receiptId) ?? null
    }));
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
      let account =
        db.accounts.find(
          (entry) => entry.email === email && entry.roles.length === 1 && entry.roles[0] === input.role
        ) ?? null;

      if (!account) {
        account = createAccountFromEmail(email, input.role);
        db.accounts.push(account);
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

    const amountUsd = getDropPriceTotalUsd(drop);
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
        currency: "USD"
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
        result: receipt
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

    const existing = findOwnershipByDrop(db, payment.accountId, payment.dropId);
    if (existing) {
      payment.status = "succeeded";
      payment.receiptId = existing.receiptId;
      payment.updatedAt = new Date().toISOString();
      const receipt = db.receipts.find((entry) => entry.id === existing.receiptId) ?? null;
      return {
        persist: true,
        result: receipt
      };
    }

    const receipt = issueOwnershipAndReceipt(db, account, drop, {
      amountUsd: payment.amountUsd
    });
    payment.status = "succeeded";
    payment.receiptId = receipt.id;
    payment.updatedAt = new Date().toISOString();

    return {
      persist: true,
      result: receipt
    };
  });
}

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

  const receipt = issueOwnershipAndReceipt(db, account, drop, {
    amountUsd: payment.amountUsd
  });
  payment.status = "succeeded";
  payment.receiptId = receipt.id;

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
      }

      return {
        persist: true,
        result: buildCollectDropOffersView(db, offer.dropId, account.id)
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
  }
};
