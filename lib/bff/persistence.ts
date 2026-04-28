import type {
  AccountRole,
  AuthorizedDerivativeKind,
  Certificate,
  CollectEnforcementSignalType,
  CollectListingType,
  CollectOfferState,
  DropVisibility,
  DropVisibilitySource,
  DropVersionLabel,
  Drop,
  LibraryRecallState,
  LedgerTransaction,
  LiveSessionAudienceEligibility,
  LiveSessionArtifactStatus,
  LiveSessionArtifactKind,
  LiveSessionEligibilityRule,
  LiveSessionType,
  MembershipEntitlementStatus,
  PatronCommitmentCadence,
  PatronStatus,
  PatronTierStatus,
  PreviewPolicy,
  PurchaseReceipt,
  ReceiptBadge,
  SettlementLineItem,
  SettlementQuote,
  WorkshopProState,
  WatchQualityLevel,
  WatchQualityMode,
  WatchSessionEndReason,
  WatchSessionStatus,
  WorldReleaseQueuePacingMode,
  WorldReleaseQueueStatus,
  WorldCollectBundleType,
  WorldCollectOwnershipStatus,
  WorldCollectUpgradeProrationStrategy,
  WorldConversationVisibility,
  TownhallCommentVisibility,
  TownhallPostLinkedObjectKind,
  TownhallShareChannel,
  TownhallTelemetryMetadata,
  TownhallTelemetryEventType,
  Studio,
  World
} from "@/lib/domain/contracts";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { resolveAssetUrl } from "@/lib/media/resolve-asset-url";
import { seedPreviewMediaForDrop } from "@/lib/townhall/seed-preview-media";
import { buildCollectSettlementQuote } from "@/lib/domain/quote-engine";

export type AccountRecord = {
  id: string;
  email: string;
  handle: string;
  displayName: string;
  roles: AccountRole[];
  createdAt: string;
  avatarUrl?: string;
  bio?: string;
};

export type SessionRecord = {
  token: string;
  accountId: string;
  createdAt: string;
  expiresAt: string;
};

export type OwnedDropRecord = {
  accountId: string;
  dropId: string;
  certificateId: string;
  receiptId: string;
  acquiredAt: string;
};

export type SavedDropRecord = {
  accountId: string;
  dropId: string;
  savedAt: string;
};

export type LibraryEligibilityStateRecord = {
  accountId: string;
  dropId: string;
  state: LibraryRecallState;
  updatedAt: string;
};

export type CertificateRecord = Certificate & {
  ownerAccountId: string;
};

export type ReceiptBadgeRecord = ReceiptBadge & {
  receiptId: string;
  ownerAccountId: string;
};

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export type PaymentRecord = {
  id: string;
  provider: "manual" | "stripe";
  status: PaymentStatus;
  accountId: string;
  dropId: string;
  amountUsd: number;
  quote: SettlementQuote;
  currency: "USD";
  checkoutSessionId?: string;
  checkoutUrl?: string | null;
  providerPaymentIntentId?: string;
  receiptId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StripeWebhookEventRecord = {
  eventId: string;
  processedAt: string;
};

export type WatchAccessGrantRecord = {
  tokenId: string;
  accountId: string;
  dropId: string;
  issuedAt: string;
  expiresAt: string;
  consumedAt: string | null;
};

export type WatchSessionRecord = {
  id: string;
  accountId: string;
  dropId: string;
  status: WatchSessionStatus;
  startedAt: string;
  lastHeartbeatAt: string;
  endedAt: string | null;
  endReason: WatchSessionEndReason | null;
  heartbeatCount: number;
  totalWatchTimeSeconds: number;
  completionPercent: number;
  rebufferCount: number;
  qualityStepDownCount: number;
  lastQualityMode: WatchQualityMode | null;
  lastQualityLevel: WatchQualityLevel | null;
};

export type MembershipEntitlementRecord = {
  id: string;
  accountId: string;
  studioHandle: string;
  worldId: string | null;
  status: MembershipEntitlementStatus;
  startedAt: string;
  endsAt: string | null;
};

export type PatronRecord = {
  id: string;
  accountId: string;
  handle: string;
  studioHandle: string;
  status: PatronStatus;
  committedAt: string;
  lapsedAt: string | null;
};

export type PatronCommitmentRecord = {
  id: string;
  patronId: string;
  amountCents: number;
  periodStart: string;
  periodEnd: string;
  ledgerTransactionId: string;
};

export type PatronTierConfigRecord = {
  id: string;
  studioHandle: string;
  worldId: string | null;
  title: string;
  amountCents: number;
  commitmentCadence: PatronCommitmentCadence;
  periodDays: number;
  earlyAccessWindowHours: number;
  benefitsSummary: string;
  status: PatronTierStatus;
  updatedAt: string;
  updatedByHandle: string;
};

export type LiveSessionRecord = {
  id: string;
  studioHandle: string;
  worldId: string | null;
  dropId: string | null;
  title: string;
  synopsis: string;
  startsAt: string;
  endsAt: string | null;
  mode: "live";
  eligibilityRule: LiveSessionEligibilityRule;
  type?: LiveSessionType;
  eligibility?: LiveSessionAudienceEligibility;
  spatialAudio?: boolean;
  exclusiveDropWindowDropId?: string | null;
  exclusiveDropWindowDelay?: number | null;
  capacity?: number;
};

export type LiveSessionAttendeeRecord = {
  id: string;
  liveSessionId: string;
  accountId: string;
  joinedAt: string;
};

export type LiveSessionArtifactRecord = {
  id: string;
  liveSessionId: string;
  studioHandle: string;
  worldId: string | null;
  sourceDropId: string | null;
  artifactKind: LiveSessionArtifactKind;
  title: string;
  synopsis: string;
  status: LiveSessionArtifactStatus;
  capturedAt: string;
  approvedAt: string | null;
  catalogDropId: string | null;
  approvedByHandle: string | null;
};

export type WorkshopProProfileRecord = {
  studioHandle: string;
  state: WorkshopProState;
  cycleAnchorAt: string;
  pastDueAt: string | null;
  graceEndsAt: string | null;
  lockedAt: string | null;
  updatedAt: string;
};

export type TownhallLikeRecord = {
  accountId: string;
  dropId: string;
  likedAt: string;
};

export type TownhallCommentRecord = {
  id: string;
  accountId: string;
  dropId: string;
  parentCommentId: string | null;
  body: string;
  createdAt: string;
  visibility: TownhallCommentVisibility;
  reportCount: number;
  reportedAt: string | null;
  moderatedAt: string | null;
  moderatedByAccountId: string | null;
  appealRequestedAt: string | null;
  appealRequestedByAccountId: string | null;
};

export type TownhallPostRecord = {
  id: string;
  accountId: string;
  body: string;
  createdAt: string;
  visibility: TownhallCommentVisibility;
  reportCount: number;
  reportedAt: string | null;
  moderatedAt: string | null;
  moderatedByAccountId: string | null;
  appealRequestedAt: string | null;
  appealRequestedByAccountId: string | null;
  linkedObjectKind: TownhallPostLinkedObjectKind | null;
  linkedObjectId: string | null;
  linkedObjectLabel: string | null;
  linkedObjectHref: string | null;
};

export type TownhallPostSaveRecord = {
  accountId: string;
  postId: string;
  savedAt: string;
};

export type TownhallPostFollowRecord = {
  accountId: string;
  postId: string;
  followedAt: string;
};

export type TownhallPostShareRecord = {
  id: string;
  accountId: string;
  postId: string;
  channel: TownhallShareChannel;
  sharedAt: string;
};

export type TownhallShareRecord = {
  id: string;
  accountId: string;
  dropId: string;
  channel: TownhallShareChannel;
  sharedAt: string;
};

export type TownhallTelemetryEventRecord = {
  id: string;
  accountId: string | null;
  dropId: string;
  eventType: TownhallTelemetryEventType;
  watchTimeSeconds: number;
  completionPercent: number;
  metadata: TownhallTelemetryMetadata;
  occurredAt: string;
};

export type WorldConversationMessageRecord = {
  id: string;
  worldId: string;
  accountId: string;
  parentMessageId: string | null;
  body: string;
  createdAt: string;
  visibility: WorldConversationVisibility;
  reportCount: number;
  reportedAt: string | null;
  moderatedAt: string | null;
  moderatedByAccountId: string | null;
  appealRequestedAt: string | null;
  appealRequestedByAccountId: string | null;
};

export type LiveSessionConversationMessageRecord = {
  id: string;
  liveSessionId: string;
  accountId: string;
  parentMessageId: string | null;
  body: string;
  createdAt: string;
  visibility: WorldConversationVisibility;
  reportCount: number;
  reportedAt: string | null;
  moderatedAt: string | null;
  moderatedByAccountId: string | null;
  appealRequestedAt: string | null;
  appealRequestedByAccountId: string | null;
};

export type CollectOfferRecord = {
  id: string;
  accountId: string;
  dropId: string;
  listingType: CollectListingType;
  amountUsd: number;
  state: CollectOfferState;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  executionVisibility: "public" | "private";
  executionPriceUsd: number | null;
};

export type CollectEnforcementSignalRecord = {
  id: string;
  signalType: CollectEnforcementSignalType;
  dropId: string | null;
  offerId: string | null;
  accountId: string | null;
  reason: string;
  occurredAt: string;
};

export type WorldCollectOwnershipRecord = {
  id: string;
  accountId: string;
  worldId: string;
  bundleType: WorldCollectBundleType;
  status: WorldCollectOwnershipStatus;
  purchasedAt: string;
  amountPaidUsd: number;
  previousOwnershipCreditUsd: number;
  prorationStrategy: WorldCollectUpgradeProrationStrategy;
  upgradedToBundleType: WorldCollectBundleType | null;
  upgradedAt: string | null;
};

export type WorldReleaseQueueRecord = {
  id: string;
  studioHandle: string;
  worldId: string;
  dropId: string;
  scheduledFor: string;
  pacingMode: WorldReleaseQueuePacingMode;
  pacingWindowHours: number;
  status: WorldReleaseQueueStatus;
  createdByAccountId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  canceledAt: string | null;
};

export type DropVersionRecord = {
  id: string;
  dropId: string;
  label: DropVersionLabel;
  notes: string | null;
  createdByHandle: string;
  createdAt: string;
  releasedAt: string | null;
};

export type AuthorizedDerivativeRevenueSplitRecord = {
  recipientHandle: string;
  sharePercent: number;
};

export type AuthorizedDerivativeRecord = {
  id: string;
  sourceDropId: string;
  derivativeDropId: string;
  kind: AuthorizedDerivativeKind;
  attribution: string;
  revenueSplits: AuthorizedDerivativeRevenueSplitRecord[];
  authorizedByHandle: string;
  createdAt: string;
};

export type LedgerTransactionRecord = LedgerTransaction;

export type LedgerLineItemRecord = SettlementLineItem;

export type StudioFollowRecord = {
  id: string;
  accountId: string;
  studioHandle: string;
  createdAt: string;
};

export type NotificationEntryRecord = {
  id: string;
  accountId: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationPreferencesRecord = {
  accountId: string;
  channels: Record<string, boolean>;
  mutedTypes: string[];
  digestEnabled: boolean;
};

export type TotpEnrollmentRecord = {
  id: string;
  accountId: string;
  status: "pending" | "verified" | "disabled";
  secret: string;
  totpUri: string;
  recoveryCodes: string[];
  verifiedAt: string | null;
  createdAt: string;
};

export type WalletConnectionRecord = {
  id: string;
  accountId: string;
  address: string;
  chain: "ethereum" | "tezos" | "polygon";
  label: string | null;
  status: "pending" | "verified" | "disconnected";
  challenge: string;
  verifiedAt: string | null;
  createdAt: string;
};

export type BffDatabase = {
  version: 1;
  catalog: {
    drops: Drop[];
    worlds: World[];
    studios: Studio[];
  };
  accounts: AccountRecord[];
  sessions: SessionRecord[];
  ownerships: OwnedDropRecord[];
  savedDrops: SavedDropRecord[];
  libraryEligibilityStates: LibraryEligibilityStateRecord[];
  receipts: PurchaseReceipt[];
  certificates: CertificateRecord[];
  receiptBadges: ReceiptBadgeRecord[];
  payments: PaymentRecord[];
  stripeWebhookEvents: StripeWebhookEventRecord[];
  watchAccessGrants: WatchAccessGrantRecord[];
  watchSessions: WatchSessionRecord[];
  membershipEntitlements: MembershipEntitlementRecord[];
  patrons: PatronRecord[];
  patronCommitments: PatronCommitmentRecord[];
  patronTierConfigs: PatronTierConfigRecord[];
  workshopProProfiles: WorkshopProProfileRecord[];
  liveSessions: LiveSessionRecord[];
  liveSessionAttendees: LiveSessionAttendeeRecord[];
  liveSessionArtifacts: LiveSessionArtifactRecord[];
  townhallLikes: TownhallLikeRecord[];
  townhallComments: TownhallCommentRecord[];
  townhallPosts: TownhallPostRecord[];
  townhallPostSaves: TownhallPostSaveRecord[];
  townhallPostFollows: TownhallPostFollowRecord[];
  townhallPostShares: TownhallPostShareRecord[];
  townhallShares: TownhallShareRecord[];
  townhallTelemetryEvents: TownhallTelemetryEventRecord[];
  worldConversationMessages: WorldConversationMessageRecord[];
  liveSessionConversationMessages: LiveSessionConversationMessageRecord[];
  collectOffers: CollectOfferRecord[];
  collectEnforcementSignals: CollectEnforcementSignalRecord[];
  worldCollectOwnerships: WorldCollectOwnershipRecord[];
  worldReleaseQueue: WorldReleaseQueueRecord[];
  dropVersions: DropVersionRecord[];
  authorizedDerivatives: AuthorizedDerivativeRecord[];
  ledgerTransactions: LedgerTransactionRecord[];
  ledgerLineItems: LedgerLineItemRecord[];
  studioFollows: StudioFollowRecord[];
  notificationEntries: NotificationEntryRecord[];
  notificationPreferences: NotificationPreferencesRecord[];
  totpEnrollments: TotpEnrollmentRecord[];
  walletConnections: WalletConnectionRecord[];
};

type MutationResult<T> = {
  result: T;
  persist: boolean;
};

type PersistenceBackend = "file" | "postgres";
type PostgresSeedStrategy = "demo" | "catalog" | "none";

const DATA_VERSION = 1 as const;
const DEFAULT_DB_PATH = path.join(process.cwd(), ".data", "ook-bff-db.json");
const DEFAULT_MIGRATIONS_DIR = path.join(process.cwd(), "config");
const POSTGRES_ADVISORY_LOCK_KEY = 17_021_626;

const PROCESSING_FEE_USD = 1.99;
const DAY_MS = 86_400_000;

let queue: Promise<void> = Promise.resolve();
let cachedPath = "";
let cachedDb: BffDatabase | null = null;
let postgresPool: Pool | null = null;
let migrationsBootstrappedFor = "";

export function toHandle(email: string): string {
  const base = email.split("@")[0] ?? "collector";
  return base.toLowerCase().replace(/[^a-z0-9_]/g, "") || "collector";
}

function startCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => (segment[0] ?? "").toUpperCase() + segment.slice(1))
    .join(" ");
}

function resolveDbPath(): string {
  const configured = process.env.OOK_BFF_DB_PATH?.trim();
  if (configured) {
    return path.resolve(configured);
  }

  return DEFAULT_DB_PATH;
}

function resolvePostgresConnectionString(): string {
  const connectionString =
    process.env.OOK_BFF_DATABASE_URL?.trim() ?? process.env.DATABASE_URL?.trim() ?? "";

  if (!connectionString) {
    throw new Error("DATABASE_URL (or OOK_BFF_DATABASE_URL) is required for postgres persistence backend");
  }

  return connectionString;
}

function resolveMigrationsDir(): string {
  const configured = process.env.OOK_BFF_MIGRATIONS_DIR?.trim();
  if (!configured) {
    return DEFAULT_MIGRATIONS_DIR;
  }

  return path.resolve(configured);
}

function resolveRuntimeEnvironment(): string {
  const explicit = process.env.OOK_APP_ENV?.trim().toLowerCase();
  if (explicit) {
    return explicit;
  }

  const vercel = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (vercel) {
    return vercel;
  }

  return "";
}

export function isProductionPersistenceCutover(): boolean {
  return resolveRuntimeEnvironment() === "production";
}

function resolvePersistenceBackend(): PersistenceBackend {
  const configured = process.env.OOK_BFF_PERSISTENCE_BACKEND?.trim().toLowerCase();
  const hasFilePath = Boolean(process.env.OOK_BFF_DB_PATH?.trim());
  const hasPostgresConnection = Boolean(
    (process.env.OOK_BFF_DATABASE_URL ?? process.env.DATABASE_URL)?.trim()
  );

  if (isProductionPersistenceCutover()) {
    if (configured === "file" || hasFilePath) {
      throw new Error(
        "production persistence cutover forbids file backend; remove OOK_BFF_DB_PATH and set postgres config"
      );
    }

    if (!hasPostgresConnection) {
      throw new Error(
        "production persistence cutover requires DATABASE_URL (or OOK_BFF_DATABASE_URL)"
      );
    }

    return "postgres";
  }

  if (configured === "file") {
    return "file";
  }

  if (configured === "postgres") {
    return "postgres";
  }

  if (hasFilePath) {
    return "file";
  }

  if (hasPostgresConnection) {
    return "postgres";
  }

  return "file";
}

export function getPersistenceBackend(): PersistenceBackend {
  return resolvePersistenceBackend();
}

function getPostgresPool(): Pool {
  if (postgresPool) {
    return postgresPool;
  }

  const sslMode = process.env.OOK_BFF_DATABASE_SSL?.trim().toLowerCase();
  postgresPool = new Pool({
    connectionString: resolvePostgresConnectionString(),
    max: Number(process.env.OOK_BFF_DATABASE_POOL_MAX ?? "10"),
    ssl: sslMode === "require" ? { rejectUnauthorized: false } : undefined
  });

  return postgresPool;
}

function resolvePostgresSeedStrategy(): PostgresSeedStrategy {
  const configured = process.env.OOK_BFF_POSTGRES_SEED_STRATEGY?.trim().toLowerCase();
  if (configured === "demo" || configured === "catalog" || configured === "none") {
    return configured;
  }

  return isProductionPersistenceCutover() ? "catalog" : "demo";
}

function createSeedDatabase(): BffDatabase {
  const now = new Date("2026-02-16T12:00:00.000Z");
  const nowIso = now.toISOString();
  const accountId = "acct_collector_demo";
  const seededReceiptId = "rcpt_seed_stardust";
  const seededCertificateId = "cert_seed_stardust";

  const worlds: World[] = [
    {
      id: "dark-matter",
      title: "dark matter",
      synopsis: "cinematic drops exploring identity and memory.",
      studioHandle: "oneofakinde",
      visualIdentity: {
        coverImageSrc: resolveAssetUrl("world:dark-matter:cover"),
        colorPrimary: "#0b132b",
        colorSecondary: "#1c2541",
        motionTreatment: "world_ambient_v1"
      },
      ambientAudioSrc: resolveAssetUrl("world:dark-matter:ambient"),
      entryRule: "membership",
      lore: "dark matter tracks identity through memory, movement, and live openings.",
      releaseStructure: {
        mode: "seasons",
        currentLabel: "season one"
      },
      defaultDropVisibility: "world_members",
      collectBundles: [
        {
          bundleType: "current_only",
          title: "dark matter current",
          synopsis: "access to the current dark matter chapter window.",
          priceUsd: 4.99,
          currency: "USD",
          eligibilityRule: "public",
          seasonWindowDays: 14
        },
        {
          bundleType: "season_pass_window",
          title: "dark matter season pass",
          synopsis: "rolling season access for dark matter releases.",
          priceUsd: 11.99,
          currency: "USD",
          eligibilityRule: "membership_active",
          seasonWindowDays: 90
        },
        {
          bundleType: "full_world",
          title: "dark matter full world",
          synopsis: "full world ownership with future canonical updates.",
          priceUsd: 18.99,
          currency: "USD",
          eligibilityRule: "public",
          seasonWindowDays: null
        }
      ]
    },
    {
      id: "through-the-lens",
      title: "through the lens",
      synopsis: "camera-led drops for real-world atmospheres.",
      studioHandle: "oneofakinde",
      visualIdentity: {
        coverImageSrc: resolveAssetUrl("world:through-the-lens:cover"),
        colorPrimary: "#102a43",
        colorSecondary: "#334e68",
        motionTreatment: "world_ambient_v1"
      },
      ambientAudioSrc: resolveAssetUrl("world:through-the-lens:ambient"),
      entryRule: "open",
      lore: "through the lens reframes daily scenes into episodic chapters.",
      releaseStructure: {
        mode: "chapters",
        currentLabel: "chapter one"
      },
      defaultDropVisibility: "public",
      collectBundles: [
        {
          bundleType: "current_only",
          title: "through the lens current",
          synopsis: "access to the current through the lens chapter window.",
          priceUsd: 6.49,
          currency: "USD",
          eligibilityRule: "public",
          seasonWindowDays: 14
        },
        {
          bundleType: "season_pass_window",
          title: "through the lens season pass",
          synopsis: "rolling season access for through the lens releases.",
          priceUsd: 14.99,
          currency: "USD",
          eligibilityRule: "membership_active",
          seasonWindowDays: 90
        },
        {
          bundleType: "full_world",
          title: "through the lens full world",
          synopsis: "full world ownership with future canonical updates.",
          priceUsd: 24.99,
          currency: "USD",
          eligibilityRule: "public",
          seasonWindowDays: null
        }
      ]
    }
  ];

  const studios: Studio[] = [
    {
      handle: "oneofakinde",
      title: "oneofakinde",
      synopsis: "a cultural network publishing drops across live, read, listen, and watch modes.",
      worldIds: ["dark-matter", "through-the-lens"]
    }
  ];

  const drops: Drop[] = [
    {
      id: "stardust",
      title: "stardust",
      seasonLabel: "season one",
      episodeLabel: "episode one",
      studioHandle: "oneofakinde",
      worldId: "dark-matter",
      worldLabel: "dark matter",
      synopsis: "through the dark, stardust traces identity in motion.",
      releaseDate: "2026-02-16",
      priceUsd: 1.99,
      studioPinRank: 1,
      worldOrderIndex: 1,
      previewMedia: seedPreviewMediaForDrop("stardust"),
      visibility: "public",
      visibilitySource: "world_default",
      previewPolicy: "full",
      releaseAt: "2026-02-16T12:00:00.000Z"
    },
    {
      id: "twilight-whispers",
      title: "twilight whispers",
      seasonLabel: "memories",
      episodeLabel: "lights in the night",
      studioHandle: "oneofakinde",
      worldId: "dark-matter",
      worldLabel: "dark matter",
      synopsis: "an ambient chapter where memory and water share a horizon.",
      releaseDate: "2026-02-10",
      priceUsd: 3.49,
      worldOrderIndex: 3,
      previewMedia: seedPreviewMediaForDrop("twilight-whispers"),
      visibility: "world_members",
      visibilitySource: "world_default",
      previewPolicy: "limited",
      releaseAt: "2026-02-10T12:00:00.000Z"
    },
    {
      id: "voidrunner",
      title: "voidrunner",
      seasonLabel: "season one",
      episodeLabel: "episode three",
      studioHandle: "oneofakinde",
      worldId: "dark-matter",
      worldLabel: "dark matter",
      synopsis: "a lone signal crosses worlds and leaves a live trail.",
      releaseDate: "2026-02-12",
      priceUsd: 9.99,
      studioPinRank: 3,
      worldOrderIndex: 2,
      previewMedia: seedPreviewMediaForDrop("voidrunner"),
      visibility: "collectors_only",
      visibilitySource: "drop",
      previewPolicy: "poster",
      releaseAt: "2026-02-12T12:00:00.000Z"
    },
    {
      id: "through-the-lens",
      title: "through the lens",
      seasonLabel: "city voices",
      episodeLabel: "coffee table",
      studioHandle: "oneofakinde",
      worldId: "through-the-lens",
      worldLabel: "through the lens",
      synopsis: "a quiet table becomes a live scene with layered stories.",
      releaseDate: "2026-02-14",
      priceUsd: 12,
      studioPinRank: 2,
      worldOrderIndex: 1,
      previewMedia: seedPreviewMediaForDrop("through-the-lens"),
      visibility: "public",
      visibilitySource: "drop",
      previewPolicy: "full",
      releaseAt: "2026-02-14T12:00:00.000Z"
    }
  ];

  const seededReceipt: PurchaseReceipt = {
    id: seededReceiptId,
    accountId,
    dropId: "stardust",
    amountUsd: 1.99,
    status: "completed",
    purchasedAt: nowIso
  };

  const seededCertificate: CertificateRecord = {
    id: seededCertificateId,
    dropId: "stardust",
    dropTitle: "stardust",
    ownerHandle: "collector_demo",
    issuedAt: nowIso,
    receiptId: seededReceiptId,
    status: "verified",
    ownerAccountId: accountId
  };

  return {
    version: DATA_VERSION,
    catalog: {
      drops,
      worlds,
      studios
    },
    accounts: [
      {
        id: accountId,
        email: "collector@oneofakinde.com",
        handle: "collector_demo",
        displayName: "collector demo",
        roles: ["collector"],
        createdAt: nowIso
      },
      {
        id: "acct_creator_demo",
        email: "creator@oneofakinde.com",
        handle: "oneofakinde",
        displayName: "oneofakinde studio",
        roles: ["collector", "creator"],
        createdAt: nowIso,
        bio: "the official oneofakinde studio account. publishing drops across live, read, listen, and watch modes."
      }
    ],
    sessions: [],
    ownerships: [
      {
        accountId,
        dropId: "stardust",
        certificateId: seededCertificateId,
        receiptId: seededReceiptId,
        acquiredAt: nowIso
      }
    ],
    savedDrops: [
      {
        accountId,
        dropId: "twilight-whispers",
        savedAt: new Date(now.valueOf() - DAY_MS).toISOString()
      },
      {
        accountId,
        dropId: "through-the-lens",
        savedAt: new Date(now.valueOf() - DAY_MS * 2).toISOString()
      },
      {
        accountId,
        dropId: "voidrunner",
        savedAt: new Date(now.valueOf() - DAY_MS * 3).toISOString()
      }
    ],
    libraryEligibilityStates: [],
    receipts: [seededReceipt],
    certificates: [seededCertificate],
    receiptBadges: [],
    payments: [],
    stripeWebhookEvents: [],
    watchAccessGrants: [],
    watchSessions: [],
    membershipEntitlements: [
      {
        id: "mship_seed_dark_matter",
        accountId,
        studioHandle: "oneofakinde",
        worldId: "dark-matter",
        status: "active",
        startedAt: new Date(now.valueOf() - DAY_MS * 14).toISOString(),
        endsAt: null
      }
    ],
    patrons: [],
    patronCommitments: [],
    patronTierConfigs: [
      {
        id: "ptier_seed_oneofakinde_studio",
        studioHandle: "oneofakinde",
        worldId: null,
        title: "studio patron",
        amountCents: 500,
        commitmentCadence: "monthly",
        periodDays: 30,
        earlyAccessWindowHours: 48,
        benefitsSummary: "studio patron support lane with world-level visibility.",
        status: "active",
        updatedAt: new Date(now.valueOf() - DAY_MS * 3).toISOString(),
        updatedByHandle: "oneofakinde"
      }
    ],
    workshopProProfiles: [
      {
        studioHandle: "oneofakinde",
        state: "active",
        cycleAnchorAt: new Date(now.valueOf() - DAY_MS * 30).toISOString(),
        pastDueAt: null,
        graceEndsAt: null,
        lockedAt: null,
        updatedAt: new Date(now.valueOf() - DAY_MS * 2).toISOString()
      }
    ],
    liveSessions: [
      {
        id: "live_dark_matter_open_studio",
        studioHandle: "oneofakinde",
        worldId: "dark-matter",
        dropId: null,
        title: "dark matter open studio",
        synopsis: "public live studio walk-through.",
        startsAt: new Date(now.valueOf() + DAY_MS).toISOString(),
        endsAt: null,
        mode: "live",
        eligibilityRule: "public",
        type: "studio_session",
        eligibility: "open",
        spatialAudio: false,
        exclusiveDropWindowDropId: null,
        exclusiveDropWindowDelay: null,
        capacity: 250
      },
      {
        id: "live_dark_matter_members_salons",
        studioHandle: "oneofakinde",
        worldId: "dark-matter",
        dropId: null,
        title: "members salon: dark matter",
        synopsis: "members-only session for current world collectors.",
        startsAt: new Date(now.valueOf() + DAY_MS * 2).toISOString(),
        endsAt: null,
        mode: "live",
        eligibilityRule: "membership_active",
        type: "opening",
        eligibility: "membership",
        spatialAudio: true,
        exclusiveDropWindowDropId: null,
        exclusiveDropWindowDelay: null,
        capacity: 120
      },
      {
        id: "live_stardust_collectors_qna",
        studioHandle: "oneofakinde",
        worldId: "dark-matter",
        dropId: "stardust",
        title: "stardust collectors q&a",
        synopsis: "collector session unlocked by stardust ownership.",
        startsAt: new Date(now.valueOf() + DAY_MS * 3).toISOString(),
        endsAt: null,
        mode: "live",
        eligibilityRule: "drop_owner",
        type: "event",
        eligibility: "invite",
        spatialAudio: true,
        exclusiveDropWindowDropId: "stardust",
        exclusiveDropWindowDelay: 1440,
        capacity: 80
      }
    ],
    liveSessionAttendees: [],
    liveSessionArtifacts: [],
    townhallLikes: [
      {
        accountId,
        dropId: "stardust",
        likedAt: new Date(now.valueOf() - DAY_MS / 2).toISOString()
      }
    ],
    townhallComments: [
      {
        id: "cmt_seed_stardust_1",
        accountId,
        dropId: "stardust",
        parentCommentId: null,
        body: "this drop keeps getting better each replay.",
        createdAt: new Date(now.valueOf() - DAY_MS / 4).toISOString(),
        visibility: "visible",
        reportCount: 0,
        reportedAt: null,
        moderatedAt: null,
        moderatedByAccountId: null,
        appealRequestedAt: null,
        appealRequestedByAccountId: null
      }
    ],
    townhallPosts: [
      {
        id: "post_seed_stardust_reflection",
        accountId,
        body: "collector reflection: stardust keeps opening new details every replay.",
        createdAt: new Date(now.valueOf() - DAY_MS / 3).toISOString(),
        visibility: "visible",
        reportCount: 0,
        reportedAt: null,
        moderatedAt: null,
        moderatedByAccountId: null,
        appealRequestedAt: null,
        appealRequestedByAccountId: null,
        linkedObjectKind: "drop",
        linkedObjectId: "stardust",
        linkedObjectLabel: "stardust",
        linkedObjectHref: "/drops/stardust"
      },
      {
        id: "post_seed_dark_matter_note",
        accountId,
        body: "artist note: dark matter season one staging remains open for reflections.",
        createdAt: new Date(now.valueOf() - DAY_MS / 2).toISOString(),
        visibility: "visible",
        reportCount: 0,
        reportedAt: null,
        moderatedAt: null,
        moderatedByAccountId: null,
        appealRequestedAt: null,
        appealRequestedByAccountId: null,
        linkedObjectKind: "world",
        linkedObjectId: "dark-matter",
        linkedObjectLabel: "dark matter",
        linkedObjectHref: "/worlds/dark-matter"
      }
    ],
    townhallPostSaves: [
      {
        accountId,
        postId: "post_seed_stardust_reflection",
        savedAt: new Date(now.valueOf() - DAY_MS / 6).toISOString()
      }
    ],
    townhallPostFollows: [
      {
        accountId,
        postId: "post_seed_stardust_reflection",
        followedAt: new Date(now.valueOf() - DAY_MS / 5).toISOString()
      }
    ],
    townhallPostShares: [
      {
        id: "pshr_seed_stardust_reflection_1",
        accountId,
        postId: "post_seed_stardust_reflection",
        channel: "internal_dm",
        sharedAt: new Date(now.valueOf() - DAY_MS / 7).toISOString()
      }
    ],
    townhallShares: [
      {
        id: "shr_seed_stardust_1",
        accountId,
        dropId: "stardust",
        channel: "internal_dm",
        sharedAt: new Date(now.valueOf() - DAY_MS / 6).toISOString()
      }
    ],
    townhallTelemetryEvents: [
      {
        id: "tel_seed_stardust_watch_1",
        accountId,
        dropId: "stardust",
        eventType: "watch_time",
        watchTimeSeconds: 248,
        completionPercent: 0,
        metadata: {},
        occurredAt: new Date(now.valueOf() - DAY_MS / 8).toISOString()
      },
      {
        id: "tel_seed_stardust_complete_1",
        accountId,
        dropId: "stardust",
        eventType: "completion",
        watchTimeSeconds: 0,
        completionPercent: 100,
        metadata: {},
        occurredAt: new Date(now.valueOf() - DAY_MS / 9).toISOString()
      },
      {
        id: "tel_seed_stardust_collect_1",
        accountId,
        dropId: "stardust",
        eventType: "collect_intent",
        watchTimeSeconds: 0,
        completionPercent: 0,
        metadata: {},
        occurredAt: new Date(now.valueOf() - DAY_MS / 10).toISOString()
      }
    ],
    worldConversationMessages: [],
    liveSessionConversationMessages: [],
    collectOffers: [
      {
        id: "offer_seed_voidrunner_resale_1",
        accountId,
        dropId: "voidrunner",
        listingType: "resale",
        amountUsd: 10.49,
        state: "settled",
        createdAt: new Date(now.valueOf() - DAY_MS * 2).toISOString(),
        updatedAt: new Date(now.valueOf() - DAY_MS).toISOString(),
        expiresAt: new Date(now.valueOf() + DAY_MS * 7).toISOString(),
        executionVisibility: "private",
        executionPriceUsd: 10.21
      },
      {
        id: "offer_seed_through_lens_auction_1",
        accountId,
        dropId: "through-the-lens",
        listingType: "auction",
        amountUsd: 12.4,
        state: "offer_submitted",
        createdAt: new Date(now.valueOf() - DAY_MS * 3).toISOString(),
        updatedAt: new Date(now.valueOf() - DAY_MS * 2).toISOString(),
        expiresAt: new Date(now.valueOf() + DAY_MS * 5).toISOString(),
        executionVisibility: "public",
        executionPriceUsd: null
      }
    ],
    collectEnforcementSignals: [],
    worldCollectOwnerships: [
      {
        id: "wown_seed_dark_matter_current",
        accountId,
        worldId: "dark-matter",
        bundleType: "current_only",
        status: "active",
        purchasedAt: new Date(now.valueOf() - DAY_MS * 6).toISOString(),
        amountPaidUsd: 4.99,
        previousOwnershipCreditUsd: 0,
        prorationStrategy: "placeholder_linear_proration_v1",
        upgradedToBundleType: null,
        upgradedAt: null
      }
    ],
    worldReleaseQueue: [
      {
        id: "wrel_seed_dark_matter_episode_two",
        studioHandle: "oneofakinde",
        worldId: "dark-matter",
        dropId: "voidrunner",
        scheduledFor: new Date(now.valueOf() + DAY_MS * 5).toISOString(),
        pacingMode: "weekly",
        pacingWindowHours: 168,
        status: "scheduled",
        createdByAccountId: accountId,
        createdAt: new Date(now.valueOf() - DAY_MS).toISOString(),
        updatedAt: new Date(now.valueOf() - DAY_MS).toISOString(),
        publishedAt: null,
        canceledAt: null
      }
    ],
    dropVersions: drops.map((drop) => ({
      id: `dver_seed_${drop.id}_v1`,
      dropId: drop.id,
      label: "v1",
      notes: "launch cut",
      createdByHandle: drop.studioHandle,
      createdAt: drop.releaseDate,
      releasedAt: drop.releaseDate
    })),
    authorizedDerivatives: [
      {
        id: "ader_seed_stardust_remix_1",
        sourceDropId: "stardust",
        derivativeDropId: "twilight-whispers",
        kind: "remix",
        attribution: "authorized derivative with source attribution.",
        revenueSplits: [
          {
            recipientHandle: "oneofakinde",
            sharePercent: 70
          },
          {
            recipientHandle: "collector_demo",
            sharePercent: 30
          }
        ],
        authorizedByHandle: "oneofakinde",
        createdAt: new Date(now.valueOf() - DAY_MS * 4).toISOString()
      }
    ],
    ledgerTransactions: [],
    ledgerLineItems: [],
    studioFollows: [],
    notificationEntries: [
      {
        id: "notif_seed_1",
        accountId,
        type: "drop_collected",
        title: "you collected stardust",
        body: "stardust is now in your collection. watch, listen, or read whenever you like.",
        href: "/drops/stardust",
        read: false,
        createdAt: new Date(now.valueOf() - DAY_MS * 0.5).toISOString()
      },
      {
        id: "notif_seed_2",
        accountId,
        type: "world_update",
        title: "dark matter — new drop available",
        body: "voidrunner has been released in dark matter. collect it before the window closes.",
        href: "/drops/voidrunner",
        read: false,
        createdAt: new Date(now.valueOf() - DAY_MS * 1).toISOString()
      },
      {
        id: "notif_seed_3",
        accountId,
        type: "comment_reply",
        title: "@oneofakinde replied to your thread",
        body: "thanks for the reflection — stardust was designed to reward close attention.",
        href: "/townhall",
        read: true,
        createdAt: new Date(now.valueOf() - DAY_MS * 2).toISOString()
      },
      {
        id: "notif_seed_4",
        accountId,
        type: "receipt_confirmed",
        title: "receipt confirmed for stardust",
        body: "your purchase of stardust ($1.99) has been confirmed. certificate issued.",
        href: "/my-collection?receipt=rcpt_seed_stardust",
        read: true,
        createdAt: new Date(now.valueOf() - DAY_MS * 3).toISOString()
      },
      {
        id: "notif_seed_5",
        accountId,
        type: "membership_change",
        title: "welcome to oneofakinde",
        body: "your collector account is active. explore the showroom and townhall to discover drops.",
        href: "/showroom",
        read: true,
        createdAt: new Date(now.valueOf() - DAY_MS * 5).toISOString()
      }
    ],
    notificationPreferences: [],
    totpEnrollments: [],
    walletConnections: []
  };
}

function createCatalogSeedDatabase(): BffDatabase {
  const seeded = createSeedDatabase();
  return {
    ...seeded,
    accounts: [],
    sessions: [],
    ownerships: [],
    savedDrops: [],
    libraryEligibilityStates: [],
    receipts: [],
    certificates: [],
    receiptBadges: [],
    payments: [],
    stripeWebhookEvents: [],
    watchAccessGrants: [],
    watchSessions: [],
    membershipEntitlements: [],
    patrons: [],
    patronCommitments: [],
    patronTierConfigs: seeded.patronTierConfigs,
    workshopProProfiles: seeded.workshopProProfiles,
    liveSessions: seeded.liveSessions,
    liveSessionAttendees: [],
    liveSessionArtifacts: [],
    townhallLikes: [],
    townhallComments: [],
    townhallPosts: [],
    townhallPostSaves: [],
    townhallPostFollows: [],
    townhallPostShares: [],
    townhallShares: [],
    townhallTelemetryEvents: [],
    worldConversationMessages: [],
    liveSessionConversationMessages: [],
    collectOffers: [],
    collectEnforcementSignals: [],
    worldCollectOwnerships: [],
    worldReleaseQueue: [],
    dropVersions: seeded.dropVersions,
    authorizedDerivatives: seeded.authorizedDerivatives,
    ledgerTransactions: [],
    ledgerLineItems: [],
    studioFollows: [],
    notificationEntries: [],
    notificationPreferences: [],
    totpEnrollments: [],
    walletConnections: []
  };
}

function createEmptyDatabase(): BffDatabase {
  return {
    version: DATA_VERSION,
    catalog: {
      drops: [],
      worlds: [],
      studios: []
    },
    accounts: [],
    sessions: [],
    ownerships: [],
    savedDrops: [],
    libraryEligibilityStates: [],
    receipts: [],
    certificates: [],
    receiptBadges: [],
    payments: [],
    stripeWebhookEvents: [],
    watchAccessGrants: [],
    watchSessions: [],
    membershipEntitlements: [],
    patrons: [],
    patronCommitments: [],
    patronTierConfigs: [],
    workshopProProfiles: [],
    liveSessions: [],
    liveSessionAttendees: [],
    liveSessionArtifacts: [],
    townhallLikes: [],
    townhallComments: [],
    townhallPosts: [],
    townhallPostSaves: [],
    townhallPostFollows: [],
    townhallPostShares: [],
    townhallShares: [],
    townhallTelemetryEvents: [],
    worldConversationMessages: [],
    liveSessionConversationMessages: [],
    collectOffers: [],
    collectEnforcementSignals: [],
    worldCollectOwnerships: [],
    worldReleaseQueue: [],
    dropVersions: [],
    authorizedDerivatives: [],
    ledgerTransactions: [],
    ledgerLineItems: [],
    studioFollows: [],
    notificationEntries: [],
    notificationPreferences: [],
    totpEnrollments: [],
    walletConnections: []
  };
}

function isValidDb(input: unknown): input is BffDatabase {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Partial<BffDatabase>;
  return (
    candidate.version === DATA_VERSION &&
    Array.isArray(candidate.catalog?.drops) &&
    Array.isArray(candidate.catalog?.worlds) &&
    Array.isArray(candidate.catalog?.studios) &&
    Array.isArray(candidate.accounts) &&
    Array.isArray(candidate.sessions) &&
    Array.isArray(candidate.ownerships) &&
    Array.isArray(candidate.savedDrops) &&
    Array.isArray(candidate.libraryEligibilityStates) &&
    Array.isArray(candidate.receipts) &&
    Array.isArray(candidate.certificates) &&
    Array.isArray(candidate.receiptBadges) &&
    Array.isArray(candidate.payments) &&
    Array.isArray(candidate.stripeWebhookEvents) &&
    Array.isArray(candidate.watchAccessGrants) &&
    Array.isArray(candidate.watchSessions) &&
    Array.isArray(candidate.membershipEntitlements) &&
    Array.isArray(candidate.patrons) &&
    Array.isArray(candidate.patronCommitments) &&
    Array.isArray(candidate.patronTierConfigs) &&
    Array.isArray(candidate.workshopProProfiles) &&
    Array.isArray(candidate.liveSessions) &&
    Array.isArray(candidate.liveSessionAttendees) &&
    Array.isArray(candidate.liveSessionArtifacts) &&
    Array.isArray(candidate.townhallLikes) &&
    Array.isArray(candidate.townhallComments) &&
    Array.isArray(candidate.townhallPosts) &&
    Array.isArray(candidate.townhallPostSaves) &&
    Array.isArray(candidate.townhallPostFollows) &&
    Array.isArray(candidate.townhallPostShares) &&
    Array.isArray(candidate.townhallShares) &&
    Array.isArray(candidate.townhallTelemetryEvents) &&
    Array.isArray(candidate.worldConversationMessages) &&
    Array.isArray(candidate.liveSessionConversationMessages) &&
    Array.isArray(candidate.collectOffers) &&
    Array.isArray(candidate.collectEnforcementSignals) &&
    Array.isArray(candidate.worldCollectOwnerships) &&
    Array.isArray(candidate.worldReleaseQueue) &&
    Array.isArray(candidate.dropVersions) &&
    Array.isArray(candidate.authorizedDerivatives) &&
    Array.isArray(candidate.ledgerTransactions) &&
    Array.isArray(candidate.ledgerLineItems) &&
    Array.isArray(candidate.studioFollows) &&
    Array.isArray(candidate.notificationEntries) &&
    Array.isArray(candidate.notificationPreferences)
  );
}

function hasLegacyBaseDbShape(input: unknown): input is Omit<
  BffDatabase,
  | "stripeWebhookEvents"
  | "watchAccessGrants"
  | "watchSessions"
  | "membershipEntitlements"
  | "patrons"
  | "patronCommitments"
  | "patronTierConfigs"
  | "workshopProProfiles"
  | "liveSessions"
  | "liveSessionAttendees"
  | "liveSessionArtifacts"
  | "townhallLikes"
  | "townhallComments"
  | "townhallPosts"
  | "townhallPostSaves"
  | "townhallPostFollows"
  | "townhallPostShares"
  | "townhallShares"
  | "townhallTelemetryEvents"
  | "worldConversationMessages"
  | "liveSessionConversationMessages"
  | "collectOffers"
  | "collectEnforcementSignals"
  | "worldCollectOwnerships"
  | "worldReleaseQueue"
  | "dropVersions"
  | "authorizedDerivatives"
  | "ledgerTransactions"
  | "ledgerLineItems"
  | "libraryEligibilityStates"
  | "receiptBadges"
  | "studioFollows"
  | "notificationEntries"
  | "notificationPreferences"
> {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Partial<BffDatabase>;
  return (
    candidate.version === DATA_VERSION &&
    Array.isArray(candidate.catalog?.drops) &&
    Array.isArray(candidate.catalog?.worlds) &&
    Array.isArray(candidate.catalog?.studios) &&
    Array.isArray(candidate.accounts) &&
    Array.isArray(candidate.sessions) &&
    Array.isArray(candidate.ownerships) &&
    Array.isArray(candidate.savedDrops) &&
    Array.isArray(candidate.receipts) &&
    Array.isArray(candidate.certificates) &&
    Array.isArray(candidate.payments)
  );
}

function normalizeLibraryRecallState(value: unknown): LibraryRecallState {
  if (value === "gated" || value === "scheduled" || value === "unlocked" || value === "owned") {
    return value;
  }

  return "gated";
}

function normalizeLibraryEligibilityStateRecords(
  records: LibraryEligibilityStateRecord[]
): LibraryEligibilityStateRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<LibraryEligibilityStateRecord> & {
      state?: unknown;
    };

    return {
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      dropId: typeof candidate.dropId === "string" ? candidate.dropId : "",
      state: normalizeLibraryRecallState(candidate.state),
      updatedAt:
        typeof candidate.updatedAt === "string" && candidate.updatedAt.trim()
          ? candidate.updatedAt
          : new Date().toISOString()
    };
  });
}

function normalizeTownhallTelemetryMetadata(value: unknown): TownhallTelemetryMetadata {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const metadata: TownhallTelemetryMetadata = {};

  if (candidate.source === "showroom" || candidate.source === "drop") {
    metadata.source = candidate.source;
  }

  if (
    candidate.surface === "townhall" ||
    candidate.surface === "watch" ||
    candidate.surface === "listen" ||
    candidate.surface === "read" ||
    candidate.surface === "photos" ||
    candidate.surface === "live"
  ) {
    metadata.surface = candidate.surface;
  }

  if (
    candidate.mediaFilter === "all" ||
    candidate.mediaFilter === "watch" ||
    candidate.mediaFilter === "listen" ||
    candidate.mediaFilter === "read" ||
    candidate.mediaFilter === "photos" ||
    candidate.mediaFilter === "live"
  ) {
    metadata.mediaFilter = candidate.mediaFilter;
  }

  if (
    candidate.ordering === "for_you" ||
    candidate.ordering === "rising" ||
    candidate.ordering === "newest" ||
    candidate.ordering === "most_collected" ||
    candidate.ordering === "new_voices" ||
    candidate.ordering === "sustained_craft"
  ) {
    metadata.ordering = candidate.ordering;
  }

  if (typeof candidate.position === "number" && Number.isFinite(candidate.position)) {
    metadata.position = Math.max(1, Math.floor(candidate.position));
  }

  if (
    candidate.channel === "sms" ||
    candidate.channel === "internal_dm" ||
    candidate.channel === "whatsapp" ||
    candidate.channel === "telegram"
  ) {
    metadata.channel = candidate.channel;
  }

  if (
    candidate.action === "open" ||
    candidate.action === "complete" ||
    candidate.action === "start" ||
    candidate.action === "toggle" ||
    candidate.action === "submit"
  ) {
    metadata.action = candidate.action;
  }

  if (
    candidate.qualityMode === "auto" ||
    candidate.qualityMode === "high" ||
    candidate.qualityMode === "medium" ||
    candidate.qualityMode === "low"
  ) {
    metadata.qualityMode = candidate.qualityMode;
  }

  if (
    candidate.qualityLevel === "high" ||
    candidate.qualityLevel === "medium" ||
    candidate.qualityLevel === "low"
  ) {
    metadata.qualityLevel = candidate.qualityLevel;
  }

  if (
    candidate.qualityReason === "manual_select" ||
    candidate.qualityReason === "auto_step_down_stalled" ||
    candidate.qualityReason === "auto_step_down_error"
  ) {
    metadata.qualityReason = candidate.qualityReason;
  }

  if (
    candidate.rebufferReason === "waiting" ||
    candidate.rebufferReason === "stalled" ||
    candidate.rebufferReason === "error"
  ) {
    metadata.rebufferReason = candidate.rebufferReason;
  }

  return metadata;
}

function normalizeMembershipEntitlementStatus(value: unknown): MembershipEntitlementStatus {
  if (value === "active" || value === "expired" || value === "canceled") {
    return value;
  }

  return "expired";
}

function normalizeMembershipEntitlementRecords(
  records: MembershipEntitlementRecord[]
): MembershipEntitlementRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<MembershipEntitlementRecord>;

    return {
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `mship_${randomUUID()}`,
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      studioHandle: typeof candidate.studioHandle === "string" ? candidate.studioHandle : "",
      worldId:
        typeof candidate.worldId === "string" && candidate.worldId.trim().length > 0
          ? candidate.worldId
          : null,
      status: normalizeMembershipEntitlementStatus(candidate.status),
      startedAt:
        typeof candidate.startedAt === "string" && candidate.startedAt.trim()
          ? candidate.startedAt
          : new Date().toISOString(),
      endsAt:
        typeof candidate.endsAt === "string" && candidate.endsAt.trim().length > 0
          ? candidate.endsAt
          : null
    };
  });
}

function normalizePatronStatus(value: unknown): PatronStatus {
  return value === "lapsed" ? "lapsed" : "active";
}

function normalizePatronRecords(records: PatronRecord[]): PatronRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<PatronRecord>;
    const status = normalizePatronStatus(candidate.status);
    const committedAt =
      typeof candidate.committedAt === "string" && candidate.committedAt.trim()
        ? candidate.committedAt
        : new Date().toISOString();
    const normalizedLapsedAt =
      typeof candidate.lapsedAt === "string" && candidate.lapsedAt.trim().length > 0
        ? candidate.lapsedAt
        : null;

    return {
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `pat_${randomUUID()}`,
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      handle: typeof candidate.handle === "string" ? candidate.handle : "",
      studioHandle: typeof candidate.studioHandle === "string" ? candidate.studioHandle : "",
      status,
      committedAt,
      lapsedAt: status === "lapsed" ? normalizedLapsedAt ?? committedAt : null
    };
  });
}

function normalizePatronCommitmentRecords(
  records: PatronCommitmentRecord[]
): PatronCommitmentRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<PatronCommitmentRecord>;

    return {
      id:
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id
          : `patc_${randomUUID()}`,
      patronId: typeof candidate.patronId === "string" ? candidate.patronId : "",
      amountCents:
        typeof candidate.amountCents === "number" && Number.isFinite(candidate.amountCents)
          ? Math.max(0, Math.floor(candidate.amountCents))
          : 0,
      periodStart:
        typeof candidate.periodStart === "string" && candidate.periodStart.trim()
          ? candidate.periodStart
          : new Date().toISOString(),
      periodEnd:
        typeof candidate.periodEnd === "string" && candidate.periodEnd.trim()
          ? candidate.periodEnd
          : new Date().toISOString(),
      ledgerTransactionId:
        typeof candidate.ledgerTransactionId === "string" ? candidate.ledgerTransactionId : ""
    };
  });
}

function normalizePatronTierStatus(value: unknown): PatronTierStatus {
  return value === "disabled" ? "disabled" : "active";
}

function normalizePatronCommitmentCadence(value: unknown): PatronCommitmentCadence {
  if (value === "weekly" || value === "monthly" || value === "quarterly") {
    return value;
  }

  return "monthly";
}

function resolvePatronPeriodDaysForCadence(cadence: PatronCommitmentCadence): number {
  if (cadence === "weekly") return 7;
  if (cadence === "quarterly") return 90;
  return 30;
}

function normalizePatronTierConfigRecords(
  records: PatronTierConfigRecord[]
): PatronTierConfigRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<PatronTierConfigRecord>;
    const commitmentCadence = normalizePatronCommitmentCadence(candidate.commitmentCadence);
    const periodDaysFromRecord =
      typeof candidate.periodDays === "number" && Number.isFinite(candidate.periodDays)
        ? Math.max(1, Math.floor(candidate.periodDays))
        : null;
    const expectedPeriodDays = resolvePatronPeriodDaysForCadence(commitmentCadence);
    const periodDays =
      periodDaysFromRecord !== null && periodDaysFromRecord > 0
        ? periodDaysFromRecord
        : expectedPeriodDays;

    return {
      id:
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id
          : `ptier_${randomUUID()}`,
      studioHandle: typeof candidate.studioHandle === "string" ? candidate.studioHandle : "",
      worldId:
        typeof candidate.worldId === "string" && candidate.worldId.trim().length > 0
          ? candidate.worldId
          : null,
      title:
        typeof candidate.title === "string" && candidate.title.trim().length > 0
          ? candidate.title
          : "studio patron",
      amountCents:
        typeof candidate.amountCents === "number" && Number.isFinite(candidate.amountCents)
          ? Math.max(1, Math.floor(candidate.amountCents))
          : 500,
      commitmentCadence,
      periodDays:
        periodDays === expectedPeriodDays
          ? periodDays
          : expectedPeriodDays,
      earlyAccessWindowHours:
        typeof candidate.earlyAccessWindowHours === "number" &&
        Number.isFinite(candidate.earlyAccessWindowHours)
          ? Math.min(168, Math.max(1, Math.floor(candidate.earlyAccessWindowHours)))
          : 48,
      benefitsSummary: typeof candidate.benefitsSummary === "string" ? candidate.benefitsSummary : "",
      status: normalizePatronTierStatus(candidate.status),
      updatedAt:
        typeof candidate.updatedAt === "string" && candidate.updatedAt.trim().length > 0
          ? candidate.updatedAt
          : new Date().toISOString(),
      updatedByHandle: typeof candidate.updatedByHandle === "string" ? candidate.updatedByHandle : ""
    };
  });
}

function normalizeLiveSessionEligibilityRule(value: unknown): LiveSessionEligibilityRule {
  if (value === "public" || value === "membership_active" || value === "drop_owner") {
    return value;
  }

  return "public";
}

function normalizeLiveSessionType(value: unknown): LiveSessionType {
  if (value === "opening" || value === "event" || value === "studio_session") {
    return value;
  }

  return "event";
}

function normalizeLiveSessionAudienceEligibility(
  value: unknown,
  fallbackRule: LiveSessionEligibilityRule
): LiveSessionAudienceEligibility {
  if (value === "open" || value === "membership" || value === "patron" || value === "invite") {
    return value;
  }

  if (fallbackRule === "membership_active") {
    return "membership";
  }

  if (fallbackRule === "drop_owner") {
    return "invite";
  }

  return "open";
}

function normalizeLiveSessionRecords(records: LiveSessionRecord[]): LiveSessionRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<LiveSessionRecord>;
    const eligibilityRule = normalizeLiveSessionEligibilityRule(candidate.eligibilityRule);
    const exclusiveDropWindowDropId =
      typeof candidate.exclusiveDropWindowDropId === "string" &&
      candidate.exclusiveDropWindowDropId.trim().length > 0
        ? candidate.exclusiveDropWindowDropId
        : null;
    const exclusiveDropWindowDelay =
      typeof candidate.exclusiveDropWindowDelay === "number" &&
      Number.isFinite(candidate.exclusiveDropWindowDelay) &&
      candidate.exclusiveDropWindowDelay >= 1440
        ? Math.floor(candidate.exclusiveDropWindowDelay)
        : null;
    const capacity =
      typeof candidate.capacity === "number" && Number.isFinite(candidate.capacity)
        ? Math.max(1, Math.floor(candidate.capacity))
        : 200;

    return {
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `live_${randomUUID()}`,
      studioHandle: typeof candidate.studioHandle === "string" ? candidate.studioHandle : "",
      worldId:
        typeof candidate.worldId === "string" && candidate.worldId.trim().length > 0
          ? candidate.worldId
          : null,
      dropId:
        typeof candidate.dropId === "string" && candidate.dropId.trim().length > 0
          ? candidate.dropId
          : null,
      title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title : "live session",
      synopsis: typeof candidate.synopsis === "string" ? candidate.synopsis : "",
      startsAt:
        typeof candidate.startsAt === "string" && candidate.startsAt.trim()
          ? candidate.startsAt
          : new Date().toISOString(),
      endsAt:
        typeof candidate.endsAt === "string" && candidate.endsAt.trim().length > 0
          ? candidate.endsAt
          : null,
      mode: "live",
      eligibilityRule,
      type: normalizeLiveSessionType(candidate.type),
      eligibility: normalizeLiveSessionAudienceEligibility(candidate.eligibility, eligibilityRule),
      spatialAudio: Boolean(candidate.spatialAudio),
      exclusiveDropWindowDropId,
      exclusiveDropWindowDelay,
      capacity
    };
  });
}

function normalizeLiveSessionAttendeeRecords(
  records: LiveSessionAttendeeRecord[]
): LiveSessionAttendeeRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<LiveSessionAttendeeRecord>;
    return {
      id:
        typeof candidate.id === "string" && candidate.id.trim().length > 0
          ? candidate.id
          : `lsatt_${randomUUID()}`,
      liveSessionId: typeof candidate.liveSessionId === "string" ? candidate.liveSessionId : "",
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      joinedAt:
        typeof candidate.joinedAt === "string" && candidate.joinedAt.trim().length > 0
          ? candidate.joinedAt
          : new Date().toISOString()
    };
  });
}

function normalizeLiveSessionArtifactStatus(value: unknown): LiveSessionArtifactStatus {
  if (value === "held_for_review" || value === "approved") {
    return value;
  }

  return "held_for_review";
}

function normalizeLiveSessionArtifactKind(value: unknown): LiveSessionArtifactKind {
  if (value === "recording" || value === "transcript" || value === "highlight") {
    return value;
  }

  return "highlight";
}

function normalizeLiveSessionArtifactRecords(
  records: LiveSessionArtifactRecord[]
): LiveSessionArtifactRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<LiveSessionArtifactRecord>;
    const status = normalizeLiveSessionArtifactStatus(candidate.status);
    const approvedAt =
      typeof candidate.approvedAt === "string" && candidate.approvedAt.trim().length > 0
        ? candidate.approvedAt
        : null;

    return {
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `lart_${randomUUID()}`,
      liveSessionId: typeof candidate.liveSessionId === "string" ? candidate.liveSessionId : "",
      studioHandle: typeof candidate.studioHandle === "string" ? candidate.studioHandle : "",
      worldId:
        typeof candidate.worldId === "string" && candidate.worldId.trim().length > 0
          ? candidate.worldId
          : null,
      sourceDropId:
        typeof candidate.sourceDropId === "string" && candidate.sourceDropId.trim().length > 0
          ? candidate.sourceDropId
          : null,
      artifactKind: normalizeLiveSessionArtifactKind(candidate.artifactKind),
      title:
        typeof candidate.title === "string" && candidate.title.trim().length > 0
          ? candidate.title
          : "live artifact",
      synopsis: typeof candidate.synopsis === "string" ? candidate.synopsis : "",
      status,
      capturedAt:
        typeof candidate.capturedAt === "string" && candidate.capturedAt.trim().length > 0
          ? candidate.capturedAt
          : new Date().toISOString(),
      approvedAt: status === "approved" ? approvedAt : null,
      catalogDropId:
        status === "approved" &&
        typeof candidate.catalogDropId === "string" &&
        candidate.catalogDropId.trim().length > 0
          ? candidate.catalogDropId
          : null,
      approvedByHandle:
        status === "approved" &&
        typeof candidate.approvedByHandle === "string" &&
        candidate.approvedByHandle.trim().length > 0
          ? candidate.approvedByHandle
          : null
    };
  });
}

function normalizeWorkshopProState(value: unknown): WorkshopProState {
  if (value === "active" || value === "past_due" || value === "grace" || value === "locked") {
    return value;
  }
  return "active";
}

function normalizeWorkshopProProfileRecords(
  records: WorkshopProProfileRecord[]
): WorkshopProProfileRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<WorkshopProProfileRecord>;
    return {
      studioHandle: typeof candidate.studioHandle === "string" ? candidate.studioHandle : "",
      state: normalizeWorkshopProState(candidate.state),
      cycleAnchorAt:
        typeof candidate.cycleAnchorAt === "string" && candidate.cycleAnchorAt.trim().length > 0
          ? candidate.cycleAnchorAt
          : new Date().toISOString(),
      pastDueAt:
        typeof candidate.pastDueAt === "string" && candidate.pastDueAt.trim().length > 0
          ? candidate.pastDueAt
          : null,
      graceEndsAt:
        typeof candidate.graceEndsAt === "string" && candidate.graceEndsAt.trim().length > 0
          ? candidate.graceEndsAt
          : null,
      lockedAt:
        typeof candidate.lockedAt === "string" && candidate.lockedAt.trim().length > 0
          ? candidate.lockedAt
          : null,
      updatedAt:
        typeof candidate.updatedAt === "string" && candidate.updatedAt.trim().length > 0
          ? candidate.updatedAt
          : new Date().toISOString()
    };
  });
}

function normalizeTownhallTelemetryEvents(
  events: TownhallTelemetryEventRecord[]
): TownhallTelemetryEventRecord[] {
  return events.map((event) => ({
    ...event,
    metadata: normalizeTownhallTelemetryMetadata((event as { metadata?: unknown }).metadata)
  }));
}

function normalizeCollectListingType(value: unknown): CollectListingType {
  if (value === "sale" || value === "auction" || value === "resale") {
    return value;
  }
  return "sale";
}

function normalizeCollectOfferState(value: unknown): CollectOfferState {
  if (
    value === "listed" ||
    value === "offer_submitted" ||
    value === "countered" ||
    value === "accepted" ||
    value === "settled" ||
    value === "expired" ||
    value === "withdrawn"
  ) {
    return value;
  }
  return "listed";
}

function normalizeCollectOfferRecords(events: CollectOfferRecord[]): CollectOfferRecord[] {
  return events.map((event) => ({
    ...event,
    listingType: normalizeCollectListingType((event as { listingType?: unknown }).listingType),
    state: normalizeCollectOfferState((event as { state?: unknown }).state),
    amountUsd:
      typeof event.amountUsd === "number" && Number.isFinite(event.amountUsd) ? event.amountUsd : 0,
    executionVisibility:
      event.executionVisibility === "private" || event.executionVisibility === "public"
        ? event.executionVisibility
        : "public",
    executionPriceUsd:
      typeof event.executionPriceUsd === "number" && Number.isFinite(event.executionPriceUsd)
        ? event.executionPriceUsd
        : null
  }));
}

function normalizeCollectEnforcementSignalType(value: unknown): CollectEnforcementSignalType {
  if (
    value === "invalid_listing_action_blocked" ||
    value === "invalid_amount_rejected" ||
    value === "invalid_transition_blocked" ||
    value === "unauthorized_transition_blocked" ||
    value === "cross_drop_transition_blocked" ||
    value === "invalid_settle_price_rejected" ||
    value === "reaward_blocked"
  ) {
    return value;
  }

  return "invalid_transition_blocked";
}

function normalizeCollectEnforcementSignalRecords(
  events: CollectEnforcementSignalRecord[]
): CollectEnforcementSignalRecord[] {
  return events.map((event) => {
    const candidate = event as Partial<CollectEnforcementSignalRecord> & {
      signalType?: unknown;
      dropId?: unknown;
      offerId?: unknown;
      accountId?: unknown;
      reason?: unknown;
      occurredAt?: unknown;
    };

    return {
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `sig_${randomUUID()}`,
      signalType: normalizeCollectEnforcementSignalType(candidate.signalType),
      dropId: typeof candidate.dropId === "string" && candidate.dropId.trim() ? candidate.dropId : null,
      offerId: typeof candidate.offerId === "string" && candidate.offerId.trim() ? candidate.offerId : null,
      accountId:
        typeof candidate.accountId === "string" && candidate.accountId.trim() ? candidate.accountId : null,
      reason:
        typeof candidate.reason === "string" && candidate.reason.trim()
          ? candidate.reason
          : "enforcement signal recorded",
      occurredAt:
        typeof candidate.occurredAt === "string" && candidate.occurredAt.trim()
          ? candidate.occurredAt
          : new Date().toISOString()
    };
  });
}

function normalizeWorldCollectBundleType(value: unknown): WorldCollectBundleType {
  if (value === "current_only" || value === "season_pass_window" || value === "full_world") {
    return value;
  }
  return "current_only";
}

function normalizeWorldCollectAmountUsd(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Number(Math.max(0, value).toFixed(2));
}

function normalizeWorldCollectUpgradeProrationStrategy(
  value: unknown
): WorldCollectUpgradeProrationStrategy {
  if (value === "placeholder_linear_proration_v1") {
    return value;
  }

  return "placeholder_linear_proration_v1";
}

function normalizeWorldCollectOwnershipStatus(value: unknown): WorldCollectOwnershipStatus {
  return value === "upgraded" ? "upgraded" : "active";
}

function normalizeWorldCollectOwnershipRecords(
  records: WorldCollectOwnershipRecord[]
): WorldCollectOwnershipRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<WorldCollectOwnershipRecord> & {
      bundleType?: unknown;
      status?: unknown;
      purchasedAt?: unknown;
      amountPaidUsd?: unknown;
      previousOwnershipCreditUsd?: unknown;
      prorationStrategy?: unknown;
      upgradedToBundleType?: unknown;
      upgradedAt?: unknown;
    };
    const amountPaidUsd = normalizeWorldCollectAmountUsd(candidate.amountPaidUsd);
    const previousOwnershipCreditUsd = Math.min(
      normalizeWorldCollectAmountUsd(candidate.previousOwnershipCreditUsd),
      amountPaidUsd
    );

    return {
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `wown_${randomUUID()}`,
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      worldId: typeof candidate.worldId === "string" ? candidate.worldId : "",
      bundleType: normalizeWorldCollectBundleType(candidate.bundleType),
      status: normalizeWorldCollectOwnershipStatus(candidate.status),
      purchasedAt:
        typeof candidate.purchasedAt === "string" && candidate.purchasedAt.trim()
          ? candidate.purchasedAt
          : new Date().toISOString(),
      amountPaidUsd,
      previousOwnershipCreditUsd,
      prorationStrategy: normalizeWorldCollectUpgradeProrationStrategy(candidate.prorationStrategy),
      upgradedToBundleType:
        candidate.upgradedToBundleType === "current_only" ||
        candidate.upgradedToBundleType === "season_pass_window" ||
        candidate.upgradedToBundleType === "full_world"
          ? candidate.upgradedToBundleType
          : null,
      upgradedAt:
        typeof candidate.upgradedAt === "string" && candidate.upgradedAt.trim()
          ? candidate.upgradedAt
          : null
    };
  });
}

function normalizeWorldReleaseQueuePacingMode(value: unknown): WorldReleaseQueuePacingMode {
  if (value === "manual" || value === "daily" || value === "weekly") {
    return value;
  }
  return "manual";
}

function normalizeWorldReleaseQueueStatus(value: unknown): WorldReleaseQueueStatus {
  if (value === "scheduled" || value === "published" || value === "canceled") {
    return value;
  }
  return "scheduled";
}

function normalizeWorldReleaseQueueRecords(records: WorldReleaseQueueRecord[]): WorldReleaseQueueRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<WorldReleaseQueueRecord> & {
      pacingMode?: unknown;
      status?: unknown;
    };
    const normalizedPacingMode = normalizeWorldReleaseQueuePacingMode(candidate.pacingMode);
    const normalizedStatus = normalizeWorldReleaseQueueStatus(candidate.status);
    const defaultWindowHours =
      normalizedPacingMode === "weekly" ? 168 : normalizedPacingMode === "daily" ? 24 : 0;
    const pacingWindowHours =
      typeof candidate.pacingWindowHours === "number" && Number.isFinite(candidate.pacingWindowHours)
        ? Math.max(0, Math.floor(candidate.pacingWindowHours))
        : defaultWindowHours;

    return {
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `wrel_${randomUUID()}`,
      studioHandle: typeof candidate.studioHandle === "string" ? candidate.studioHandle : "",
      worldId: typeof candidate.worldId === "string" ? candidate.worldId : "",
      dropId: typeof candidate.dropId === "string" ? candidate.dropId : "",
      scheduledFor:
        typeof candidate.scheduledFor === "string" && candidate.scheduledFor.trim()
          ? candidate.scheduledFor
          : new Date().toISOString(),
      pacingMode: normalizedPacingMode,
      pacingWindowHours,
      status: normalizedStatus,
      createdByAccountId:
        typeof candidate.createdByAccountId === "string" ? candidate.createdByAccountId : "",
      createdAt:
        typeof candidate.createdAt === "string" && candidate.createdAt.trim()
          ? candidate.createdAt
          : new Date().toISOString(),
      updatedAt:
        typeof candidate.updatedAt === "string" && candidate.updatedAt.trim()
          ? candidate.updatedAt
          : new Date().toISOString(),
      publishedAt:
        typeof candidate.publishedAt === "string" && candidate.publishedAt.trim()
          ? candidate.publishedAt
          : null,
      canceledAt:
        typeof candidate.canceledAt === "string" && candidate.canceledAt.trim()
          ? candidate.canceledAt
          : null
    };
  });
}

function normalizeDropVersionLabel(value: unknown): DropVersionLabel {
  if (
    value === "v1" ||
    value === "v2" ||
    value === "v3" ||
    value === "director_cut" ||
    value === "remaster"
  ) {
    return value;
  }

  return "v1";
}

function normalizeDropVersionRecords(records: DropVersionRecord[]): DropVersionRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<DropVersionRecord> & {
      label?: unknown;
    };

    return {
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `dver_${randomUUID()}`,
      dropId: typeof candidate.dropId === "string" ? candidate.dropId : "",
      label: normalizeDropVersionLabel(candidate.label),
      notes:
        typeof candidate.notes === "string" && candidate.notes.trim()
          ? candidate.notes
          : null,
      createdByHandle:
        typeof candidate.createdByHandle === "string" ? candidate.createdByHandle : "",
      createdAt:
        typeof candidate.createdAt === "string" && candidate.createdAt.trim()
          ? candidate.createdAt
          : new Date().toISOString(),
      releasedAt:
        typeof candidate.releasedAt === "string" && candidate.releasedAt.trim()
          ? candidate.releasedAt
          : null
    };
  });
}

function normalizeAuthorizedDerivativeKind(value: unknown): AuthorizedDerivativeKind {
  if (
    value === "remix" ||
    value === "translation" ||
    value === "anthology_world" ||
    value === "collaborative_season"
  ) {
    return value;
  }

  return "remix";
}

function normalizeAuthorizedDerivativeRevenueSplits(
  value: unknown
): AuthorizedDerivativeRevenueSplitRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rows = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const candidate = entry as Partial<AuthorizedDerivativeRevenueSplitRecord>;
      if (typeof candidate.recipientHandle !== "string" || !candidate.recipientHandle.trim()) {
        return null;
      }

      if (typeof candidate.sharePercent !== "number" || !Number.isFinite(candidate.sharePercent)) {
        return null;
      }

      const sharePercent = Number(candidate.sharePercent.toFixed(2));
      if (sharePercent <= 0 || sharePercent > 100) {
        return null;
      }

      return {
        recipientHandle: candidate.recipientHandle.trim(),
        sharePercent
      } satisfies AuthorizedDerivativeRevenueSplitRecord;
    })
    .filter((entry): entry is AuthorizedDerivativeRevenueSplitRecord => entry !== null);

  const total = Number(rows.reduce((sum, row) => sum + row.sharePercent, 0).toFixed(2));
  if (Math.abs(total - 100) > 0.01) {
    return [];
  }

  return rows;
}

function normalizeAuthorizedDerivativeRecords(
  records: AuthorizedDerivativeRecord[]
): AuthorizedDerivativeRecord[] {
  return records
    .map((record) => {
      const candidate = record as Partial<AuthorizedDerivativeRecord> & {
        kind?: unknown;
        revenueSplits?: unknown;
      };
      const revenueSplits = normalizeAuthorizedDerivativeRevenueSplits(candidate.revenueSplits);
      if (revenueSplits.length === 0) {
        return null;
      }

      return {
        id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `ader_${randomUUID()}`,
        sourceDropId: typeof candidate.sourceDropId === "string" ? candidate.sourceDropId : "",
        derivativeDropId:
          typeof candidate.derivativeDropId === "string" ? candidate.derivativeDropId : "",
        kind: normalizeAuthorizedDerivativeKind(candidate.kind),
        attribution:
          typeof candidate.attribution === "string" && candidate.attribution.trim()
            ? candidate.attribution
            : "authorized derivative",
        revenueSplits,
        authorizedByHandle:
          typeof candidate.authorizedByHandle === "string" ? candidate.authorizedByHandle : "",
        createdAt:
          typeof candidate.createdAt === "string" && candidate.createdAt.trim()
            ? candidate.createdAt
            : new Date().toISOString()
      } satisfies AuthorizedDerivativeRecord;
    })
    .filter((entry): entry is AuthorizedDerivativeRecord => entry !== null);
}

const SETTLEMENT_LINE_ITEM_KIND_SET = new Set<SettlementLineItem["kind"]>([
  "collect_subtotal",
  "collect_processing_fee",
  "platform_commission_collect",
  "artist_payout_collect",
  "membership_subtotal",
  "platform_commission_membership",
  "patron_subtotal",
  "platform_commission_patron"
]);

const SETTLEMENT_SCOPE_SET = new Set<SettlementLineItem["scope"]>([
  "public",
  "participant_private",
  "internal"
]);

function normalizeSettlementLineItemKind(value: unknown): SettlementLineItem["kind"] {
  if (typeof value === "string" && SETTLEMENT_LINE_ITEM_KIND_SET.has(value as SettlementLineItem["kind"])) {
    return value as SettlementLineItem["kind"];
  }
  return "collect_subtotal";
}

function normalizeSettlementScope(value: unknown): SettlementLineItem["scope"] {
  if (typeof value === "string" && SETTLEMENT_SCOPE_SET.has(value as SettlementLineItem["scope"])) {
    return value as SettlementLineItem["scope"];
  }
  return "internal";
}

function normalizeSettlementQuote(
  value: unknown,
  fallbackTotalUsd: number
): SettlementQuote {
  const fallbackSubtotal = Math.max(0, Number((fallbackTotalUsd - PROCESSING_FEE_USD).toFixed(2)));
  const fallback = buildCollectSettlementQuote({
    subtotalUsd: fallbackSubtotal,
    processingUsd: fallbackTotalUsd > 0 ? PROCESSING_FEE_USD : 0
  });

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<SettlementQuote> & {
    lineItems?: Array<Partial<SettlementLineItem>>;
  };
  const normalizedLineItems = Array.isArray(candidate.lineItems)
    ? candidate.lineItems.map((lineItem) => ({
        kind: normalizeSettlementLineItemKind(lineItem.kind),
        scope: normalizeSettlementScope(lineItem.scope),
        amountUsd:
          typeof lineItem.amountUsd === "number" && Number.isFinite(lineItem.amountUsd)
            ? Number(lineItem.amountUsd.toFixed(2))
            : 0,
        currency: "USD" as const,
        recipientAccountId:
          typeof lineItem.recipientAccountId === "string" && lineItem.recipientAccountId.trim()
            ? lineItem.recipientAccountId
            : null
      }))
    : fallback.lineItems;

  return {
    engineVersion: "quote_engine_v1",
    quoteKind:
      candidate.quoteKind === "collect" ||
      candidate.quoteKind === "membership" ||
      candidate.quoteKind === "patron"
        ? candidate.quoteKind
        : "collect",
    subtotalUsd:
      typeof candidate.subtotalUsd === "number" && Number.isFinite(candidate.subtotalUsd)
        ? Number(candidate.subtotalUsd.toFixed(2))
        : fallback.subtotalUsd,
    processingUsd:
      typeof candidate.processingUsd === "number" && Number.isFinite(candidate.processingUsd)
        ? Number(candidate.processingUsd.toFixed(2))
        : fallback.processingUsd,
    totalUsd:
      typeof candidate.totalUsd === "number" && Number.isFinite(candidate.totalUsd)
        ? Number(candidate.totalUsd.toFixed(2))
        : fallback.totalUsd,
    commissionUsd:
      typeof candidate.commissionUsd === "number" && Number.isFinite(candidate.commissionUsd)
        ? Number(candidate.commissionUsd.toFixed(2))
        : fallback.commissionUsd,
    payoutUsd:
      typeof candidate.payoutUsd === "number" && Number.isFinite(candidate.payoutUsd)
        ? Number(candidate.payoutUsd.toFixed(2))
        : fallback.payoutUsd,
    currency: "USD",
    lineItems: normalizedLineItems
  };
}

function normalizePaymentRecords(records: PaymentRecord[]): PaymentRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<PaymentRecord> & {
      quote?: unknown;
    };
    const amountUsd =
      typeof candidate.amountUsd === "number" && Number.isFinite(candidate.amountUsd)
        ? Number(candidate.amountUsd.toFixed(2))
        : 0;

    return {
      id: typeof candidate.id === "string" ? candidate.id : `pay_${randomUUID()}`,
      provider: candidate.provider === "stripe" ? "stripe" : "manual",
      status:
        candidate.status === "pending" ||
        candidate.status === "succeeded" ||
        candidate.status === "failed" ||
        candidate.status === "refunded"
          ? candidate.status
          : "pending",
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      dropId: typeof candidate.dropId === "string" ? candidate.dropId : "",
      amountUsd,
      quote: normalizeSettlementQuote(candidate.quote, amountUsd),
      currency: "USD",
      checkoutSessionId:
        typeof candidate.checkoutSessionId === "string" && candidate.checkoutSessionId.trim()
          ? candidate.checkoutSessionId
          : undefined,
      checkoutUrl:
        candidate.checkoutUrl === null ||
        (typeof candidate.checkoutUrl === "string" && candidate.checkoutUrl.trim().length > 0)
          ? candidate.checkoutUrl
          : undefined,
      providerPaymentIntentId:
        typeof candidate.providerPaymentIntentId === "string" && candidate.providerPaymentIntentId.trim()
          ? candidate.providerPaymentIntentId
          : undefined,
      receiptId:
        typeof candidate.receiptId === "string" && candidate.receiptId.trim()
          ? candidate.receiptId
          : undefined,
      createdAt:
        typeof candidate.createdAt === "string" && candidate.createdAt.trim()
          ? candidate.createdAt
          : new Date().toISOString(),
      updatedAt:
        typeof candidate.updatedAt === "string" && candidate.updatedAt.trim()
          ? candidate.updatedAt
          : new Date().toISOString()
    };
  });
}

function normalizeLedgerTransactionRecords(
  records: LedgerTransactionRecord[]
): LedgerTransactionRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<LedgerTransactionRecord>;
    return {
      id: typeof candidate.id === "string" ? candidate.id : `ltrx_${randomUUID()}`,
      kind:
        candidate.kind === "collect" ||
        candidate.kind === "refund" ||
        candidate.kind === "membership" ||
        candidate.kind === "patron"
          ? candidate.kind
          : "collect",
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      dropId: typeof candidate.dropId === "string" && candidate.dropId.trim() ? candidate.dropId : null,
      paymentId:
        typeof candidate.paymentId === "string" && candidate.paymentId.trim() ? candidate.paymentId : null,
      receiptId:
        typeof candidate.receiptId === "string" && candidate.receiptId.trim() ? candidate.receiptId : null,
      currency: "USD",
      subtotalUsd:
        typeof candidate.subtotalUsd === "number" && Number.isFinite(candidate.subtotalUsd)
          ? Number(candidate.subtotalUsd.toFixed(2))
          : 0,
      processingUsd:
        typeof candidate.processingUsd === "number" && Number.isFinite(candidate.processingUsd)
          ? Number(candidate.processingUsd.toFixed(2))
          : 0,
      totalUsd:
        typeof candidate.totalUsd === "number" && Number.isFinite(candidate.totalUsd)
          ? Number(candidate.totalUsd.toFixed(2))
          : 0,
      commissionUsd:
        typeof candidate.commissionUsd === "number" && Number.isFinite(candidate.commissionUsd)
          ? Number(candidate.commissionUsd.toFixed(2))
          : 0,
      payoutUsd:
        typeof candidate.payoutUsd === "number" && Number.isFinite(candidate.payoutUsd)
          ? Number(candidate.payoutUsd.toFixed(2))
          : 0,
      reversalOfTransactionId:
        typeof candidate.reversalOfTransactionId === "string" && candidate.reversalOfTransactionId.trim()
          ? candidate.reversalOfTransactionId
          : null,
      createdAt:
        typeof candidate.createdAt === "string" && candidate.createdAt.trim()
          ? candidate.createdAt
          : new Date().toISOString()
    };
  });
}

function normalizeLedgerLineItemRecords(records: LedgerLineItemRecord[]): LedgerLineItemRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<LedgerLineItemRecord>;
    return {
      id: typeof candidate.id === "string" ? candidate.id : `lli_${randomUUID()}`,
      transactionId: typeof candidate.transactionId === "string" ? candidate.transactionId : "",
      kind: normalizeSettlementLineItemKind(candidate.kind),
      scope: normalizeSettlementScope(candidate.scope),
      amountUsd:
        typeof candidate.amountUsd === "number" && Number.isFinite(candidate.amountUsd)
          ? Number(candidate.amountUsd.toFixed(2))
          : 0,
      currency: "USD",
      recipientAccountId:
        typeof candidate.recipientAccountId === "string" && candidate.recipientAccountId.trim()
          ? candidate.recipientAccountId
          : null,
      createdAt:
        typeof candidate.createdAt === "string" && candidate.createdAt.trim()
          ? candidate.createdAt
          : new Date().toISOString()
    };
  });
}

function normalizeStudioFollowRecords(records: StudioFollowRecord[]): StudioFollowRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<StudioFollowRecord>;
    return {
      id: typeof candidate.id === "string" ? candidate.id : `sf_${randomUUID()}`,
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      studioHandle: typeof candidate.studioHandle === "string" ? candidate.studioHandle : "",
      createdAt:
        typeof candidate.createdAt === "string" && candidate.createdAt.trim()
          ? candidate.createdAt
          : new Date().toISOString()
    };
  });
}

function normalizeTownhallCommentVisibility(value: unknown): TownhallCommentVisibility {
  if (value === "hidden" || value === "restricted" || value === "deleted") {
    return value;
  }

  return "visible";
}

function normalizeTownhallCommentRecords(events: TownhallCommentRecord[]): TownhallCommentRecord[] {
  return events.map((event) => {
    const candidate = event as Partial<TownhallCommentRecord> & {
      parentCommentId?: unknown;
      visibility?: unknown;
      reportCount?: unknown;
      reportedAt?: unknown;
      moderatedAt?: unknown;
      moderatedByAccountId?: unknown;
      appealRequestedAt?: unknown;
      appealRequestedByAccountId?: unknown;
    };

    return {
      ...event,
      parentCommentId:
        typeof candidate.parentCommentId === "string" && candidate.parentCommentId.trim()
          ? candidate.parentCommentId
          : null,
      visibility: normalizeTownhallCommentVisibility(candidate.visibility),
      reportCount:
        typeof candidate.reportCount === "number" && Number.isFinite(candidate.reportCount)
          ? Math.max(0, Math.floor(candidate.reportCount))
          : 0,
      reportedAt: typeof candidate.reportedAt === "string" && candidate.reportedAt.trim() ? candidate.reportedAt : null,
      moderatedAt:
        typeof candidate.moderatedAt === "string" && candidate.moderatedAt.trim()
          ? candidate.moderatedAt
          : null,
      moderatedByAccountId:
        typeof candidate.moderatedByAccountId === "string" && candidate.moderatedByAccountId.trim()
          ? candidate.moderatedByAccountId
          : null,
      appealRequestedAt:
        typeof candidate.appealRequestedAt === "string" && candidate.appealRequestedAt.trim()
          ? candidate.appealRequestedAt
          : null,
      appealRequestedByAccountId:
        typeof candidate.appealRequestedByAccountId === "string" &&
        candidate.appealRequestedByAccountId.trim()
          ? candidate.appealRequestedByAccountId
          : null
    };
  });
}

function normalizeTownhallPostLinkedObjectKind(value: unknown): TownhallPostLinkedObjectKind | null {
  if (value === "drop" || value === "world" || value === "studio") {
    return value;
  }

  return null;
}

function normalizeTownhallPostRecords(records: TownhallPostRecord[]): TownhallPostRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<TownhallPostRecord> & {
      visibility?: unknown;
      reportCount?: unknown;
      reportedAt?: unknown;
      moderatedAt?: unknown;
      moderatedByAccountId?: unknown;
      appealRequestedAt?: unknown;
      appealRequestedByAccountId?: unknown;
      linkedObjectKind?: unknown;
      linkedObjectId?: unknown;
      linkedObjectLabel?: unknown;
      linkedObjectHref?: unknown;
    };

    return {
      id:
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id
          : `post_${randomUUID()}`,
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      body: typeof candidate.body === "string" ? candidate.body : "",
      createdAt:
        typeof candidate.createdAt === "string" && candidate.createdAt.trim()
          ? candidate.createdAt
          : new Date().toISOString(),
      visibility: normalizeTownhallCommentVisibility(candidate.visibility),
      reportCount:
        typeof candidate.reportCount === "number" && Number.isFinite(candidate.reportCount)
          ? Math.max(0, Math.floor(candidate.reportCount))
          : 0,
      reportedAt:
        typeof candidate.reportedAt === "string" && candidate.reportedAt.trim()
          ? candidate.reportedAt
          : null,
      moderatedAt:
        typeof candidate.moderatedAt === "string" && candidate.moderatedAt.trim()
          ? candidate.moderatedAt
          : null,
      moderatedByAccountId:
        typeof candidate.moderatedByAccountId === "string" && candidate.moderatedByAccountId.trim()
          ? candidate.moderatedByAccountId
          : null,
      appealRequestedAt:
        typeof candidate.appealRequestedAt === "string" && candidate.appealRequestedAt.trim()
          ? candidate.appealRequestedAt
          : null,
      appealRequestedByAccountId:
        typeof candidate.appealRequestedByAccountId === "string" &&
        candidate.appealRequestedByAccountId.trim()
          ? candidate.appealRequestedByAccountId
          : null,
      linkedObjectKind: normalizeTownhallPostLinkedObjectKind(candidate.linkedObjectKind),
      linkedObjectId:
        typeof candidate.linkedObjectId === "string" && candidate.linkedObjectId.trim()
          ? candidate.linkedObjectId
          : null,
      linkedObjectLabel:
        typeof candidate.linkedObjectLabel === "string" && candidate.linkedObjectLabel.trim()
          ? candidate.linkedObjectLabel
          : null,
      linkedObjectHref:
        typeof candidate.linkedObjectHref === "string" && candidate.linkedObjectHref.trim()
          ? candidate.linkedObjectHref
          : null
    };
  });
}

function normalizeTownhallShareChannel(value: unknown): TownhallShareChannel {
  if (value === "sms" || value === "internal_dm" || value === "whatsapp" || value === "telegram") {
    return value;
  }

  return "internal_dm";
}

function normalizeTownhallPostSaveRecords(
  records: TownhallPostSaveRecord[]
): TownhallPostSaveRecord[] {
  return records
    .map((record) => {
      const candidate = record as Partial<TownhallPostSaveRecord>;
      const accountId = typeof candidate.accountId === "string" ? candidate.accountId : "";
      const postId = typeof candidate.postId === "string" ? candidate.postId : "";
      if (!accountId || !postId) {
        return null;
      }

      return {
        accountId,
        postId,
        savedAt:
          typeof candidate.savedAt === "string" && candidate.savedAt.trim().length > 0
            ? candidate.savedAt
            : new Date().toISOString()
      } satisfies TownhallPostSaveRecord;
    })
    .filter((record): record is TownhallPostSaveRecord => record !== null);
}

function normalizeTownhallPostFollowRecords(
  records: TownhallPostFollowRecord[]
): TownhallPostFollowRecord[] {
  return records
    .map((record) => {
      const candidate = record as Partial<TownhallPostFollowRecord>;
      const accountId = typeof candidate.accountId === "string" ? candidate.accountId : "";
      const postId = typeof candidate.postId === "string" ? candidate.postId : "";
      if (!accountId || !postId) {
        return null;
      }

      return {
        accountId,
        postId,
        followedAt:
          typeof candidate.followedAt === "string" && candidate.followedAt.trim().length > 0
            ? candidate.followedAt
            : new Date().toISOString()
      } satisfies TownhallPostFollowRecord;
    })
    .filter((record): record is TownhallPostFollowRecord => record !== null);
}

function normalizeTownhallPostShareRecords(
  records: TownhallPostShareRecord[]
): TownhallPostShareRecord[] {
  return records
    .map((record) => {
      const candidate = record as Partial<TownhallPostShareRecord>;
      const accountId = typeof candidate.accountId === "string" ? candidate.accountId : "";
      const postId = typeof candidate.postId === "string" ? candidate.postId : "";
      if (!accountId || !postId) {
        return null;
      }

      return {
        id:
          typeof candidate.id === "string" && candidate.id.trim().length > 0
            ? candidate.id
            : `pshr_${randomUUID()}`,
        accountId,
        postId,
        channel: normalizeTownhallShareChannel(candidate.channel),
        sharedAt:
          typeof candidate.sharedAt === "string" && candidate.sharedAt.trim().length > 0
            ? candidate.sharedAt
            : new Date().toISOString()
      } satisfies TownhallPostShareRecord;
    })
    .filter((record): record is TownhallPostShareRecord => record !== null);
}

function normalizeWorldConversationVisibility(value: unknown): WorldConversationVisibility {
  if (value === "hidden" || value === "restricted" || value === "deleted") {
    return value;
  }

  return "visible";
}

function normalizeWorldConversationMessageRecords(
  messages: WorldConversationMessageRecord[]
): WorldConversationMessageRecord[] {
  return messages.map((message) => {
    const candidate = message as Partial<WorldConversationMessageRecord> & {
      worldId?: unknown;
      accountId?: unknown;
      parentMessageId?: unknown;
      body?: unknown;
      createdAt?: unknown;
      visibility?: unknown;
      reportCount?: unknown;
      reportedAt?: unknown;
      moderatedAt?: unknown;
      moderatedByAccountId?: unknown;
      appealRequestedAt?: unknown;
      appealRequestedByAccountId?: unknown;
    };

    return {
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `wcm_${randomUUID()}`,
      worldId: typeof candidate.worldId === "string" ? candidate.worldId : "",
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      parentMessageId:
        typeof candidate.parentMessageId === "string" && candidate.parentMessageId.trim()
          ? candidate.parentMessageId
          : null,
      body: typeof candidate.body === "string" ? candidate.body : "",
      createdAt:
        typeof candidate.createdAt === "string" && candidate.createdAt.trim()
          ? candidate.createdAt
          : new Date().toISOString(),
      visibility: normalizeWorldConversationVisibility(candidate.visibility),
      reportCount:
        typeof candidate.reportCount === "number" && Number.isFinite(candidate.reportCount)
          ? Math.max(0, Math.floor(candidate.reportCount))
          : 0,
      reportedAt:
        typeof candidate.reportedAt === "string" && candidate.reportedAt.trim()
          ? candidate.reportedAt
          : null,
      moderatedAt:
        typeof candidate.moderatedAt === "string" && candidate.moderatedAt.trim()
          ? candidate.moderatedAt
          : null,
      moderatedByAccountId:
        typeof candidate.moderatedByAccountId === "string" && candidate.moderatedByAccountId.trim()
          ? candidate.moderatedByAccountId
          : null,
      appealRequestedAt:
        typeof candidate.appealRequestedAt === "string" && candidate.appealRequestedAt.trim()
          ? candidate.appealRequestedAt
          : null,
      appealRequestedByAccountId:
        typeof candidate.appealRequestedByAccountId === "string" &&
        candidate.appealRequestedByAccountId.trim()
          ? candidate.appealRequestedByAccountId
          : null
    };
  });
}

function normalizeLiveSessionConversationMessageRecords(
  messages: LiveSessionConversationMessageRecord[]
): LiveSessionConversationMessageRecord[] {
  return messages.map((message) => {
    const candidate = message as Partial<LiveSessionConversationMessageRecord> & {
      liveSessionId?: unknown;
      accountId?: unknown;
      parentMessageId?: unknown;
      body?: unknown;
      createdAt?: unknown;
      visibility?: unknown;
      reportCount?: unknown;
      reportedAt?: unknown;
      moderatedAt?: unknown;
      moderatedByAccountId?: unknown;
      appealRequestedAt?: unknown;
      appealRequestedByAccountId?: unknown;
    };

    return {
      id:
        typeof candidate.id === "string" && candidate.id.trim()
          ? candidate.id
          : `lscm_${randomUUID()}`,
      liveSessionId: typeof candidate.liveSessionId === "string" ? candidate.liveSessionId : "",
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      parentMessageId:
        typeof candidate.parentMessageId === "string" && candidate.parentMessageId.trim()
          ? candidate.parentMessageId
          : null,
      body: typeof candidate.body === "string" ? candidate.body : "",
      createdAt:
        typeof candidate.createdAt === "string" && candidate.createdAt.trim()
          ? candidate.createdAt
          : new Date().toISOString(),
      visibility: normalizeWorldConversationVisibility(candidate.visibility),
      reportCount:
        typeof candidate.reportCount === "number" && Number.isFinite(candidate.reportCount)
          ? Math.max(0, Math.floor(candidate.reportCount))
          : 0,
      reportedAt:
        typeof candidate.reportedAt === "string" && candidate.reportedAt.trim()
          ? candidate.reportedAt
          : null,
      moderatedAt:
        typeof candidate.moderatedAt === "string" && candidate.moderatedAt.trim()
          ? candidate.moderatedAt
          : null,
      moderatedByAccountId:
        typeof candidate.moderatedByAccountId === "string" &&
        candidate.moderatedByAccountId.trim()
          ? candidate.moderatedByAccountId
          : null,
      appealRequestedAt:
        typeof candidate.appealRequestedAt === "string" && candidate.appealRequestedAt.trim()
          ? candidate.appealRequestedAt
          : null,
      appealRequestedByAccountId:
        typeof candidate.appealRequestedByAccountId === "string" &&
        candidate.appealRequestedByAccountId.trim()
          ? candidate.appealRequestedByAccountId
          : null
    };
  });
}

function normalizeWatchAccessGrantRecords(records: WatchAccessGrantRecord[]): WatchAccessGrantRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<WatchAccessGrantRecord>;
    return {
      tokenId: typeof candidate.tokenId === "string" ? candidate.tokenId : "",
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      dropId: typeof candidate.dropId === "string" ? candidate.dropId : "",
      issuedAt:
        typeof candidate.issuedAt === "string" && candidate.issuedAt.trim().length > 0
          ? candidate.issuedAt
          : new Date().toISOString(),
      expiresAt:
        typeof candidate.expiresAt === "string" && candidate.expiresAt.trim().length > 0
          ? candidate.expiresAt
          : new Date().toISOString(),
      consumedAt:
        typeof candidate.consumedAt === "string" && candidate.consumedAt.trim().length > 0
          ? candidate.consumedAt
          : null
    };
  });
}

function normalizeWatchSessionStatus(value: unknown): WatchSessionStatus {
  return value === "ended" ? "ended" : "active";
}

function normalizeWatchSessionEndReason(value: unknown): WatchSessionEndReason | null {
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

function normalizeWatchQualityMode(value: unknown): WatchQualityMode | null {
  if (value === "auto" || value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return null;
}

function normalizeWatchQualityLevel(value: unknown): WatchQualityLevel | null {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return null;
}

function normalizeWatchSessionRecords(records: WatchSessionRecord[]): WatchSessionRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<WatchSessionRecord>;
    const status = normalizeWatchSessionStatus(candidate.status);
    return {
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `wss_${randomUUID()}`,
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      dropId: typeof candidate.dropId === "string" ? candidate.dropId : "",
      status,
      startedAt:
        typeof candidate.startedAt === "string" && candidate.startedAt.trim()
          ? candidate.startedAt
          : new Date().toISOString(),
      lastHeartbeatAt:
        typeof candidate.lastHeartbeatAt === "string" && candidate.lastHeartbeatAt.trim()
          ? candidate.lastHeartbeatAt
          : typeof candidate.startedAt === "string" && candidate.startedAt.trim()
            ? candidate.startedAt
            : new Date().toISOString(),
      endedAt:
        status === "ended" && typeof candidate.endedAt === "string" && candidate.endedAt.trim()
          ? candidate.endedAt
          : null,
      endReason: status === "ended" ? normalizeWatchSessionEndReason(candidate.endReason) : null,
      heartbeatCount:
        typeof candidate.heartbeatCount === "number" && Number.isFinite(candidate.heartbeatCount)
          ? Math.max(0, Math.floor(candidate.heartbeatCount))
          : 0,
      totalWatchTimeSeconds:
        typeof candidate.totalWatchTimeSeconds === "number" && Number.isFinite(candidate.totalWatchTimeSeconds)
          ? Number(Math.max(0, candidate.totalWatchTimeSeconds).toFixed(2))
          : 0,
      completionPercent:
        typeof candidate.completionPercent === "number" && Number.isFinite(candidate.completionPercent)
          ? Number(Math.min(100, Math.max(0, candidate.completionPercent)).toFixed(2))
          : 0,
      rebufferCount:
        typeof candidate.rebufferCount === "number" && Number.isFinite(candidate.rebufferCount)
          ? Math.max(0, Math.floor(candidate.rebufferCount))
          : 0,
      qualityStepDownCount:
        typeof candidate.qualityStepDownCount === "number" &&
        Number.isFinite(candidate.qualityStepDownCount)
          ? Math.max(0, Math.floor(candidate.qualityStepDownCount))
          : 0,
      lastQualityMode: normalizeWatchQualityMode(candidate.lastQualityMode),
      lastQualityLevel: normalizeWatchQualityLevel(candidate.lastQualityLevel)
    };
  });
}

function normalizeReceiptBadgeRecords(records: ReceiptBadgeRecord[]): ReceiptBadgeRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<ReceiptBadgeRecord>;
    return {
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `badge_${randomUUID()}`,
      dropTitle: typeof candidate.dropTitle === "string" ? candidate.dropTitle : "",
      worldTitle:
        typeof candidate.worldTitle === "string" && candidate.worldTitle.trim()
          ? candidate.worldTitle
          : undefined,
      collectDate:
        typeof candidate.collectDate === "string" && candidate.collectDate.trim()
          ? candidate.collectDate
          : new Date().toISOString(),
      editionPosition:
        typeof candidate.editionPosition === "string" && candidate.editionPosition.trim()
          ? candidate.editionPosition
          : undefined,
      collectorHandle: typeof candidate.collectorHandle === "string" ? candidate.collectorHandle : "",
      createdAt:
        typeof candidate.createdAt === "string" && candidate.createdAt.trim()
          ? candidate.createdAt
          : new Date().toISOString(),
      receiptId: typeof candidate.receiptId === "string" ? candidate.receiptId : "",
      ownerAccountId: typeof candidate.ownerAccountId === "string" ? candidate.ownerAccountId : ""
    };
  });
}

function normalizeDatabase(input: unknown): BffDatabase | null {
  if (isValidDb(input)) {
    return {
      ...input,
      catalog: {
        drops: input.catalog.drops.map((drop) => normalizeDropRecord(drop)),
        worlds: input.catalog.worlds.map((world) => normalizeWorldRecord(world)),
        studios: input.catalog.studios
      },
      watchAccessGrants: normalizeWatchAccessGrantRecords(input.watchAccessGrants),
      watchSessions: normalizeWatchSessionRecords(input.watchSessions),
      libraryEligibilityStates: normalizeLibraryEligibilityStateRecords(
        input.libraryEligibilityStates
      ),
      receiptBadges: normalizeReceiptBadgeRecords(input.receiptBadges),
      membershipEntitlements: normalizeMembershipEntitlementRecords(input.membershipEntitlements),
      patrons: normalizePatronRecords(input.patrons),
      patronCommitments: normalizePatronCommitmentRecords(input.patronCommitments),
      patronTierConfigs: normalizePatronTierConfigRecords(input.patronTierConfigs),
      workshopProProfiles: normalizeWorkshopProProfileRecords(input.workshopProProfiles),
      liveSessions: normalizeLiveSessionRecords(input.liveSessions),
      liveSessionAttendees: normalizeLiveSessionAttendeeRecords(input.liveSessionAttendees),
      liveSessionArtifacts: normalizeLiveSessionArtifactRecords(input.liveSessionArtifacts),
      townhallComments: normalizeTownhallCommentRecords(input.townhallComments),
      townhallPosts: normalizeTownhallPostRecords(input.townhallPosts),
      townhallPostSaves: normalizeTownhallPostSaveRecords(input.townhallPostSaves),
      townhallPostFollows: normalizeTownhallPostFollowRecords(input.townhallPostFollows),
      townhallPostShares: normalizeTownhallPostShareRecords(input.townhallPostShares),
      townhallTelemetryEvents: normalizeTownhallTelemetryEvents(input.townhallTelemetryEvents),
      worldConversationMessages: normalizeWorldConversationMessageRecords(
        input.worldConversationMessages
      ),
      liveSessionConversationMessages: normalizeLiveSessionConversationMessageRecords(
        input.liveSessionConversationMessages
      ),
      payments: normalizePaymentRecords(input.payments),
      collectOffers: normalizeCollectOfferRecords(input.collectOffers),
      collectEnforcementSignals: normalizeCollectEnforcementSignalRecords(
        input.collectEnforcementSignals
      ),
      worldCollectOwnerships: normalizeWorldCollectOwnershipRecords(input.worldCollectOwnerships),
      worldReleaseQueue: normalizeWorldReleaseQueueRecords(input.worldReleaseQueue),
      dropVersions: normalizeDropVersionRecords(input.dropVersions),
      authorizedDerivatives: normalizeAuthorizedDerivativeRecords(input.authorizedDerivatives),
      ledgerTransactions: normalizeLedgerTransactionRecords(input.ledgerTransactions),
      ledgerLineItems: normalizeLedgerLineItemRecords(input.ledgerLineItems),
      studioFollows: normalizeStudioFollowRecords(input.studioFollows),
      notificationEntries: Array.isArray(input.notificationEntries)
        ? (input.notificationEntries as NotificationEntryRecord[])
        : [],
      notificationPreferences: Array.isArray(input.notificationPreferences)
        ? (input.notificationPreferences as NotificationPreferencesRecord[])
        : [],
      totpEnrollments: Array.isArray(input.totpEnrollments)
        ? (input.totpEnrollments as TotpEnrollmentRecord[])
        : [],
      walletConnections: Array.isArray(input.walletConnections)
        ? (input.walletConnections as WalletConnectionRecord[])
        : []
    };
  }

  if (hasLegacyBaseDbShape(input)) {
    const candidate = input as Record<string, unknown>;
    return {
      ...input,
      catalog: {
        drops: input.catalog.drops.map((drop) => normalizeDropRecord(drop)),
        worlds: input.catalog.worlds.map((world) => normalizeWorldRecord(world)),
        studios: input.catalog.studios
      },
      stripeWebhookEvents: Array.isArray(candidate.stripeWebhookEvents)
        ? (candidate.stripeWebhookEvents as StripeWebhookEventRecord[])
        : [],
      watchAccessGrants: Array.isArray(candidate.watchAccessGrants)
        ? normalizeWatchAccessGrantRecords(candidate.watchAccessGrants as WatchAccessGrantRecord[])
        : [],
      watchSessions: Array.isArray(candidate.watchSessions)
        ? normalizeWatchSessionRecords(candidate.watchSessions as WatchSessionRecord[])
        : [],
      libraryEligibilityStates: Array.isArray(candidate.libraryEligibilityStates)
        ? normalizeLibraryEligibilityStateRecords(
            candidate.libraryEligibilityStates as LibraryEligibilityStateRecord[]
          )
        : [],
      receiptBadges: Array.isArray(candidate.receiptBadges)
        ? normalizeReceiptBadgeRecords(candidate.receiptBadges as ReceiptBadgeRecord[])
        : [],
      membershipEntitlements: Array.isArray(candidate.membershipEntitlements)
        ? normalizeMembershipEntitlementRecords(
            candidate.membershipEntitlements as MembershipEntitlementRecord[]
          )
        : [],
      patrons: Array.isArray(candidate.patrons)
        ? normalizePatronRecords(candidate.patrons as PatronRecord[])
        : [],
      patronCommitments: Array.isArray(candidate.patronCommitments)
        ? normalizePatronCommitmentRecords(
            candidate.patronCommitments as PatronCommitmentRecord[]
          )
        : [],
      patronTierConfigs: Array.isArray(candidate.patronTierConfigs)
        ? normalizePatronTierConfigRecords(
            candidate.patronTierConfigs as PatronTierConfigRecord[]
          )
        : [],
      workshopProProfiles: Array.isArray(candidate.workshopProProfiles)
        ? normalizeWorkshopProProfileRecords(
            candidate.workshopProProfiles as WorkshopProProfileRecord[]
          )
        : [],
      liveSessions: Array.isArray(candidate.liveSessions)
        ? normalizeLiveSessionRecords(candidate.liveSessions as LiveSessionRecord[])
        : [],
      liveSessionAttendees: Array.isArray(candidate.liveSessionAttendees)
        ? normalizeLiveSessionAttendeeRecords(
            candidate.liveSessionAttendees as LiveSessionAttendeeRecord[]
          )
        : [],
      liveSessionArtifacts: Array.isArray(candidate.liveSessionArtifacts)
        ? normalizeLiveSessionArtifactRecords(
            candidate.liveSessionArtifacts as LiveSessionArtifactRecord[]
          )
        : [],
      townhallLikes: Array.isArray(candidate.townhallLikes)
        ? (candidate.townhallLikes as TownhallLikeRecord[])
        : [],
      townhallComments: Array.isArray(candidate.townhallComments)
        ? normalizeTownhallCommentRecords(candidate.townhallComments as TownhallCommentRecord[])
        : [],
      townhallPosts: Array.isArray(candidate.townhallPosts)
        ? normalizeTownhallPostRecords(candidate.townhallPosts as TownhallPostRecord[])
        : [],
      townhallPostSaves: Array.isArray(candidate.townhallPostSaves)
        ? normalizeTownhallPostSaveRecords(candidate.townhallPostSaves as TownhallPostSaveRecord[])
        : [],
      townhallPostFollows: Array.isArray(candidate.townhallPostFollows)
        ? normalizeTownhallPostFollowRecords(
            candidate.townhallPostFollows as TownhallPostFollowRecord[]
          )
        : [],
      townhallPostShares: Array.isArray(candidate.townhallPostShares)
        ? normalizeTownhallPostShareRecords(candidate.townhallPostShares as TownhallPostShareRecord[])
        : [],
      townhallShares: Array.isArray(candidate.townhallShares)
        ? (candidate.townhallShares as TownhallShareRecord[])
        : [],
      townhallTelemetryEvents: Array.isArray(candidate.townhallTelemetryEvents)
        ? normalizeTownhallTelemetryEvents(
            candidate.townhallTelemetryEvents as TownhallTelemetryEventRecord[]
          )
        : [],
      worldConversationMessages: Array.isArray(candidate.worldConversationMessages)
        ? normalizeWorldConversationMessageRecords(
            candidate.worldConversationMessages as WorldConversationMessageRecord[]
          )
        : [],
      liveSessionConversationMessages: Array.isArray(candidate.liveSessionConversationMessages)
        ? normalizeLiveSessionConversationMessageRecords(
            candidate.liveSessionConversationMessages as LiveSessionConversationMessageRecord[]
          )
        : [],
      payments: Array.isArray(candidate.payments)
        ? normalizePaymentRecords(candidate.payments as PaymentRecord[])
        : [],
      collectOffers: Array.isArray(candidate.collectOffers)
        ? normalizeCollectOfferRecords(candidate.collectOffers as CollectOfferRecord[])
        : [],
      collectEnforcementSignals: Array.isArray(candidate.collectEnforcementSignals)
        ? normalizeCollectEnforcementSignalRecords(
            candidate.collectEnforcementSignals as CollectEnforcementSignalRecord[]
          )
        : [],
      worldCollectOwnerships: Array.isArray(candidate.worldCollectOwnerships)
        ? normalizeWorldCollectOwnershipRecords(
            candidate.worldCollectOwnerships as WorldCollectOwnershipRecord[]
          )
        : [],
      worldReleaseQueue: Array.isArray(candidate.worldReleaseQueue)
        ? normalizeWorldReleaseQueueRecords(candidate.worldReleaseQueue as WorldReleaseQueueRecord[])
        : [],
      dropVersions: Array.isArray(candidate.dropVersions)
        ? normalizeDropVersionRecords(candidate.dropVersions as DropVersionRecord[])
        : [],
      authorizedDerivatives: Array.isArray(candidate.authorizedDerivatives)
        ? normalizeAuthorizedDerivativeRecords(
            candidate.authorizedDerivatives as AuthorizedDerivativeRecord[]
          )
        : [],
      ledgerTransactions: Array.isArray(candidate.ledgerTransactions)
        ? normalizeLedgerTransactionRecords(candidate.ledgerTransactions as LedgerTransactionRecord[])
        : [],
      ledgerLineItems: Array.isArray(candidate.ledgerLineItems)
        ? normalizeLedgerLineItemRecords(candidate.ledgerLineItems as LedgerLineItemRecord[])
        : [],
      studioFollows: Array.isArray(candidate.studioFollows)
        ? normalizeStudioFollowRecords(candidate.studioFollows as StudioFollowRecord[])
        : [],
      notificationEntries: Array.isArray(candidate.notificationEntries)
        ? (candidate.notificationEntries as NotificationEntryRecord[])
        : [],
      notificationPreferences: Array.isArray(candidate.notificationPreferences)
        ? (candidate.notificationPreferences as NotificationPreferencesRecord[])
        : [],
      totpEnrollments: Array.isArray(candidate.totpEnrollments)
        ? (candidate.totpEnrollments as TotpEnrollmentRecord[])
        : [],
      walletConnections: Array.isArray(candidate.walletConnections)
        ? (candidate.walletConnections as WalletConnectionRecord[])
        : []
    };
  }

  return null;
}

async function readFileDatabase(dbPath: string): Promise<BffDatabase | null> {
  try {
    const raw = await fs.readFile(dbPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return normalizeDatabase(parsed);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return null;
    }

    if (error instanceof SyntaxError) {
      console.warn(`[bff] corrupted database file at ${dbPath}, re-seeding`);
      return null;
    }

    throw error;
  }
}

async function loadFileDb(): Promise<BffDatabase> {
  const dbPath = resolveDbPath();
  if (cachedDb && cachedPath === dbPath) {
    return cachedDb;
  }

  const loaded = await readFileDatabase(dbPath);
  if (loaded) {
    cachedPath = dbPath;
    cachedDb = loaded;
    return cachedDb;
  }

  const seeded = createSeedDatabase();
  const dir = path.dirname(dbPath);
  await fs.mkdir(dir, { recursive: true });
  const content = JSON.stringify(seeded, null, 2) + "\n";
  const tmpPath = `${dbPath}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmpPath, content, "utf8");
    await fs.rename(tmpPath, dbPath);
  } catch {
    await fs.writeFile(dbPath, content, "utf8");
    try { await fs.unlink(tmpPath); } catch { /* ignore cleanup */ }
  }
  cachedPath = dbPath;
  cachedDb = seeded;
  return cachedDb;
}

async function persistFileDb(db: BffDatabase): Promise<void> {
  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  await fs.mkdir(dir, { recursive: true });
  const content = JSON.stringify(db, null, 2) + "\n";

  // Atomic write: temp file then rename. Fall back to direct write on error.
  const tmpPath = `${dbPath}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmpPath, content, "utf8");
    await fs.rename(tmpPath, dbPath);
  } catch {
    // Rename can fail on certain CI/Docker filesystems — fall back to direct write.
    await fs.writeFile(dbPath, content, "utf8");
    try { await fs.unlink(tmpPath); } catch { /* ignore cleanup */ }
  }
}

function normalizeDropVisibility(value: unknown): DropVisibility {
  if (value === "world_members" || value === "collectors_only") {
    return value;
  }

  return "public";
}

function normalizeDropVisibilitySource(value: unknown): DropVisibilitySource {
  return value === "world_default" ? "world_default" : "drop";
}

function normalizePreviewPolicy(value: unknown): PreviewPolicy {
  if (value === "limited" || value === "poster") {
    return value;
  }

  return "full";
}

function normalizeCollaboratorSplits(value: unknown): Drop["collaborators"] | undefined {
  type Collaborator = NonNullable<Drop["collaborators"]>[number];

  if (!Array.isArray(value)) {
    return undefined;
  }

  const rows = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const candidate = entry as Partial<Collaborator>;
      if (
        typeof candidate.accountId !== "string" ||
        !candidate.accountId.trim() ||
        typeof candidate.handle !== "string" ||
        !candidate.handle.trim() ||
        typeof candidate.splitPercent !== "number" ||
        !Number.isFinite(candidate.splitPercent)
      ) {
        return null;
      }

      const splitPercent = Number(candidate.splitPercent.toFixed(2));
      if (splitPercent <= 0 || splitPercent > 100) {
        return null;
      }

      return {
        accountId: candidate.accountId,
        handle: candidate.handle,
        splitPercent
      } satisfies Collaborator;
    })
    .filter((entry): entry is Collaborator => entry !== null);

  if (rows.length === 0) {
    return undefined;
  }

  const total = Number(rows.reduce((sum, row) => sum + row.splitPercent, 0).toFixed(2));
  if (Math.abs(total - 100) > 0.01) {
    return undefined;
  }

  return rows;
}

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : fallback;
}

function normalizeWorldVisualIdentity(
  value: unknown,
  worldId: string
): NonNullable<World["visualIdentity"]> {
  const fallback = {
    coverImageSrc: `/images/worlds/${worldId || "world"}-cover.jpg`,
    colorPrimary: "#0b132b"
  } satisfies NonNullable<World["visualIdentity"]>;

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<NonNullable<World["visualIdentity"]>>;
  return {
    coverImageSrc:
      typeof candidate.coverImageSrc === "string" && candidate.coverImageSrc.trim()
        ? candidate.coverImageSrc
        : fallback.coverImageSrc,
    colorPrimary: normalizeHexColor(candidate.colorPrimary, fallback.colorPrimary),
    colorSecondary:
      typeof candidate.colorSecondary === "string"
        ? normalizeHexColor(candidate.colorSecondary, "#1c2541")
        : undefined,
    motionTreatment:
      typeof candidate.motionTreatment === "string" && candidate.motionTreatment.trim()
        ? candidate.motionTreatment
        : undefined
  };
}

function normalizeWorldRecord(world: World): World {
  const releaseStructureCandidate = world.releaseStructure;
  const releaseStructure =
    releaseStructureCandidate &&
    (releaseStructureCandidate.mode === "continuous" ||
      releaseStructureCandidate.mode === "seasons" ||
      releaseStructureCandidate.mode === "chapters")
      ? {
          mode: releaseStructureCandidate.mode,
          currentLabel:
            typeof releaseStructureCandidate.currentLabel === "string" &&
            releaseStructureCandidate.currentLabel.trim()
              ? releaseStructureCandidate.currentLabel
              : undefined
        }
      : undefined;

  return {
    ...world,
    visualIdentity: normalizeWorldVisualIdentity(world.visualIdentity, world.id),
    ambientAudioSrc:
      typeof world.ambientAudioSrc === "string" && world.ambientAudioSrc.trim()
        ? world.ambientAudioSrc
        : undefined,
    entryRule:
      world.entryRule === "membership" || world.entryRule === "patron" ? world.entryRule : "open",
    lore: typeof world.lore === "string" && world.lore.trim() ? world.lore : undefined,
    releaseStructure,
    defaultDropVisibility:
      typeof world.defaultDropVisibility === "string"
        ? normalizeDropVisibility(world.defaultDropVisibility)
        : undefined
  };
}

function normalizeDropRecord(drop: Drop): Drop {
  return {
    ...drop,
    previewMedia:
      drop.previewMedia && Object.keys(drop.previewMedia).length > 0
        ? drop.previewMedia
        : seedPreviewMediaForDrop(drop.id),
    collaborators: normalizeCollaboratorSplits(drop.collaborators),
    visibility: normalizeDropVisibility(drop.visibility),
    visibilitySource: normalizeDropVisibilitySource(drop.visibilitySource),
    previewPolicy: normalizePreviewPolicy(drop.previewPolicy),
    releaseAt: typeof drop.releaseAt === "string" && drop.releaseAt.trim() ? drop.releaseAt : undefined
  };
}

function parseDropJson(value: unknown): Drop {
  const parsed = (typeof value === "string" ? JSON.parse(value) : value) as Partial<Drop> | null;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid persisted drop payload");
  }

  const normalized: Drop = {
    id: String(parsed.id ?? ""),
    title: String(parsed.title ?? ""),
    seasonLabel: String(parsed.seasonLabel ?? ""),
    episodeLabel: String(parsed.episodeLabel ?? ""),
    studioHandle: String(parsed.studioHandle ?? ""),
    worldId: String(parsed.worldId ?? ""),
    worldLabel: String(parsed.worldLabel ?? ""),
    synopsis: String(parsed.synopsis ?? ""),
    releaseDate: String(parsed.releaseDate ?? ""),
    priceUsd: Number(parsed.priceUsd ?? 0),
    studioPinRank: parseOptionalPositiveInt(parsed.studioPinRank),
    worldOrderIndex: parseOptionalPositiveInt(parsed.worldOrderIndex),
    previewMedia:
      parsed.previewMedia && Object.keys(parsed.previewMedia).length > 0
        ? parsed.previewMedia
        : seedPreviewMediaForDrop(String(parsed.id ?? "")),
    walletGate: parseWalletChain(parsed.walletGate)
  };

  return normalizeDropRecord(normalized);
}

function parseOptionalPositiveInt(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  const intValue = Math.trunc(parsed);
  return intValue > 0 ? intValue : undefined;
}

const VALID_WALLET_CHAINS = new Set<string>(["ethereum", "tezos", "polygon"]);

function parseWalletChain(value: unknown): "ethereum" | "tezos" | "polygon" | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return VALID_WALLET_CHAINS.has(value) ? (value as "ethereum" | "tezos" | "polygon") : undefined;
}

function parseWorldJson(value: unknown): World {
  const world = (typeof value === "string" ? JSON.parse(value) : value) as World;
  return normalizeWorldRecord(world);
}

function parseStudioJson(value: unknown): Studio {
  return (typeof value === "string" ? JSON.parse(value) : value) as Studio;
}

async function ensurePostgresMigrations(client: PoolClient): Promise<void> {
  const connectionString = resolvePostgresConnectionString();
  if (migrationsBootstrappedFor === connectionString) {
    return;
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS ook_bff_schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const migrationsDir = resolveMigrationsDir();
  let files: string[] = [];

  try {
    files = (await fs.readdir(migrationsDir))
      .filter((entry) => entry.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      throw error;
    }
  }

  for (const fileName of files) {
    const existing = await client.query<{ version: string }>(
      "SELECT version FROM ook_bff_schema_migrations WHERE version = $1",
      [fileName]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, fileName), "utf8");
    if (sql.trim()) {
      await client.query(sql);
    }

    await client.query(
      "INSERT INTO ook_bff_schema_migrations (version, applied_at) VALUES ($1, $2)",
      [fileName, new Date().toISOString()]
    );
  }

  migrationsBootstrappedFor = connectionString;
}

function parseMetaJsonValue<T>(value: string | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function loadPostgresDb(client: PoolClient): Promise<BffDatabase | null> {
  const [
    metaResult,
    dropsResult,
    worldsResult,
    studiosResult,
    accountsResult,
    sessionsResult,
    ownershipsResult,
    savedDropsResult,
    receiptsResult,
    certificatesResult,
    receiptBadgesResult,
    paymentsResult,
    webhookEventsResult,
    watchAccessGrantsResult,
    watchSessionsResult,
    membershipEntitlementsResult,
    patronsResult,
    patronCommitmentsResult,
    patronTierConfigsResult,
    liveSessionsResult,
    townhallLikesResult,
    townhallCommentsResult,
    townhallPostsResult,
    townhallSharesResult,
    townhallTelemetryEventsResult,
    worldConversationMessagesResult,
    collectOffersResult,
    collectEnforcementSignalsResult,
    worldCollectOwnershipsResult,
    worldReleaseQueueResult,
    ledgerTransactionsResult,
    ledgerLineItemsResult,
    libraryEligibilityStatesResult,
    workshopProProfilesResult,
    liveSessionAttendeesResult,
    liveSessionArtifactsResult,
    liveSessionConversationMessagesResult,
    townhallPostSavesResult,
    townhallPostFollowsResult,
    townhallPostSharesResult,
    dropVersionsResult,
    authorizedDerivativesResult,
    studioFollowsResult
  ] = await Promise.all([
    client.query<{ key: string; value: string }>("SELECT key, value FROM bff_meta"),
    client.query<{ data: unknown }>("SELECT data FROM bff_catalog_drops ORDER BY id ASC"),
    client.query<{ data: unknown }>("SELECT data FROM bff_catalog_worlds ORDER BY id ASC"),
    client.query<{ data: unknown }>("SELECT data FROM bff_catalog_studios ORDER BY handle ASC"),
    client.query<{
      id: string;
      email: string;
      handle: string;
      displayName: string;
      roles: string[];
      createdAt: string;
    }>(
      'SELECT id, email, handle, display_name AS "displayName", roles, created_at AS "createdAt", avatar_url AS "avatarUrl", bio FROM bff_accounts ORDER BY created_at ASC'
    ),
    client.query<SessionRecord>(
      'SELECT token, account_id AS "accountId", created_at AS "createdAt", expires_at AS "expiresAt" FROM bff_sessions ORDER BY created_at ASC'
    ),
    client.query<OwnedDropRecord>(
      'SELECT account_id AS "accountId", drop_id AS "dropId", certificate_id AS "certificateId", receipt_id AS "receiptId", acquired_at AS "acquiredAt" FROM bff_ownerships ORDER BY acquired_at DESC'
    ),
    client.query<SavedDropRecord>(
      'SELECT account_id AS "accountId", drop_id AS "dropId", saved_at AS "savedAt" FROM bff_saved_drops ORDER BY saved_at DESC'
    ),
    client.query<{
      id: string;
      accountId: string;
      dropId: string;
      amountUsd: string | number;
      subtotalUsd: string | number | null;
      processingUsd: string | number | null;
      commissionUsd: string | number | null;
      payoutUsd: string | number | null;
      quoteEngineVersion: string | null;
      ledgerTransactionId: string | null;
      status: PurchaseReceipt["status"];
      purchasedAt: string;
    }>(
      'SELECT id, account_id AS "accountId", drop_id AS "dropId", amount_usd AS "amountUsd", subtotal_usd AS "subtotalUsd", processing_usd AS "processingUsd", commission_usd AS "commissionUsd", payout_usd AS "payoutUsd", quote_engine_version AS "quoteEngineVersion", ledger_transaction_id AS "ledgerTransactionId", status, purchased_at AS "purchasedAt" FROM bff_receipts ORDER BY purchased_at DESC'
    ),
    client.query<CertificateRecord>(
      'SELECT id, drop_id AS "dropId", drop_title AS "dropTitle", owner_handle AS "ownerHandle", issued_at AS "issuedAt", receipt_id AS "receiptId", status, owner_account_id AS "ownerAccountId" FROM bff_certificates ORDER BY issued_at DESC'
    ),
    client.query<{
      id: string;
      dropTitle: string;
      worldTitle: string | null;
      collectDate: string;
      editionPosition: string | null;
      collectorHandle: string;
      createdAt: string;
      receiptId: string;
      ownerAccountId: string;
    }>(
      'SELECT id, drop_title AS "dropTitle", world_title AS "worldTitle", collect_date AS "collectDate", edition_position AS "editionPosition", collector_handle AS "collectorHandle", created_at AS "createdAt", receipt_id AS "receiptId", owner_account_id AS "ownerAccountId" FROM bff_receipt_badges ORDER BY created_at DESC'
    ),
    client.query<{
      id: string;
      provider: PaymentRecord["provider"];
      status: PaymentRecord["status"];
      accountId: string;
      dropId: string;
      amountUsd: string | number;
      currency: PaymentRecord["currency"];
      checkoutSessionId: string | null;
      checkoutUrl: string | null;
      providerPaymentIntentId: string | null;
      receiptId: string | null;
      quoteJson: unknown;
      createdAt: string;
      updatedAt: string;
    }>(
      'SELECT id, provider, status, account_id AS "accountId", drop_id AS "dropId", amount_usd AS "amountUsd", currency, checkout_session_id AS "checkoutSessionId", checkout_url AS "checkoutUrl", provider_payment_intent_id AS "providerPaymentIntentId", receipt_id AS "receiptId", quote_json AS "quoteJson", created_at AS "createdAt", updated_at AS "updatedAt" FROM bff_payments ORDER BY created_at DESC'
    ),
    client.query<StripeWebhookEventRecord>(
      'SELECT event_id AS "eventId", processed_at AS "processedAt" FROM bff_stripe_webhook_events ORDER BY processed_at DESC'
    ),
    client.query<WatchAccessGrantRecord>(
      'SELECT token_id AS "tokenId", account_id AS "accountId", drop_id AS "dropId", issued_at AS "issuedAt", expires_at AS "expiresAt", consumed_at AS "consumedAt" FROM bff_watch_access_grants ORDER BY issued_at DESC'
    ),
    client.query<{
      id: string;
      accountId: string;
      dropId: string;
      status: WatchSessionStatus;
      startedAt: string;
      lastHeartbeatAt: string;
      endedAt: string | null;
      endReason: WatchSessionEndReason | null;
      heartbeatCount: string | number;
      totalWatchTimeSeconds: string | number;
      completionPercent: string | number;
      rebufferCount: string | number;
      qualityStepDownCount: string | number;
      lastQualityMode: WatchQualityMode | null;
      lastQualityLevel: WatchQualityLevel | null;
    }>(
      'SELECT id, account_id AS "accountId", drop_id AS "dropId", status, started_at AS "startedAt", last_heartbeat_at AS "lastHeartbeatAt", ended_at AS "endedAt", end_reason AS "endReason", heartbeat_count AS "heartbeatCount", total_watch_time_seconds AS "totalWatchTimeSeconds", completion_percent AS "completionPercent", rebuffer_count AS "rebufferCount", quality_step_down_count AS "qualityStepDownCount", last_quality_mode AS "lastQualityMode", last_quality_level AS "lastQualityLevel" FROM bff_watch_sessions ORDER BY started_at DESC'
    ),
    client.query<MembershipEntitlementRecord>(
      'SELECT id, account_id AS "accountId", studio_handle AS "studioHandle", world_id AS "worldId", status, started_at AS "startedAt", ends_at AS "endsAt" FROM bff_membership_entitlements ORDER BY started_at DESC'
    ),
    client.query<PatronRecord>(
      'SELECT id, account_id AS "accountId", handle, studio_handle AS "studioHandle", status, committed_at AS "committedAt", lapsed_at AS "lapsedAt" FROM bff_patrons ORDER BY committed_at DESC'
    ),
    client.query<PatronCommitmentRecord>(
      'SELECT id, patron_id AS "patronId", amount_cents AS "amountCents", period_start AS "periodStart", period_end AS "periodEnd", ledger_transaction_id AS "ledgerTransactionId" FROM bff_patron_commitments ORDER BY period_start DESC'
    ),
    client.query<{
      id: string;
      studioHandle: string;
      worldId: string | null;
      title: string;
      amountCents: string | number;
      commitmentCadence: PatronCommitmentCadence;
      periodDays: string | number;
      earlyAccessWindowHours: string | number;
      benefitsSummary: string;
      status: PatronTierStatus;
      updatedAt: string;
      updatedByHandle: string;
    }>(
      'SELECT id, studio_handle AS "studioHandle", world_id AS "worldId", title, amount_cents AS "amountCents", commitment_cadence AS "commitmentCadence", period_days AS "periodDays", early_access_window_hours AS "earlyAccessWindowHours", benefits_summary AS "benefitsSummary", status, updated_at AS "updatedAt", updated_by_handle AS "updatedByHandle" FROM bff_patron_tier_configs ORDER BY updated_at DESC'
    ),
    client.query<{
      id: string;
      studioHandle: string;
      worldId: string | null;
      dropId: string | null;
      title: string;
      synopsis: string;
      startsAt: string;
      endsAt: string | null;
      mode: "live";
      eligibilityRule: LiveSessionEligibilityRule;
      type: LiveSessionType | null;
      eligibility: LiveSessionAudienceEligibility | null;
      spatialAudio: boolean | null;
      exclusiveDropWindowDropId: string | null;
      exclusiveDropWindowDelay: number | string | null;
      capacity: number | string | null;
    }>(
      'SELECT id, studio_handle AS "studioHandle", world_id AS "worldId", drop_id AS "dropId", title, synopsis, starts_at AS "startsAt", ends_at AS "endsAt", mode, eligibility_rule AS "eligibilityRule", session_type AS "type", audience_eligibility AS "eligibility", spatial_audio AS "spatialAudio", exclusive_drop_window_drop_id AS "exclusiveDropWindowDropId", exclusive_drop_window_delay AS "exclusiveDropWindowDelay", capacity FROM bff_live_sessions ORDER BY starts_at ASC'
    ),
    client.query<TownhallLikeRecord>(
      'SELECT account_id AS "accountId", drop_id AS "dropId", liked_at AS "likedAt" FROM bff_townhall_likes ORDER BY liked_at DESC'
    ),
    client.query<TownhallCommentRecord>(
      'SELECT id, account_id AS "accountId", drop_id AS "dropId", parent_comment_id AS "parentCommentId", body, created_at AS "createdAt", status AS "visibility", report_count AS "reportCount", reported_at AS "reportedAt", moderated_at AS "moderatedAt", moderated_by_account_id AS "moderatedByAccountId", appeal_requested_at AS "appealRequestedAt", appeal_requested_by_account_id AS "appealRequestedByAccountId" FROM bff_townhall_comments ORDER BY created_at DESC'
    ),
    client.query<{
      id: string;
      accountId: string;
      body: string;
      createdAt: string;
      visibility: TownhallCommentVisibility;
      reportCount: string | number;
      reportedAt: string | null;
      moderatedAt: string | null;
      moderatedByAccountId: string | null;
      appealRequestedAt: string | null;
      appealRequestedByAccountId: string | null;
      linkedObjectKind: TownhallPostLinkedObjectKind | null;
      linkedObjectId: string | null;
      linkedObjectLabel: string | null;
      linkedObjectHref: string | null;
    }>(
      'SELECT id, account_id AS "accountId", body, created_at AS "createdAt", status AS "visibility", report_count AS "reportCount", reported_at AS "reportedAt", moderated_at AS "moderatedAt", moderated_by_account_id AS "moderatedByAccountId", appeal_requested_at AS "appealRequestedAt", appeal_requested_by_account_id AS "appealRequestedByAccountId", linked_object_kind AS "linkedObjectKind", linked_object_id AS "linkedObjectId", linked_object_label AS "linkedObjectLabel", linked_object_href AS "linkedObjectHref" FROM bff_townhall_posts ORDER BY created_at DESC'
    ),
    client.query<TownhallShareRecord>(
      'SELECT id, account_id AS "accountId", drop_id AS "dropId", channel, shared_at AS "sharedAt" FROM bff_townhall_shares ORDER BY shared_at DESC'
    ),
    client.query<{
      id: string;
      accountId: string | null;
      dropId: string;
      eventType: TownhallTelemetryEventType;
      watchTimeSeconds: string | number;
      completionPercent: string | number;
      metadataJson: unknown;
      occurredAt: string;
    }>(
      'SELECT id, account_id AS "accountId", drop_id AS "dropId", event_type AS "eventType", watch_time_seconds AS "watchTimeSeconds", completion_percent AS "completionPercent", metadata_json AS "metadataJson", occurred_at AS "occurredAt" FROM bff_townhall_telemetry_events ORDER BY occurred_at DESC'
    ),
    client.query<{
      id: string;
      worldId: string;
      accountId: string;
      parentMessageId: string | null;
      body: string;
      createdAt: string;
      visibility: WorldConversationVisibility;
      reportCount: number | string;
      reportedAt: string | null;
      moderatedAt: string | null;
      moderatedByAccountId: string | null;
      appealRequestedAt: string | null;
      appealRequestedByAccountId: string | null;
    }>(
      'SELECT id, world_id AS "worldId", account_id AS "accountId", parent_message_id AS "parentMessageId", body, created_at AS "createdAt", status AS "visibility", report_count AS "reportCount", reported_at AS "reportedAt", moderated_at AS "moderatedAt", moderated_by_account_id AS "moderatedByAccountId", appeal_requested_at AS "appealRequestedAt", appeal_requested_by_account_id AS "appealRequestedByAccountId" FROM bff_world_conversation_messages ORDER BY created_at DESC'
    ),
    client.query<{
      id: string;
      accountId: string;
      dropId: string;
      listingType: CollectListingType;
      amountUsd: string | number;
      state: CollectOfferState;
      createdAt: string;
      updatedAt: string;
      expiresAt: string | null;
      executionVisibility: "public" | "private";
      executionPriceUsd: string | number | null;
    }>(
      'SELECT id, account_id AS "accountId", drop_id AS "dropId", listing_type AS "listingType", amount_usd AS "amountUsd", state, created_at AS "createdAt", updated_at AS "updatedAt", expires_at AS "expiresAt", execution_visibility AS "executionVisibility", execution_price_usd AS "executionPriceUsd" FROM bff_collect_offers ORDER BY updated_at DESC'
    ),
    client.query<{
      id: string;
      signalType: CollectEnforcementSignalType;
      dropId: string | null;
      offerId: string | null;
      accountId: string | null;
      reason: string;
      occurredAt: string;
    }>(
      'SELECT id, signal_type AS "signalType", drop_id AS "dropId", offer_id AS "offerId", account_id AS "accountId", reason, occurred_at AS "occurredAt" FROM bff_collect_enforcement_signals ORDER BY occurred_at DESC'
    ),
    client.query<{
      id: string;
      accountId: string;
      worldId: string;
      bundleType: WorldCollectBundleType;
      status: WorldCollectOwnershipStatus;
      purchasedAt: string;
      amountPaidUsd: string | number;
      previousOwnershipCreditUsd: string | number;
      prorationStrategy: WorldCollectUpgradeProrationStrategy;
      upgradedToBundleType: WorldCollectBundleType | null;
      upgradedAt: string | null;
    }>(
      'SELECT id, account_id AS "accountId", world_id AS "worldId", bundle_type AS "bundleType", status, purchased_at AS "purchasedAt", amount_paid_usd AS "amountPaidUsd", previous_ownership_credit_usd AS "previousOwnershipCreditUsd", proration_strategy AS "prorationStrategy", upgraded_to_bundle_type AS "upgradedToBundleType", upgraded_at AS "upgradedAt" FROM bff_world_collect_ownerships ORDER BY purchased_at DESC'
    ),
    client.query<{
      id: string;
      studioHandle: string;
      worldId: string;
      dropId: string;
      scheduledFor: string;
      pacingMode: WorldReleaseQueuePacingMode;
      pacingWindowHours: string | number;
      status: WorldReleaseQueueStatus;
      createdByAccountId: string;
      createdAt: string;
      updatedAt: string;
      publishedAt: string | null;
      canceledAt: string | null;
    }>(
      'SELECT id, studio_handle AS "studioHandle", world_id AS "worldId", drop_id AS "dropId", scheduled_for AS "scheduledFor", pacing_mode AS "pacingMode", pacing_window_hours AS "pacingWindowHours", status, created_by_account_id AS "createdByAccountId", created_at AS "createdAt", updated_at AS "updatedAt", published_at AS "publishedAt", canceled_at AS "canceledAt" FROM bff_world_release_queue ORDER BY scheduled_for ASC, created_at ASC'
    ),
    client.query<{
      id: string;
      kind: LedgerTransactionRecord["kind"];
      accountId: string;
      dropId: string | null;
      paymentId: string | null;
      receiptId: string | null;
      currency: "USD";
      subtotalUsd: string | number;
      processingUsd: string | number;
      totalUsd: string | number;
      commissionUsd: string | number;
      payoutUsd: string | number;
      reversalOfTransactionId: string | null;
      createdAt: string;
    }>(
      'SELECT id, kind, account_id AS "accountId", drop_id AS "dropId", payment_id AS "paymentId", receipt_id AS "receiptId", currency, subtotal_usd AS "subtotalUsd", processing_usd AS "processingUsd", total_usd AS "totalUsd", commission_usd AS "commissionUsd", payout_usd AS "payoutUsd", reversal_of_transaction_id AS "reversalOfTransactionId", created_at AS "createdAt" FROM bff_ledger_transactions ORDER BY created_at ASC'
    ),
    client.query<{
      id: string;
      transactionId: string;
      kind: SettlementLineItem["kind"];
      scope: SettlementLineItem["scope"];
      amountUsd: string | number;
      currency: "USD";
      recipientAccountId: string | null;
      createdAt: string;
    }>(
      'SELECT id, transaction_id AS "transactionId", kind, scope, amount_usd AS "amountUsd", currency, recipient_account_id AS "recipientAccountId", created_at AS "createdAt" FROM bff_ledger_line_items ORDER BY created_at ASC'
    ),
    client.query<LibraryEligibilityStateRecord>(
      'SELECT account_id AS "accountId", drop_id AS "dropId", state, updated_at AS "updatedAt" FROM bff_library_eligibility_states'
    ).catch(() => ({ rows: [] as LibraryEligibilityStateRecord[], rowCount: 0 })),
    client.query<WorkshopProProfileRecord>(
      'SELECT studio_handle AS "studioHandle", state, cycle_anchor_at AS "cycleAnchorAt", past_due_at AS "pastDueAt", grace_ends_at AS "graceEndsAt", locked_at AS "lockedAt", updated_at AS "updatedAt" FROM bff_workshop_pro_profiles'
    ).catch(() => ({ rows: [] as WorkshopProProfileRecord[], rowCount: 0 })),
    client.query<LiveSessionAttendeeRecord>(
      'SELECT id, live_session_id AS "liveSessionId", account_id AS "accountId", joined_at AS "joinedAt" FROM bff_live_session_attendees ORDER BY joined_at ASC'
    ).catch(() => ({ rows: [] as LiveSessionAttendeeRecord[], rowCount: 0 })),
    client.query<LiveSessionArtifactRecord>(
      'SELECT id, live_session_id AS "liveSessionId", studio_handle AS "studioHandle", world_id AS "worldId", source_drop_id AS "sourceDropId", artifact_kind AS "artifactKind", title, synopsis, status, captured_at AS "capturedAt", approved_at AS "approvedAt", catalog_drop_id AS "catalogDropId", approved_by_handle AS "approvedByHandle" FROM bff_live_session_artifacts ORDER BY captured_at DESC'
    ).catch(() => ({ rows: [] as LiveSessionArtifactRecord[], rowCount: 0 })),
    client.query<{
      id: string;
      liveSessionId: string;
      accountId: string;
      parentMessageId: string | null;
      body: string;
      createdAt: string;
      visibility: WorldConversationVisibility;
      reportCount: number | string;
      reportedAt: string | null;
      moderatedAt: string | null;
      moderatedByAccountId: string | null;
      appealRequestedAt: string | null;
      appealRequestedByAccountId: string | null;
    }>(
      'SELECT id, live_session_id AS "liveSessionId", account_id AS "accountId", parent_message_id AS "parentMessageId", body, created_at AS "createdAt", visibility AS "visibility", report_count AS "reportCount", reported_at AS "reportedAt", moderated_at AS "moderatedAt", moderated_by_account_id AS "moderatedByAccountId", appeal_requested_at AS "appealRequestedAt", appeal_requested_by_account_id AS "appealRequestedByAccountId" FROM bff_live_session_conversation_messages ORDER BY created_at ASC'
    ).catch(() => ({ rows: [] as Array<{ id: string; liveSessionId: string; accountId: string; parentMessageId: string | null; body: string; createdAt: string; visibility: WorldConversationVisibility; reportCount: number | string; reportedAt: string | null; moderatedAt: string | null; moderatedByAccountId: string | null; appealRequestedAt: string | null; appealRequestedByAccountId: string | null }>, rowCount: 0 })),
    client.query<TownhallPostSaveRecord>(
      'SELECT account_id AS "accountId", post_id AS "postId", saved_at AS "savedAt" FROM bff_townhall_post_saves'
    ).catch(() => ({ rows: [] as TownhallPostSaveRecord[], rowCount: 0 })),
    client.query<TownhallPostFollowRecord>(
      'SELECT account_id AS "accountId", post_id AS "postId", followed_at AS "followedAt" FROM bff_townhall_post_follows'
    ).catch(() => ({ rows: [] as TownhallPostFollowRecord[], rowCount: 0 })),
    client.query<TownhallPostShareRecord>(
      'SELECT id, account_id AS "accountId", post_id AS "postId", channel, shared_at AS "sharedAt" FROM bff_townhall_post_shares ORDER BY shared_at DESC'
    ).catch(() => ({ rows: [] as TownhallPostShareRecord[], rowCount: 0 })),
    client.query<DropVersionRecord>(
      'SELECT id, drop_id AS "dropId", label, notes, created_by_handle AS "createdByHandle", created_at AS "createdAt", released_at AS "releasedAt" FROM bff_drop_versions ORDER BY created_at DESC'
    ).catch(() => ({ rows: [] as DropVersionRecord[], rowCount: 0 })),
    client.query<{
      id: string;
      sourceDropId: string;
      derivativeDropId: string;
      kind: AuthorizedDerivativeKind;
      attribution: string;
      revenueSplits: AuthorizedDerivativeRevenueSplitRecord[];
      authorizedByHandle: string;
      createdAt: string;
    }>(
      'SELECT id, source_drop_id AS "sourceDropId", derivative_drop_id AS "derivativeDropId", kind, attribution, revenue_splits AS "revenueSplits", authorized_by_handle AS "authorizedByHandle", created_at AS "createdAt" FROM bff_authorized_derivatives ORDER BY created_at DESC'
    ).catch(() => ({ rows: [] as Array<{ id: string; sourceDropId: string; derivativeDropId: string; kind: AuthorizedDerivativeKind; attribution: string; revenueSplits: AuthorizedDerivativeRevenueSplitRecord[]; authorizedByHandle: string; createdAt: string }>, rowCount: 0 })),
    client.query<StudioFollowRecord>(
      'SELECT id, account_id AS "accountId", studio_handle AS "studioHandle", created_at AS "createdAt" FROM bff_studio_follows ORDER BY created_at DESC'
    ).catch(() => ({ rows: [] as StudioFollowRecord[], rowCount: 0 }))
  ]);

  const isEmpty =
    metaResult.rowCount === 0 &&
    dropsResult.rowCount === 0 &&
    worldsResult.rowCount === 0 &&
    studiosResult.rowCount === 0 &&
    accountsResult.rowCount === 0 &&
    sessionsResult.rowCount === 0 &&
    ownershipsResult.rowCount === 0 &&
    savedDropsResult.rowCount === 0 &&
    receiptsResult.rowCount === 0 &&
    certificatesResult.rowCount === 0 &&
    receiptBadgesResult.rowCount === 0 &&
    paymentsResult.rowCount === 0 &&
    webhookEventsResult.rowCount === 0 &&
    watchAccessGrantsResult.rowCount === 0 &&
    watchSessionsResult.rowCount === 0 &&
    membershipEntitlementsResult.rowCount === 0 &&
    patronsResult.rowCount === 0 &&
    patronCommitmentsResult.rowCount === 0 &&
    patronTierConfigsResult.rowCount === 0 &&
    liveSessionsResult.rowCount === 0 &&
    townhallLikesResult.rowCount === 0 &&
    townhallCommentsResult.rowCount === 0 &&
    townhallPostsResult.rowCount === 0 &&
    townhallSharesResult.rowCount === 0 &&
    townhallTelemetryEventsResult.rowCount === 0 &&
    worldConversationMessagesResult.rowCount === 0 &&
    collectOffersResult.rowCount === 0 &&
    collectEnforcementSignalsResult.rowCount === 0 &&
    worldCollectOwnershipsResult.rowCount === 0 &&
    worldReleaseQueueResult.rowCount === 0 &&
    ledgerTransactionsResult.rowCount === 0 &&
    ledgerLineItemsResult.rowCount === 0;

  if (isEmpty) {
    return null;
  }

  const meta = new Map(metaResult.rows.map((row) => [row.key, row.value]));
  const persistedVersion = Number(meta.get("version") ?? DATA_VERSION);
  if (persistedVersion !== DATA_VERSION) {
    throw new Error(`unsupported persisted version in postgres: ${persistedVersion}`);
  }

  return {
    version: DATA_VERSION,
    catalog: {
      drops: dropsResult.rows.map((row) => parseDropJson(row.data)),
      worlds: worldsResult.rows.map((row) => parseWorldJson(row.data)),
      studios: studiosResult.rows.map((row) => parseStudioJson(row.data))
    },
    accounts: accountsResult.rows.map((row) => ({
      id: row.id,
      email: row.email,
      handle: row.handle,
      displayName: row.displayName,
      roles: row.roles.filter((role): role is AccountRole => role === "collector" || role === "creator"),
      createdAt: row.createdAt
    })),
    sessions: sessionsResult.rows,
    ownerships: ownershipsResult.rows,
    savedDrops: savedDropsResult.rows,
    libraryEligibilityStates: normalizeLibraryEligibilityStateRecords(
      libraryEligibilityStatesResult.rows.length > 0
        ? libraryEligibilityStatesResult.rows
        : parseMetaJsonValue<LibraryEligibilityStateRecord[]>(meta.get("library_eligibility_states_json"), [])
    ),
    receipts: receiptsResult.rows.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      dropId: row.dropId,
      amountUsd: Number(row.amountUsd),
      subtotalUsd:
        row.subtotalUsd === null || row.subtotalUsd === undefined ? undefined : Number(row.subtotalUsd),
      processingUsd:
        row.processingUsd === null || row.processingUsd === undefined
          ? undefined
          : Number(row.processingUsd),
      commissionUsd:
        row.commissionUsd === null || row.commissionUsd === undefined
          ? undefined
          : Number(row.commissionUsd),
      payoutUsd:
        row.payoutUsd === null || row.payoutUsd === undefined ? undefined : Number(row.payoutUsd),
      quoteEngineVersion:
        row.quoteEngineVersion === "quote_engine_v1" ? row.quoteEngineVersion : undefined,
      ledgerTransactionId: row.ledgerTransactionId ?? undefined,
      status: row.status,
      purchasedAt: row.purchasedAt
    })),
    certificates: certificatesResult.rows,
    receiptBadges: normalizeReceiptBadgeRecords(
      receiptBadgesResult.rows.map((row) => ({
        id: row.id,
        dropTitle: row.dropTitle,
        worldTitle: row.worldTitle ?? undefined,
        collectDate: row.collectDate,
        editionPosition: row.editionPosition ?? undefined,
        collectorHandle: row.collectorHandle,
        createdAt: row.createdAt,
        receiptId: row.receiptId,
        ownerAccountId: row.ownerAccountId
      }))
    ),
    payments: paymentsResult.rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      status: row.status,
      accountId: row.accountId,
      dropId: row.dropId,
      amountUsd: Number(row.amountUsd),
      quote: normalizeSettlementQuote(row.quoteJson, Number(row.amountUsd)),
      currency: row.currency,
      checkoutSessionId: row.checkoutSessionId ?? undefined,
      checkoutUrl: row.checkoutUrl,
      providerPaymentIntentId: row.providerPaymentIntentId ?? undefined,
      receiptId: row.receiptId ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    })),
    stripeWebhookEvents: webhookEventsResult.rows,
    watchAccessGrants: normalizeWatchAccessGrantRecords(watchAccessGrantsResult.rows),
    watchSessions: normalizeWatchSessionRecords(
      watchSessionsResult.rows.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        dropId: row.dropId,
        status: row.status,
        startedAt: row.startedAt,
        lastHeartbeatAt: row.lastHeartbeatAt,
        endedAt: row.endedAt,
        endReason: row.endReason,
        heartbeatCount: Number(row.heartbeatCount),
        totalWatchTimeSeconds: Number(row.totalWatchTimeSeconds),
        completionPercent: Number(row.completionPercent),
        rebufferCount: Number(row.rebufferCount),
        qualityStepDownCount: Number(row.qualityStepDownCount),
        lastQualityMode: row.lastQualityMode,
        lastQualityLevel: row.lastQualityLevel
      }))
    ),
    membershipEntitlements: normalizeMembershipEntitlementRecords(
      membershipEntitlementsResult.rows
    ),
    patrons: normalizePatronRecords(patronsResult.rows),
    patronCommitments: normalizePatronCommitmentRecords(
      patronCommitmentsResult.rows.map((row) => ({
        ...row,
        amountCents: Number(row.amountCents)
      }))
    ),
    patronTierConfigs: normalizePatronTierConfigRecords(
      patronTierConfigsResult.rows.map((row) => ({
        id: row.id,
        studioHandle: row.studioHandle,
        worldId: row.worldId,
        title: row.title,
        amountCents: Number(row.amountCents),
        commitmentCadence: row.commitmentCadence,
        periodDays: Number(row.periodDays),
        earlyAccessWindowHours: Number(row.earlyAccessWindowHours),
        benefitsSummary: row.benefitsSummary,
        status: row.status,
        updatedAt: row.updatedAt,
        updatedByHandle: row.updatedByHandle
      }))
    ),
    workshopProProfiles: normalizeWorkshopProProfileRecords(
      workshopProProfilesResult.rows.length > 0
        ? workshopProProfilesResult.rows
        : parseMetaJsonValue<WorkshopProProfileRecord[]>(meta.get("workshop_pro_profiles_json"), [])
    ),
    liveSessions: normalizeLiveSessionRecords(
      liveSessionsResult.rows.map((row) => ({
        id: row.id,
        studioHandle: row.studioHandle,
        worldId: row.worldId,
        dropId: row.dropId,
        title: row.title,
        synopsis: row.synopsis,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        mode: row.mode,
        eligibilityRule: row.eligibilityRule,
        type: row.type ?? undefined,
        eligibility: row.eligibility ?? undefined,
        spatialAudio: Boolean(row.spatialAudio),
        exclusiveDropWindowDropId: row.exclusiveDropWindowDropId,
        exclusiveDropWindowDelay:
          row.exclusiveDropWindowDelay === null || row.exclusiveDropWindowDelay === undefined
            ? null
            : Number(row.exclusiveDropWindowDelay),
        capacity:
          row.capacity === null || row.capacity === undefined ? undefined : Number(row.capacity)
      }))
    ),
    liveSessionAttendees: normalizeLiveSessionAttendeeRecords(
      liveSessionAttendeesResult.rows.length > 0
        ? liveSessionAttendeesResult.rows
        : parseMetaJsonValue<LiveSessionAttendeeRecord[]>(meta.get("live_session_attendees_json"), [])
    ),
    liveSessionArtifacts: normalizeLiveSessionArtifactRecords(
      liveSessionArtifactsResult.rows.length > 0
        ? liveSessionArtifactsResult.rows
        : parseMetaJsonValue<LiveSessionArtifactRecord[]>(meta.get("live_session_artifacts_json"), [])
    ),
    townhallLikes: townhallLikesResult.rows,
    townhallComments: normalizeTownhallCommentRecords(townhallCommentsResult.rows),
    townhallPosts: normalizeTownhallPostRecords(
      townhallPostsResult.rows.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        body: row.body,
        createdAt: row.createdAt,
        visibility: row.visibility,
        reportCount: Number(row.reportCount),
        reportedAt: row.reportedAt,
        moderatedAt: row.moderatedAt,
        moderatedByAccountId: row.moderatedByAccountId,
        appealRequestedAt: row.appealRequestedAt,
        appealRequestedByAccountId: row.appealRequestedByAccountId,
        linkedObjectKind: row.linkedObjectKind,
        linkedObjectId: row.linkedObjectId,
        linkedObjectLabel: row.linkedObjectLabel,
        linkedObjectHref: row.linkedObjectHref
      }))
    ),
    townhallPostSaves: normalizeTownhallPostSaveRecords(
      townhallPostSavesResult.rows.length > 0
        ? townhallPostSavesResult.rows
        : parseMetaJsonValue<TownhallPostSaveRecord[]>(meta.get("townhall_post_saves_json"), [])
    ),
    townhallPostFollows: normalizeTownhallPostFollowRecords(
      townhallPostFollowsResult.rows.length > 0
        ? townhallPostFollowsResult.rows
        : parseMetaJsonValue<TownhallPostFollowRecord[]>(meta.get("townhall_post_follows_json"), [])
    ),
    townhallPostShares: normalizeTownhallPostShareRecords(
      townhallPostSharesResult.rows.length > 0
        ? townhallPostSharesResult.rows
        : parseMetaJsonValue<TownhallPostShareRecord[]>(meta.get("townhall_post_shares_json"), [])
    ),
    townhallShares: townhallSharesResult.rows,
    townhallTelemetryEvents: townhallTelemetryEventsResult.rows.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      dropId: row.dropId,
      eventType: row.eventType,
      watchTimeSeconds: Number(row.watchTimeSeconds),
      completionPercent: Number(row.completionPercent),
      metadata: normalizeTownhallTelemetryMetadata(row.metadataJson),
      occurredAt: row.occurredAt
    })),
    worldConversationMessages: normalizeWorldConversationMessageRecords(
      worldConversationMessagesResult.rows.map((row) => ({
        id: row.id,
        worldId: row.worldId,
        accountId: row.accountId,
        parentMessageId: row.parentMessageId,
        body: row.body,
        createdAt: row.createdAt,
        visibility: row.visibility,
        reportCount: Number(row.reportCount),
        reportedAt: row.reportedAt,
        moderatedAt: row.moderatedAt,
        moderatedByAccountId: row.moderatedByAccountId,
        appealRequestedAt: row.appealRequestedAt,
        appealRequestedByAccountId: row.appealRequestedByAccountId
      }))
    ),
    liveSessionConversationMessages: normalizeLiveSessionConversationMessageRecords(
      liveSessionConversationMessagesResult.rows.length > 0
        ? liveSessionConversationMessagesResult.rows.map((row) => ({
            id: row.id,
            liveSessionId: row.liveSessionId,
            accountId: row.accountId,
            parentMessageId: row.parentMessageId,
            body: row.body,
            createdAt: row.createdAt,
            visibility: row.visibility,
            reportCount: Number(row.reportCount),
            reportedAt: row.reportedAt,
            moderatedAt: row.moderatedAt,
            moderatedByAccountId: row.moderatedByAccountId,
            appealRequestedAt: row.appealRequestedAt,
            appealRequestedByAccountId: row.appealRequestedByAccountId
          }))
        : parseMetaJsonValue<LiveSessionConversationMessageRecord[]>(meta.get("live_session_conversation_messages_json"), [])
    ),
    collectOffers: normalizeCollectOfferRecords(
      collectOffersResult.rows.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        dropId: row.dropId,
        listingType: row.listingType,
        amountUsd: Number(row.amountUsd),
        state: row.state,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        expiresAt: row.expiresAt,
        executionVisibility: row.executionVisibility,
        executionPriceUsd:
          row.executionPriceUsd === null || row.executionPriceUsd === undefined
            ? null
            : Number(row.executionPriceUsd)
      }))
    ),
    collectEnforcementSignals: normalizeCollectEnforcementSignalRecords(
      collectEnforcementSignalsResult.rows
    ),
    worldCollectOwnerships: normalizeWorldCollectOwnershipRecords(
      worldCollectOwnershipsResult.rows.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        worldId: row.worldId,
        bundleType: row.bundleType,
        status: row.status,
        purchasedAt: row.purchasedAt,
        amountPaidUsd: Number(row.amountPaidUsd),
        previousOwnershipCreditUsd: Number(row.previousOwnershipCreditUsd),
        prorationStrategy: row.prorationStrategy,
        upgradedToBundleType: row.upgradedToBundleType,
        upgradedAt: row.upgradedAt
      }))
    ),
    worldReleaseQueue: normalizeWorldReleaseQueueRecords(
      worldReleaseQueueResult.rows.map((row) => ({
        id: row.id,
        studioHandle: row.studioHandle,
        worldId: row.worldId,
        dropId: row.dropId,
        scheduledFor: row.scheduledFor,
        pacingMode: row.pacingMode,
        pacingWindowHours: Number(row.pacingWindowHours),
        status: row.status,
        createdByAccountId: row.createdByAccountId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        publishedAt: row.publishedAt,
        canceledAt: row.canceledAt
      }))
    ),
    dropVersions: normalizeDropVersionRecords(
      dropVersionsResult.rows.length > 0
        ? dropVersionsResult.rows
        : parseMetaJsonValue<DropVersionRecord[]>(meta.get("drop_versions_json"), [])
    ),
    authorizedDerivatives: normalizeAuthorizedDerivativeRecords(
      authorizedDerivativesResult.rows.length > 0
        ? authorizedDerivativesResult.rows.map((row) => ({
            id: row.id,
            sourceDropId: row.sourceDropId,
            derivativeDropId: row.derivativeDropId,
            kind: row.kind,
            attribution: row.attribution,
            revenueSplits: Array.isArray(row.revenueSplits) ? row.revenueSplits : [],
            authorizedByHandle: row.authorizedByHandle,
            createdAt: row.createdAt
          }))
        : parseMetaJsonValue<AuthorizedDerivativeRecord[]>(meta.get("authorized_derivatives_json"), [])
    ),
    ledgerTransactions: normalizeLedgerTransactionRecords(
      ledgerTransactionsResult.rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        accountId: row.accountId,
        dropId: row.dropId,
        paymentId: row.paymentId,
        receiptId: row.receiptId,
        currency: row.currency,
        subtotalUsd: Number(row.subtotalUsd),
        processingUsd: Number(row.processingUsd),
        totalUsd: Number(row.totalUsd),
        commissionUsd: Number(row.commissionUsd),
        payoutUsd: Number(row.payoutUsd),
        reversalOfTransactionId: row.reversalOfTransactionId,
        createdAt: row.createdAt
      }))
    ),
    ledgerLineItems: normalizeLedgerLineItemRecords(
      ledgerLineItemsResult.rows.map((row) => ({
        id: row.id,
        transactionId: row.transactionId,
        kind: row.kind,
        scope: row.scope,
        amountUsd: Number(row.amountUsd),
        currency: row.currency,
        recipientAccountId: row.recipientAccountId,
        createdAt: row.createdAt
      }))
    ),
    studioFollows: normalizeStudioFollowRecords(
      studioFollowsResult.rows.length > 0
        ? studioFollowsResult.rows
        : parseMetaJsonValue<StudioFollowRecord[]>(meta.get("studio_follows_json"), [])
    ),
    notificationEntries: await (async () => {
      try {
        const r = await client.query<{
          id: string;
          accountId: string;
          type: string;
          title: string;
          body: string;
          href: string | null;
          read: boolean;
          createdAt: string;
        }>(
          'SELECT id, account_id AS "accountId", type, title, body, href, read, created_at AS "createdAt" FROM bff_notification_entries ORDER BY created_at DESC'
        );
        return r.rows;
      } catch {
        // Table may not exist yet (pre-migration)
        return [];
      }
    })(),
    notificationPreferences: await (async () => {
      try {
        const r = await client.query<{
          accountId: string;
          channels: Record<string, boolean>;
          mutedTypes: string[];
          digestEnabled: boolean;
        }>(
          'SELECT account_id AS "accountId", channels, muted_types AS "mutedTypes", digest_enabled AS "digestEnabled" FROM bff_notification_preferences'
        );
        return r.rows;
      } catch {
        // Table may not exist yet (pre-migration)
        return [];
      }
    })(),
    totpEnrollments: await (async () => {
      try {
        const r = await client.query<TotpEnrollmentRecord>(
          'SELECT id, account_id AS "accountId", status, secret, totp_uri AS "totpUri", recovery_codes AS "recoveryCodes", verified_at AS "verifiedAt", created_at AS "createdAt" FROM bff_totp_enrollments ORDER BY created_at DESC'
        );
        return r.rows;
      } catch {
        return [];
      }
    })(),
    walletConnections: await (async () => {
      try {
        const r = await client.query<WalletConnectionRecord>(
          'SELECT id, account_id AS "accountId", address, chain, label, status, challenge, verified_at AS "verifiedAt", created_at AS "createdAt" FROM bff_wallet_connections ORDER BY created_at DESC'
        );
        return r.rows;
      } catch {
        return [];
      }
    })()
  };
}

async function persistPostgresDb(client: PoolClient, db: BffDatabase): Promise<void> {
  await client.query(`
    TRUNCATE TABLE
      bff_notification_entries,
      bff_notification_preferences,
      bff_studio_follows,
      bff_library_eligibility_states,
      bff_drop_versions,
      bff_authorized_derivatives,
      bff_workshop_pro_profiles,
      bff_live_session_attendees,
      bff_live_session_artifacts,
      bff_live_session_conversation_messages,
      bff_townhall_post_saves,
      bff_townhall_post_follows,
      bff_townhall_post_shares,
      bff_ledger_line_items,
      bff_ledger_transactions,
      bff_townhall_telemetry_events,
      bff_world_conversation_messages,
      bff_collect_enforcement_signals,
      bff_world_release_queue,
      bff_world_collect_ownerships,
      bff_collect_offers,
      bff_live_sessions,
      bff_membership_entitlements,
      bff_patron_commitments,
      bff_patrons,
      bff_patron_tier_configs,
      bff_townhall_shares,
      bff_townhall_posts,
      bff_townhall_comments,
      bff_townhall_likes,
      bff_stripe_webhook_events,
      bff_watch_sessions,
      bff_watch_access_grants,
      bff_payments,
      bff_receipt_badges,
      bff_certificates,
      bff_receipts,
      bff_saved_drops,
      bff_ownerships,
      bff_sessions,
      bff_accounts,
      bff_catalog_studios,
      bff_catalog_worlds,
      bff_catalog_drops,
      bff_meta
  `);

  await client.query("INSERT INTO bff_meta (key, value) VALUES ($1, $2)", ["version", String(db.version)]);

  for (const drop of db.catalog.drops) {
    await client.query("INSERT INTO bff_catalog_drops (id, data) VALUES ($1, $2::jsonb)", [
      drop.id,
      JSON.stringify(drop)
    ]);
  }

  for (const world of db.catalog.worlds) {
    await client.query("INSERT INTO bff_catalog_worlds (id, data) VALUES ($1, $2::jsonb)", [
      world.id,
      JSON.stringify(world)
    ]);
  }

  for (const studio of db.catalog.studios) {
    await client.query("INSERT INTO bff_catalog_studios (handle, data) VALUES ($1, $2::jsonb)", [
      studio.handle,
      JSON.stringify(studio)
    ]);
  }

  for (const account of db.accounts) {
    await client.query(
      "INSERT INTO bff_accounts (id, email, handle, display_name, roles, created_at, avatar_url, bio) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [account.id, account.email, account.handle, account.displayName, account.roles, account.createdAt, account.avatarUrl ?? null, account.bio ?? null]
    );
  }

  for (const session of db.sessions) {
    await client.query(
      "INSERT INTO bff_sessions (token, account_id, created_at, expires_at) VALUES ($1, $2, $3, $4)",
      [session.token, session.accountId, session.createdAt, session.expiresAt]
    );
  }

  for (const ownership of db.ownerships) {
    await client.query(
      "INSERT INTO bff_ownerships (account_id, drop_id, certificate_id, receipt_id, acquired_at) VALUES ($1, $2, $3, $4, $5)",
      [
        ownership.accountId,
        ownership.dropId,
        ownership.certificateId,
        ownership.receiptId,
        ownership.acquiredAt
      ]
    );
  }

  for (const savedDrop of db.savedDrops) {
    await client.query(
      "INSERT INTO bff_saved_drops (account_id, drop_id, saved_at) VALUES ($1, $2, $3)",
      [savedDrop.accountId, savedDrop.dropId, savedDrop.savedAt]
    );
  }

  for (const receipt of db.receipts) {
    await client.query(
      "INSERT INTO bff_receipts (id, account_id, drop_id, amount_usd, subtotal_usd, processing_usd, commission_usd, payout_usd, quote_engine_version, ledger_transaction_id, status, purchased_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
      [
        receipt.id,
        receipt.accountId,
        receipt.dropId,
        receipt.amountUsd,
        receipt.subtotalUsd ?? null,
        receipt.processingUsd ?? null,
        receipt.commissionUsd ?? null,
        receipt.payoutUsd ?? null,
        receipt.quoteEngineVersion ?? null,
        receipt.ledgerTransactionId ?? null,
        receipt.status,
        receipt.purchasedAt
      ]
    );
  }

  for (const certificate of db.certificates) {
    await client.query(
      "INSERT INTO bff_certificates (id, drop_id, drop_title, owner_handle, issued_at, receipt_id, status, owner_account_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        certificate.id,
        certificate.dropId,
        certificate.dropTitle,
        certificate.ownerHandle,
        certificate.issuedAt,
        certificate.receiptId,
        certificate.status,
        certificate.ownerAccountId
      ]
    );
  }

  for (const badge of db.receiptBadges) {
    await client.query(
      "INSERT INTO bff_receipt_badges (id, drop_title, world_title, collect_date, edition_position, collector_handle, created_at, receipt_id, owner_account_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [
        badge.id,
        badge.dropTitle,
        badge.worldTitle ?? null,
        badge.collectDate,
        badge.editionPosition ?? null,
        badge.collectorHandle,
        badge.createdAt,
        badge.receiptId,
        badge.ownerAccountId
      ]
    );
  }

  for (const payment of db.payments) {
    await client.query(
      "INSERT INTO bff_payments (id, provider, status, account_id, drop_id, amount_usd, currency, checkout_session_id, checkout_url, provider_payment_intent_id, receipt_id, quote_json, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14)",
      [
        payment.id,
        payment.provider,
        payment.status,
        payment.accountId,
        payment.dropId,
        payment.amountUsd,
        payment.currency,
        payment.checkoutSessionId ?? null,
        payment.checkoutUrl ?? null,
        payment.providerPaymentIntentId ?? null,
        payment.receiptId ?? null,
        JSON.stringify(payment.quote),
        payment.createdAt,
        payment.updatedAt
      ]
    );
  }

  for (const event of db.stripeWebhookEvents) {
    await client.query(
      "INSERT INTO bff_stripe_webhook_events (event_id, processed_at) VALUES ($1, $2)",
      [event.eventId, event.processedAt]
    );
  }

  for (const grant of db.watchAccessGrants) {
    await client.query(
      "INSERT INTO bff_watch_access_grants (token_id, account_id, drop_id, issued_at, expires_at, consumed_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        grant.tokenId,
        grant.accountId,
        grant.dropId,
        grant.issuedAt,
        grant.expiresAt,
        grant.consumedAt
      ]
    );
  }

  for (const watchSession of db.watchSessions) {
    await client.query(
      "INSERT INTO bff_watch_sessions (id, account_id, drop_id, status, started_at, last_heartbeat_at, ended_at, end_reason, heartbeat_count, total_watch_time_seconds, completion_percent, rebuffer_count, quality_step_down_count, last_quality_mode, last_quality_level) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)",
      [
        watchSession.id,
        watchSession.accountId,
        watchSession.dropId,
        watchSession.status,
        watchSession.startedAt,
        watchSession.lastHeartbeatAt,
        watchSession.endedAt,
        watchSession.endReason,
        watchSession.heartbeatCount,
        watchSession.totalWatchTimeSeconds,
        watchSession.completionPercent,
        watchSession.rebufferCount,
        watchSession.qualityStepDownCount,
        watchSession.lastQualityMode,
        watchSession.lastQualityLevel
      ]
    );
  }

  for (const entitlement of db.membershipEntitlements) {
    await client.query(
      "INSERT INTO bff_membership_entitlements (id, account_id, studio_handle, world_id, status, started_at, ends_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        entitlement.id,
        entitlement.accountId,
        entitlement.studioHandle,
        entitlement.worldId,
        entitlement.status,
        entitlement.startedAt,
        entitlement.endsAt
      ]
    );
  }

  for (const patron of db.patrons) {
    await client.query(
      "INSERT INTO bff_patrons (id, account_id, handle, studio_handle, status, committed_at, lapsed_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        patron.id,
        patron.accountId,
        patron.handle,
        patron.studioHandle,
        patron.status,
        patron.committedAt,
        patron.lapsedAt
      ]
    );
  }

  for (const commitment of db.patronCommitments) {
    await client.query(
      "INSERT INTO bff_patron_commitments (id, patron_id, amount_cents, period_start, period_end, ledger_transaction_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        commitment.id,
        commitment.patronId,
        commitment.amountCents,
        commitment.periodStart,
        commitment.periodEnd,
        commitment.ledgerTransactionId
      ]
    );
  }

  for (const config of db.patronTierConfigs) {
    await client.query(
      "INSERT INTO bff_patron_tier_configs (id, studio_handle, world_id, title, amount_cents, commitment_cadence, period_days, early_access_window_hours, benefits_summary, status, updated_at, updated_by_handle) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
      [
        config.id,
        config.studioHandle,
        config.worldId,
        config.title,
        config.amountCents,
        config.commitmentCadence,
        config.periodDays,
        config.earlyAccessWindowHours,
        config.benefitsSummary,
        config.status,
        config.updatedAt,
        config.updatedByHandle
      ]
    );
  }

  for (const liveSession of db.liveSessions) {
    await client.query(
      "INSERT INTO bff_live_sessions (id, studio_handle, world_id, drop_id, title, synopsis, starts_at, ends_at, mode, eligibility_rule, session_type, audience_eligibility, spatial_audio, exclusive_drop_window_drop_id, exclusive_drop_window_delay, capacity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)",
      [
        liveSession.id,
        liveSession.studioHandle,
        liveSession.worldId,
        liveSession.dropId,
        liveSession.title,
        liveSession.synopsis,
        liveSession.startsAt,
        liveSession.endsAt,
        liveSession.mode,
        liveSession.eligibilityRule,
        liveSession.type ?? "event",
        liveSession.eligibility ??
          (liveSession.eligibilityRule === "membership_active"
            ? "membership"
            : liveSession.eligibilityRule === "drop_owner"
              ? "invite"
              : "open"),
        Boolean(liveSession.spatialAudio),
        liveSession.exclusiveDropWindowDropId ?? null,
        liveSession.exclusiveDropWindowDelay ?? null,
        typeof liveSession.capacity === "number" && Number.isFinite(liveSession.capacity)
          ? Math.max(1, Math.floor(liveSession.capacity))
          : 200
      ]
    );
  }

  for (const like of db.townhallLikes) {
    await client.query(
      "INSERT INTO bff_townhall_likes (account_id, drop_id, liked_at) VALUES ($1, $2, $3)",
      [like.accountId, like.dropId, like.likedAt]
    );
  }

  for (const comment of db.townhallComments) {
    await client.query(
      "INSERT INTO bff_townhall_comments (id, account_id, drop_id, parent_comment_id, body, created_at, status, report_count, reported_at, moderated_at, moderated_by_account_id, appeal_requested_at, appeal_requested_by_account_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
      [
        comment.id,
        comment.accountId,
        comment.dropId,
        comment.parentCommentId,
        comment.body,
        comment.createdAt,
        comment.visibility,
        comment.reportCount,
        comment.reportedAt,
        comment.moderatedAt,
        comment.moderatedByAccountId,
        comment.appealRequestedAt,
        comment.appealRequestedByAccountId
      ]
    );
  }

  for (const post of db.townhallPosts) {
    await client.query(
      "INSERT INTO bff_townhall_posts (id, account_id, body, created_at, status, report_count, reported_at, moderated_at, moderated_by_account_id, appeal_requested_at, appeal_requested_by_account_id, linked_object_kind, linked_object_id, linked_object_label, linked_object_href) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)",
      [
        post.id,
        post.accountId,
        post.body,
        post.createdAt,
        post.visibility,
        post.reportCount,
        post.reportedAt,
        post.moderatedAt,
        post.moderatedByAccountId,
        post.appealRequestedAt,
        post.appealRequestedByAccountId,
        post.linkedObjectKind,
        post.linkedObjectId,
        post.linkedObjectLabel,
        post.linkedObjectHref
      ]
    );
  }

  for (const share of db.townhallShares) {
    await client.query(
      "INSERT INTO bff_townhall_shares (id, account_id, drop_id, channel, shared_at) VALUES ($1, $2, $3, $4, $5)",
      [share.id, share.accountId, share.dropId, share.channel, share.sharedAt]
    );
  }

  for (const event of db.townhallTelemetryEvents) {
    await client.query(
      "INSERT INTO bff_townhall_telemetry_events (id, account_id, drop_id, event_type, watch_time_seconds, completion_percent, metadata_json, occurred_at) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)",
      [
        event.id,
        event.accountId,
        event.dropId,
        event.eventType,
        event.watchTimeSeconds,
        event.completionPercent,
        JSON.stringify(event.metadata ?? {}),
        event.occurredAt
      ]
    );
  }

  for (const message of db.worldConversationMessages) {
    await client.query(
      "INSERT INTO bff_world_conversation_messages (id, world_id, account_id, parent_message_id, body, created_at, status, report_count, reported_at, moderated_at, moderated_by_account_id, appeal_requested_at, appeal_requested_by_account_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
      [
        message.id,
        message.worldId,
        message.accountId,
        message.parentMessageId,
        message.body,
        message.createdAt,
        message.visibility,
        message.reportCount,
        message.reportedAt,
        message.moderatedAt,
        message.moderatedByAccountId,
        message.appealRequestedAt,
        message.appealRequestedByAccountId
      ]
    );
  }

  for (const offer of db.collectOffers) {
    await client.query(
      "INSERT INTO bff_collect_offers (id, account_id, drop_id, listing_type, amount_usd, state, created_at, updated_at, expires_at, execution_visibility, execution_price_usd) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        offer.id,
        offer.accountId,
        offer.dropId,
        offer.listingType,
        offer.amountUsd,
        offer.state,
        offer.createdAt,
        offer.updatedAt,
        offer.expiresAt,
        offer.executionVisibility,
        offer.executionPriceUsd
      ]
    );
  }

  for (const signal of db.collectEnforcementSignals) {
    await client.query(
      "INSERT INTO bff_collect_enforcement_signals (id, signal_type, drop_id, offer_id, account_id, reason, occurred_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [
        signal.id,
        signal.signalType,
        signal.dropId,
        signal.offerId,
        signal.accountId,
        signal.reason,
        signal.occurredAt
      ]
    );
  }

  for (const ownership of db.worldCollectOwnerships) {
    await client.query(
      "INSERT INTO bff_world_collect_ownerships (id, account_id, world_id, bundle_type, status, purchased_at, amount_paid_usd, previous_ownership_credit_usd, proration_strategy, upgraded_to_bundle_type, upgraded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        ownership.id,
        ownership.accountId,
        ownership.worldId,
        ownership.bundleType,
        ownership.status,
        ownership.purchasedAt,
        ownership.amountPaidUsd,
        ownership.previousOwnershipCreditUsd,
        ownership.prorationStrategy,
        ownership.upgradedToBundleType,
        ownership.upgradedAt
      ]
    );
  }

  for (const release of db.worldReleaseQueue) {
    await client.query(
      "INSERT INTO bff_world_release_queue (id, studio_handle, world_id, drop_id, scheduled_for, pacing_mode, pacing_window_hours, status, created_by_account_id, created_at, updated_at, published_at, canceled_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
      [
        release.id,
        release.studioHandle,
        release.worldId,
        release.dropId,
        release.scheduledFor,
        release.pacingMode,
        release.pacingWindowHours,
        release.status,
        release.createdByAccountId,
        release.createdAt,
        release.updatedAt,
        release.publishedAt,
        release.canceledAt
      ]
    );
  }

  for (const transaction of db.ledgerTransactions) {
    await client.query(
      "INSERT INTO bff_ledger_transactions (id, kind, account_id, drop_id, payment_id, receipt_id, currency, subtotal_usd, processing_usd, total_usd, commission_usd, payout_usd, reversal_of_transaction_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)",
      [
        transaction.id,
        transaction.kind,
        transaction.accountId,
        transaction.dropId,
        transaction.paymentId,
        transaction.receiptId,
        transaction.currency,
        transaction.subtotalUsd,
        transaction.processingUsd,
        transaction.totalUsd,
        transaction.commissionUsd,
        transaction.payoutUsd,
        transaction.reversalOfTransactionId,
        transaction.createdAt
      ]
    );
  }

  for (const lineItem of db.ledgerLineItems) {
    await client.query(
      "INSERT INTO bff_ledger_line_items (id, transaction_id, kind, scope, amount_usd, currency, recipient_account_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        lineItem.id,
        lineItem.transactionId,
        lineItem.kind,
        lineItem.scope,
        lineItem.amountUsd,
        lineItem.currency,
        lineItem.recipientAccountId,
        lineItem.createdAt
      ]
    );
  }

  // Notification entries
  for (const entry of db.notificationEntries) {
    await client.query(
      "INSERT INTO bff_notification_entries (id, account_id, type, title, body, href, read, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET read = EXCLUDED.read",
      [
        entry.id,
        entry.accountId,
        entry.type,
        entry.title,
        entry.body,
        entry.href,
        entry.read,
        entry.createdAt
      ]
    );
  }

  // Notification preferences
  for (const pref of db.notificationPreferences) {
    await client.query(
      "INSERT INTO bff_notification_preferences (account_id, channels, muted_types, digest_enabled) VALUES ($1, $2::jsonb, $3, $4) ON CONFLICT (account_id) DO UPDATE SET channels = EXCLUDED.channels, muted_types = EXCLUDED.muted_types, digest_enabled = EXCLUDED.digest_enabled",
      [
        pref.accountId,
        JSON.stringify(pref.channels),
        pref.mutedTypes,
        pref.digestEnabled
      ]
    );
  }

  // --- Collections migrated from bff_meta JSON blobs to proper tables ---

  for (const state of db.libraryEligibilityStates) {
    await client.query(
      "INSERT INTO bff_library_eligibility_states (account_id, drop_id, state, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (account_id, drop_id) DO UPDATE SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at",
      [state.accountId, state.dropId, state.state, state.updatedAt]
    );
  }

  for (const profile of db.workshopProProfiles) {
    await client.query(
      "INSERT INTO bff_workshop_pro_profiles (studio_handle, state, cycle_anchor_at, past_due_at, grace_ends_at, locked_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (studio_handle) DO UPDATE SET state = EXCLUDED.state, cycle_anchor_at = EXCLUDED.cycle_anchor_at, past_due_at = EXCLUDED.past_due_at, grace_ends_at = EXCLUDED.grace_ends_at, locked_at = EXCLUDED.locked_at, updated_at = EXCLUDED.updated_at",
      [
        profile.studioHandle,
        profile.state,
        profile.cycleAnchorAt,
        profile.pastDueAt,
        profile.graceEndsAt,
        profile.lockedAt,
        profile.updatedAt
      ]
    );
  }

  for (const attendee of db.liveSessionAttendees) {
    await client.query(
      "INSERT INTO bff_live_session_attendees (id, live_session_id, account_id, joined_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
      [attendee.id, attendee.liveSessionId, attendee.accountId, attendee.joinedAt]
    );
  }

  for (const artifact of db.liveSessionArtifacts) {
    await client.query(
      "INSERT INTO bff_live_session_artifacts (id, live_session_id, studio_handle, world_id, source_drop_id, artifact_kind, title, synopsis, status, captured_at, approved_at, catalog_drop_id, approved_by_handle) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO NOTHING",
      [
        artifact.id,
        artifact.liveSessionId,
        artifact.studioHandle,
        artifact.worldId,
        artifact.sourceDropId,
        artifact.artifactKind,
        artifact.title,
        artifact.synopsis,
        artifact.status,
        artifact.capturedAt,
        artifact.approvedAt,
        artifact.catalogDropId,
        artifact.approvedByHandle
      ]
    );
  }

  for (const message of db.liveSessionConversationMessages) {
    await client.query(
      "INSERT INTO bff_live_session_conversation_messages (id, live_session_id, account_id, parent_message_id, body, created_at, visibility, report_count, reported_at, moderated_at, moderated_by_account_id, appeal_requested_at, appeal_requested_by_account_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO NOTHING",
      [
        message.id,
        message.liveSessionId,
        message.accountId,
        message.parentMessageId,
        message.body,
        message.createdAt,
        message.visibility,
        message.reportCount,
        message.reportedAt,
        message.moderatedAt,
        message.moderatedByAccountId,
        message.appealRequestedAt,
        message.appealRequestedByAccountId
      ]
    );
  }

  for (const save of db.townhallPostSaves) {
    await client.query(
      "INSERT INTO bff_townhall_post_saves (account_id, post_id, saved_at) VALUES ($1, $2, $3) ON CONFLICT (account_id, post_id) DO NOTHING",
      [save.accountId, save.postId, save.savedAt]
    );
  }

  for (const follow of db.townhallPostFollows) {
    await client.query(
      "INSERT INTO bff_townhall_post_follows (account_id, post_id, followed_at) VALUES ($1, $2, $3) ON CONFLICT (account_id, post_id) DO NOTHING",
      [follow.accountId, follow.postId, follow.followedAt]
    );
  }

  for (const share of db.townhallPostShares) {
    await client.query(
      "INSERT INTO bff_townhall_post_shares (id, account_id, post_id, channel, shared_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING",
      [share.id, share.accountId, share.postId, share.channel, share.sharedAt]
    );
  }

  for (const version of db.dropVersions) {
    await client.query(
      "INSERT INTO bff_drop_versions (id, drop_id, label, notes, created_by_handle, created_at, released_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING",
      [
        version.id,
        version.dropId,
        version.label,
        version.notes,
        version.createdByHandle,
        version.createdAt,
        version.releasedAt
      ]
    );
  }

  for (const derivative of db.authorizedDerivatives) {
    await client.query(
      "INSERT INTO bff_authorized_derivatives (id, source_drop_id, derivative_drop_id, kind, attribution, revenue_splits, authorized_by_handle, created_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8) ON CONFLICT (id) DO NOTHING",
      [
        derivative.id,
        derivative.sourceDropId,
        derivative.derivativeDropId,
        derivative.kind,
        derivative.attribution,
        JSON.stringify(derivative.revenueSplits),
        derivative.authorizedByHandle,
        derivative.createdAt
      ]
    );
  }

  for (const follow of db.studioFollows) {
    await client.query(
      "INSERT INTO bff_studio_follows (id, account_id, studio_handle, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
      [follow.id, follow.accountId, follow.studioHandle, follow.createdAt]
    );
  }
}

async function resolveInitialPostgresDb(): Promise<BffDatabase> {
  const legacyPath = process.env.OOK_BFF_DB_PATH?.trim();
  if (legacyPath) {
    const legacyDb = await readFileDatabase(path.resolve(legacyPath));
    if (legacyDb) {
      return legacyDb;
    }
  }

  const seedStrategy = resolvePostgresSeedStrategy();
  if (seedStrategy === "none") {
    return createEmptyDatabase();
  }

  if (seedStrategy === "catalog") {
    return createCatalogSeedDatabase();
  }

  return createSeedDatabase();
}

async function withFileDatabase<T>(
  operation: (db: BffDatabase) => MutationResult<T> | Promise<MutationResult<T>>
): Promise<T> {
  const db = await loadFileDb();
  const result = await operation(db);

  if (result.persist) {
    await persistFileDb(db);
  }

  return result.result;
}

async function withPostgresDatabase<T>(
  operation: (db: BffDatabase) => MutationResult<T> | Promise<MutationResult<T>>
): Promise<T> {
  const client = await getPostgresPool().connect();

  try {
    await client.query("BEGIN");
    await ensurePostgresMigrations(client);
    await client.query("SELECT pg_advisory_xact_lock($1)", [POSTGRES_ADVISORY_LOCK_KEY]);

    let db = await loadPostgresDb(client);
    if (!db) {
      db = await resolveInitialPostgresDb();
      await persistPostgresDb(client, db);
    }

    const result = await operation(db);
    if (result.persist) {
      await persistPostgresDb(client, db);
    }

    await client.query("COMMIT");
    return result.result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function withDatabase<T>(
  operation: (db: BffDatabase) => MutationResult<T> | Promise<MutationResult<T>>
): Promise<T> {
  let release!: () => void;
  const previous = queue;
  queue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    const backend = resolvePersistenceBackend();
    if (backend === "postgres") {
      return withPostgresDatabase(operation);
    }

    return withFileDatabase(operation);
  } finally {
    release();
  }
}

export async function migratePostgresPersistence(): Promise<void> {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    await ensurePostgresMigrations(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getDropPriceTotalUsd(drop: Drop): number {
  return Number((drop.priceUsd + PROCESSING_FEE_USD).toFixed(2));
}

export function createAccountFromEmail(email: string, role: AccountRole): AccountRecord {
  const normalizedEmail = normalizeEmail(email);
  const handle = toHandle(normalizedEmail);
  return {
    id: `acct_${randomUUID()}`,
    email: normalizedEmail,
    handle,
    displayName: startCase(handle),
    roles: [role],
    createdAt: new Date().toISOString()
  };
}
