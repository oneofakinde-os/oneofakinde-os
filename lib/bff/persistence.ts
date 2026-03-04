import type {
  AccountRole,
  Certificate,
  CollectEnforcementSignalType,
  CollectListingType,
  CollectOfferState,
  Drop,
  LedgerTransaction,
  LiveSessionEligibilityRule,
  MembershipEntitlementStatus,
  PatronStatus,
  PurchaseReceipt,
  ReceiptBadge,
  SettlementLineItem,
  SettlementQuote,
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
import { seedPreviewMediaForDrop } from "@/lib/townhall/seed-preview-media";
import { buildCollectSettlementQuote } from "@/lib/domain/quote-engine";

export type AccountRecord = {
  id: string;
  email: string;
  handle: string;
  displayName: string;
  roles: AccountRole[];
  createdAt: string;
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

export type LedgerTransactionRecord = LedgerTransaction;

export type LedgerLineItemRecord = SettlementLineItem;

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
  liveSessions: LiveSessionRecord[];
  townhallLikes: TownhallLikeRecord[];
  townhallComments: TownhallCommentRecord[];
  townhallShares: TownhallShareRecord[];
  townhallTelemetryEvents: TownhallTelemetryEventRecord[];
  worldConversationMessages: WorldConversationMessageRecord[];
  collectOffers: CollectOfferRecord[];
  collectEnforcementSignals: CollectEnforcementSignalRecord[];
  worldCollectOwnerships: WorldCollectOwnershipRecord[];
  worldReleaseQueue: WorldReleaseQueueRecord[];
  ledgerTransactions: LedgerTransactionRecord[];
  ledgerLineItems: LedgerLineItemRecord[];
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

function toHandle(email: string): string {
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
      previewMedia: seedPreviewMediaForDrop("stardust")
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
      previewMedia: seedPreviewMediaForDrop("twilight-whispers")
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
      previewMedia: seedPreviewMediaForDrop("voidrunner")
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
      previewMedia: seedPreviewMediaForDrop("through-the-lens")
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
        endsAt: new Date(now.valueOf() + DAY_MS * 30).toISOString()
      }
    ],
    patrons: [],
    patronCommitments: [],
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
        eligibilityRule: "public"
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
        eligibilityRule: "membership_active"
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
        eligibilityRule: "drop_owner"
      }
    ],
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
    ledgerTransactions: [],
    ledgerLineItems: []
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
    liveSessions: seeded.liveSessions,
    townhallLikes: [],
    townhallComments: [],
    townhallShares: [],
    townhallTelemetryEvents: [],
    worldConversationMessages: [],
    collectOffers: [],
    collectEnforcementSignals: [],
    worldCollectOwnerships: [],
    worldReleaseQueue: [],
    ledgerTransactions: [],
    ledgerLineItems: []
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
    liveSessions: [],
    townhallLikes: [],
    townhallComments: [],
    townhallShares: [],
    townhallTelemetryEvents: [],
    worldConversationMessages: [],
    collectOffers: [],
    collectEnforcementSignals: [],
    worldCollectOwnerships: [],
    worldReleaseQueue: [],
    ledgerTransactions: [],
    ledgerLineItems: []
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
    Array.isArray(candidate.liveSessions) &&
    Array.isArray(candidate.townhallLikes) &&
    Array.isArray(candidate.townhallComments) &&
    Array.isArray(candidate.townhallShares) &&
    Array.isArray(candidate.townhallTelemetryEvents) &&
    Array.isArray(candidate.worldConversationMessages) &&
    Array.isArray(candidate.collectOffers) &&
    Array.isArray(candidate.collectEnforcementSignals) &&
    Array.isArray(candidate.worldCollectOwnerships) &&
    Array.isArray(candidate.worldReleaseQueue) &&
    Array.isArray(candidate.ledgerTransactions) &&
    Array.isArray(candidate.ledgerLineItems)
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
  | "liveSessions"
  | "townhallLikes"
  | "townhallComments"
  | "townhallShares"
  | "townhallTelemetryEvents"
  | "worldConversationMessages"
  | "collectOffers"
  | "collectEnforcementSignals"
  | "worldCollectOwnerships"
  | "worldReleaseQueue"
  | "ledgerTransactions"
  | "ledgerLineItems"
  | "receiptBadges"
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

    return {
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `pat_${randomUUID()}`,
      accountId: typeof candidate.accountId === "string" ? candidate.accountId : "",
      handle: typeof candidate.handle === "string" ? candidate.handle : "",
      studioHandle: typeof candidate.studioHandle === "string" ? candidate.studioHandle : "",
      status: normalizePatronStatus(candidate.status),
      committedAt:
        typeof candidate.committedAt === "string" && candidate.committedAt.trim()
          ? candidate.committedAt
          : new Date().toISOString(),
      lapsedAt:
        typeof candidate.lapsedAt === "string" && candidate.lapsedAt.trim().length > 0
          ? candidate.lapsedAt
          : null
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

function normalizeLiveSessionEligibilityRule(value: unknown): LiveSessionEligibilityRule {
  if (value === "public" || value === "membership_active" || value === "drop_owner") {
    return value;
  }

  return "public";
}

function normalizeLiveSessionRecords(records: LiveSessionRecord[]): LiveSessionRecord[] {
  return records.map((record) => {
    const candidate = record as Partial<LiveSessionRecord>;

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
      eligibilityRule: normalizeLiveSessionEligibilityRule(candidate.eligibilityRule)
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
      amountPaidUsd:
        typeof candidate.amountPaidUsd === "number" && Number.isFinite(candidate.amountPaidUsd)
          ? Number(candidate.amountPaidUsd.toFixed(2))
          : 0,
      previousOwnershipCreditUsd:
        typeof candidate.previousOwnershipCreditUsd === "number" &&
        Number.isFinite(candidate.previousOwnershipCreditUsd)
          ? Number(candidate.previousOwnershipCreditUsd.toFixed(2))
          : 0,
      prorationStrategy: "placeholder_linear_proration_v1",
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
      watchAccessGrants: normalizeWatchAccessGrantRecords(input.watchAccessGrants),
      watchSessions: normalizeWatchSessionRecords(input.watchSessions),
      receiptBadges: normalizeReceiptBadgeRecords(input.receiptBadges),
      membershipEntitlements: normalizeMembershipEntitlementRecords(input.membershipEntitlements),
      patrons: normalizePatronRecords(input.patrons),
      patronCommitments: normalizePatronCommitmentRecords(input.patronCommitments),
      liveSessions: normalizeLiveSessionRecords(input.liveSessions),
      townhallComments: normalizeTownhallCommentRecords(input.townhallComments),
      townhallTelemetryEvents: normalizeTownhallTelemetryEvents(input.townhallTelemetryEvents),
      worldConversationMessages: normalizeWorldConversationMessageRecords(
        input.worldConversationMessages
      ),
      payments: normalizePaymentRecords(input.payments),
      collectOffers: normalizeCollectOfferRecords(input.collectOffers),
      collectEnforcementSignals: normalizeCollectEnforcementSignalRecords(
        input.collectEnforcementSignals
      ),
      worldCollectOwnerships: normalizeWorldCollectOwnershipRecords(input.worldCollectOwnerships),
      worldReleaseQueue: normalizeWorldReleaseQueueRecords(input.worldReleaseQueue),
      ledgerTransactions: normalizeLedgerTransactionRecords(input.ledgerTransactions),
      ledgerLineItems: normalizeLedgerLineItemRecords(input.ledgerLineItems)
    };
  }

  if (hasLegacyBaseDbShape(input)) {
    const candidate = input as Record<string, unknown>;
    return {
      ...input,
      stripeWebhookEvents: Array.isArray(candidate.stripeWebhookEvents)
        ? (candidate.stripeWebhookEvents as StripeWebhookEventRecord[])
        : [],
      watchAccessGrants: Array.isArray(candidate.watchAccessGrants)
        ? normalizeWatchAccessGrantRecords(candidate.watchAccessGrants as WatchAccessGrantRecord[])
        : [],
      watchSessions: Array.isArray(candidate.watchSessions)
        ? normalizeWatchSessionRecords(candidate.watchSessions as WatchSessionRecord[])
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
      liveSessions: Array.isArray(candidate.liveSessions)
        ? normalizeLiveSessionRecords(candidate.liveSessions as LiveSessionRecord[])
        : [],
      townhallLikes: Array.isArray(candidate.townhallLikes)
        ? (candidate.townhallLikes as TownhallLikeRecord[])
        : [],
      townhallComments: Array.isArray(candidate.townhallComments)
        ? normalizeTownhallCommentRecords(candidate.townhallComments as TownhallCommentRecord[])
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
      ledgerTransactions: Array.isArray(candidate.ledgerTransactions)
        ? normalizeLedgerTransactionRecords(candidate.ledgerTransactions as LedgerTransactionRecord[])
        : [],
      ledgerLineItems: Array.isArray(candidate.ledgerLineItems)
        ? normalizeLedgerLineItemRecords(candidate.ledgerLineItems as LedgerLineItemRecord[])
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
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(seeded, null, 2) + "\n", "utf8");
  cachedPath = dbPath;
  cachedDb = seeded;
  return cachedDb;
}

async function persistFileDb(db: BffDatabase): Promise<void> {
  const dbPath = resolveDbPath();
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2) + "\n", "utf8");
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
        : seedPreviewMediaForDrop(String(parsed.id ?? ""))
  };

  return normalized;
}

function parseOptionalPositiveInt(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  const intValue = Math.trunc(parsed);
  return intValue > 0 ? intValue : undefined;
}

function parseWorldJson(value: unknown): World {
  return (typeof value === "string" ? JSON.parse(value) : value) as World;
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
    liveSessionsResult,
    townhallLikesResult,
    townhallCommentsResult,
    townhallSharesResult,
    townhallTelemetryEventsResult,
    worldConversationMessagesResult,
    collectOffersResult,
    collectEnforcementSignalsResult,
    worldCollectOwnershipsResult,
    worldReleaseQueueResult,
    ledgerTransactionsResult,
    ledgerLineItemsResult
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
      'SELECT id, email, handle, display_name AS "displayName", roles, created_at AS "createdAt" FROM bff_accounts ORDER BY created_at ASC'
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
    client.query<LiveSessionRecord>(
      'SELECT id, studio_handle AS "studioHandle", world_id AS "worldId", drop_id AS "dropId", title, synopsis, starts_at AS "startsAt", ends_at AS "endsAt", mode, eligibility_rule AS "eligibilityRule" FROM bff_live_sessions ORDER BY starts_at ASC'
    ),
    client.query<TownhallLikeRecord>(
      'SELECT account_id AS "accountId", drop_id AS "dropId", liked_at AS "likedAt" FROM bff_townhall_likes ORDER BY liked_at DESC'
    ),
    client.query<TownhallCommentRecord>(
      'SELECT id, account_id AS "accountId", drop_id AS "dropId", parent_comment_id AS "parentCommentId", body, created_at AS "createdAt", status AS "visibility", report_count AS "reportCount", reported_at AS "reportedAt", moderated_at AS "moderatedAt", moderated_by_account_id AS "moderatedByAccountId", appeal_requested_at AS "appealRequestedAt", appeal_requested_by_account_id AS "appealRequestedByAccountId" FROM bff_townhall_comments ORDER BY created_at DESC'
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
    )
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
    liveSessionsResult.rowCount === 0 &&
    townhallLikesResult.rowCount === 0 &&
    townhallCommentsResult.rowCount === 0 &&
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
    liveSessions: normalizeLiveSessionRecords(liveSessionsResult.rows),
    townhallLikes: townhallLikesResult.rows,
    townhallComments: normalizeTownhallCommentRecords(townhallCommentsResult.rows),
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
    )
  };
}

async function persistPostgresDb(client: PoolClient, db: BffDatabase): Promise<void> {
  await client.query(`
    TRUNCATE TABLE
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
      bff_townhall_shares,
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
      "INSERT INTO bff_accounts (id, email, handle, display_name, roles, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [account.id, account.email, account.handle, account.displayName, account.roles, account.createdAt]
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

  for (const liveSession of db.liveSessions) {
    await client.query(
      "INSERT INTO bff_live_sessions (id, studio_handle, world_id, drop_id, title, synopsis, starts_at, ends_at, mode, eligibility_rule) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
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
        liveSession.eligibilityRule
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
