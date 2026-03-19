import type {
  AccountRole,
  AuthorizedDerivative,
  AuthorizedDerivativeKind,
  CaptureWorkshopLiveSessionArtifactInput,
  Certificate,
  CollectLiveSessionSnapshot,
  CheckoutSession,
  CheckoutPreview,
  CreateAuthorizedDerivativeInput,
  CreateDropVersionInput,
  CreateWorkshopWorldReleaseInput,
  CreateWorkshopLiveSessionInput,
  CreateSessionInput,
  Drop,
  DropLiveArtifactsSnapshot,
  DropLineageSnapshot,
  DropVersion,
  DropVersionLabel,
  LibraryDrop,
  LibrarySnapshot,
  LiveSession,
  LiveSessionArtifact,
  LiveSessionArtifactKind,
  LiveSessionEligibility,
  MembershipEntitlement,
  MyCollectionAnalyticsPanel,
  MyCollectionSnapshot,
  OwnedDrop,
  OpsAnalyticsPanel,
  PatronCommitmentCadence,
  PatronTierConfig,
  PatronTierStatus,
  PurchaseReceipt,
  Session,
  Studio,
  TownhallModerationCaseResolution,
  TownhallModerationCaseResolveResult,
  TownhallDropSocialSnapshot,
  TownhallModerationQueueItem,
  WorkshopAnalyticsPanel,
  WorkshopProProfile,
  WorkshopProState,
  UpsertWorkshopPatronTierConfigInput,
  WorldReleaseQueueItem,
  WorldReleaseQueuePacingMode,
  WorldReleaseQueueStatus,
  World
} from "@/lib/domain/contracts";
import type { CommerceGateway } from "@/lib/domain/ports";
import { sortDropsForStudioSurface, sortDropsForWorldSurface } from "@/lib/catalog/drop-curation";
import { buildCollectSettlementQuote } from "@/lib/domain/quote-engine";
import { seedPreviewMediaForDrop } from "@/lib/townhall/seed-preview-media";
import { randomUUID } from "node:crypto";

type AccountRecord = {
  id: string;
  email: string;
  handle: string;
  displayName: string;
  roles: AccountRole[];
};

type CertificateRecord = Certificate & {
  ownerAccountId: string;
};

type MembershipEntitlementRecord = Omit<MembershipEntitlement, "whatYouGet" | "isActive">;

type PatronTierConfigRecord = PatronTierConfig;

type LiveSessionRecord = Omit<LiveSession, "whatYouGet">;

type LiveSessionArtifactRecord = LiveSessionArtifact & {
  approvedAt?: string;
  catalogDropId?: string;
};

type WorkshopProProfileRecord = WorkshopProProfile;

type WorldReleaseQueueRecord = {
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

type MockStore = {
  drops: Map<string, Drop>;
  worlds: Map<string, World>;
  studios: Map<string, Studio>;
  accounts: Map<string, AccountRecord>;
  accountsByEmailRole: Map<string, string>;
  sessionToAccount: Map<string, string>;
  ownershipByAccount: Map<string, OwnedDrop[]>;
  savedDropIdsByAccount: Map<string, string[]>;
  receiptsByAccount: Map<string, PurchaseReceipt[]>;
  certificatesById: Map<string, CertificateRecord>;
  pendingPayments: Map<string, { accountId: string; dropId: string }>;
  membershipEntitlements: MembershipEntitlementRecord[];
  patronTierConfigs: PatronTierConfigRecord[];
  liveSessions: LiveSessionRecord[];
  liveSessionArtifacts: LiveSessionArtifactRecord[];
  workshopProProfiles: WorkshopProProfileRecord[];
  worldReleaseQueue: WorldReleaseQueueRecord[];
  dropVersions: DropVersion[];
  authorizedDerivatives: AuthorizedDerivative[];
};

const PROCESSING_FEE_USD = 1.99;
const WORLD_RELEASE_PACING_WINDOW_HOURS: Record<WorldReleaseQueuePacingMode, number> = {
  manual: 0,
  daily: 24,
  weekly: 168
};
const DROP_VERSION_LABELS = new Set<DropVersionLabel>([
  "v1",
  "v2",
  "v3",
  "director_cut",
  "remaster"
]);
const AUTHORIZED_DERIVATIVE_KINDS = new Set<AuthorizedDerivativeKind>([
  "remix",
  "translation",
  "anthology_world",
  "collaborative_season"
]);
const LIVE_SESSION_ARTIFACT_KINDS = new Set<LiveSessionArtifactKind>([
  "recording",
  "transcript",
  "highlight"
]);
const PATRON_COMMITMENT_CADENCE_SET = new Set<PatronCommitmentCadence>([
  "weekly",
  "monthly",
  "quarterly"
]);
const PATRON_COMMITMENT_CADENCE_TO_PERIOD_DAYS: Record<PatronCommitmentCadence, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90
};
const PATRON_TIER_STATUS_SET = new Set<PatronTierStatus>(["active", "disabled"]);
const WORKSHOP_PRO_STATES = new Set<WorkshopProState>(["active", "past_due", "grace", "locked"]);

function toHandle(email: string): string {
  const base = email.split("@")[0] ?? "collector";
  return base.toLowerCase().replace(/[^a-z0-9_]/g, "") || "collector";
}

function startCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
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

function hasValidRevenueSplitTotal(
  revenueSplits: Array<{ recipientHandle: string; sharePercent: number }>
): boolean {
  const total = Number(
    revenueSplits.reduce((sum, entry) => sum + entry.sharePercent, 0).toFixed(2)
  );
  return total === 100;
}

function createInitialStore(): MockStore {
  const worlds = new Map<string, World>([
    [
      "dark-matter",
      {
        id: "dark-matter",
        title: "dark matter",
        synopsis: "cinematic drops exploring identity and memory.",
        studioHandle: "oneofakinde",
        visualIdentity: {
          coverImageSrc: "/images/worlds/dark-matter-cover.jpg",
          colorPrimary: "#0b132b",
          colorSecondary: "#1c2541",
          motionTreatment: "world_ambient_v1"
        },
        ambientAudioSrc: "https://cdn.oneofakinde.dev/worlds/dark-matter/ambient.mp3",
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
      }
    ],
    [
      "through-the-lens",
      {
        id: "through-the-lens",
        title: "through the lens",
        synopsis: "camera-led drops for real-world atmospheres.",
        studioHandle: "oneofakinde",
        visualIdentity: {
          coverImageSrc: "/images/worlds/through-the-lens-cover.jpg",
          colorPrimary: "#102a43",
          colorSecondary: "#334e68",
          motionTreatment: "world_ambient_v1"
        },
        ambientAudioSrc: "https://cdn.oneofakinde.dev/worlds/through-the-lens/ambient.mp3",
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
    ]
  ]);

  const studios = new Map<string, Studio>([
    [
      "oneofakinde",
      {
        handle: "oneofakinde",
        title: "oneofakinde",
        synopsis: "a cultural network publishing drops across live, read, listen, and watch modes.",
        worldIds: ["dark-matter", "through-the-lens"]
      }
    ]
  ]);

  const drops = new Map<string, Drop>([
    [
      "stardust",
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
      }
    ],
    [
      "twilight-whispers",
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
      }
    ],
    [
      "voidrunner",
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
      }
    ],
    [
      "through-the-lens",
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
    ]
  ]);

  const accounts = new Map<string, AccountRecord>();
  const accountsByEmailRole = new Map<string, string>();
  const sessionToAccount = new Map<string, string>();
  const ownershipByAccount = new Map<string, OwnedDrop[]>();
  const savedDropIdsByAccount = new Map<string, string[]>();
  const receiptsByAccount = new Map<string, PurchaseReceipt[]>();
  const certificatesById = new Map<string, CertificateRecord>();
  const pendingPayments = new Map<string, { accountId: string; dropId: string }>();
  const membershipEntitlements: MembershipEntitlementRecord[] = [];
  const patronTierConfigs: PatronTierConfigRecord[] = [
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
      updatedAt: "2026-02-10T12:00:00.000Z",
      updatedByHandle: "oneofakinde"
    }
  ];
  const liveSessions: LiveSessionRecord[] = [
    {
      id: "live_dark_matter_open_studio",
      studioHandle: "oneofakinde",
      worldId: "dark-matter",
      dropId: null,
      title: "dark matter open studio",
      synopsis: "public live studio walk-through.",
      startsAt: "2026-02-17T12:00:00.000Z",
      endsAt: null,
      mode: "live",
      eligibilityRule: "public",
      type: "studio_session",
      eligibility: "open",
      spatialAudio: false,
      exclusiveDropWindowDropId: undefined,
      exclusiveDropWindowDelay: undefined,
      capacity: 250
    },
    {
      id: "live_dark_matter_members_salons",
      studioHandle: "oneofakinde",
      worldId: "dark-matter",
      dropId: null,
      title: "members salon: dark matter",
      synopsis: "members-only session for current world collectors.",
      startsAt: "2026-02-18T12:00:00.000Z",
      endsAt: null,
      mode: "live",
      eligibilityRule: "membership_active",
      type: "opening",
      eligibility: "membership",
      spatialAudio: true,
      exclusiveDropWindowDropId: undefined,
      exclusiveDropWindowDelay: undefined,
      capacity: 120
    },
    {
      id: "live_stardust_collectors_qna",
      studioHandle: "oneofakinde",
      worldId: "dark-matter",
      dropId: "stardust",
      title: "stardust collectors q&a",
      synopsis: "collector session unlocked by stardust ownership.",
      startsAt: "2026-02-19T12:00:00.000Z",
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
  ];
  const liveSessionArtifacts: LiveSessionArtifactRecord[] = [];
  const workshopProProfiles: WorkshopProProfileRecord[] = [
    {
      studioHandle: "oneofakinde",
      state: "active",
      cycleAnchorAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z"
    }
  ];

  const worldReleaseQueue: WorldReleaseQueueRecord[] = [
    {
      id: "wrel_seed_dark_matter_episode_two",
      studioHandle: "oneofakinde",
      worldId: "dark-matter",
      dropId: "voidrunner",
      scheduledFor: "2026-03-02T12:00:00.000Z",
      pacingMode: "weekly",
      pacingWindowHours: 168,
      status: "scheduled",
      createdByAccountId: "acct_collector_demo",
      createdAt: "2026-02-20T12:00:00.000Z",
      updatedAt: "2026-02-20T12:00:00.000Z",
      publishedAt: null,
      canceledAt: null
    }
  ];
  const dropVersions: DropVersion[] = [
    {
      id: "dver_seed_stardust_v1",
      dropId: "stardust",
      label: "v1",
      notes: "original cut",
      createdByHandle: "oneofakinde",
      createdAt: "2026-02-16T12:00:00.000Z",
      releasedAt: "2026-02-16T12:00:00.000Z"
    },
    {
      id: "dver_seed_through_lens_v1",
      dropId: "through-the-lens",
      label: "v1",
      notes: "launch edit",
      createdByHandle: "oneofakinde",
      createdAt: "2026-02-14T12:00:00.000Z",
      releasedAt: "2026-02-14T12:00:00.000Z"
    }
  ];
  const authorizedDerivatives: AuthorizedDerivative[] = [
    {
      id: "ader_seed_stardust_voidrunner",
      sourceDropId: "stardust",
      derivativeDropId: "voidrunner",
      kind: "remix",
      attribution: "voidrunner remix from stardust",
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
      createdAt: "2026-02-18T12:00:00.000Z"
    }
  ];

  const accountId = "acct_collector_demo";
  const account: AccountRecord = {
    id: accountId,
    email: "collector@oneofakinde.com",
    handle: "collector_demo",
    displayName: "collector demo",
    roles: ["collector"]
  };

  accounts.set(accountId, account);
  accountsByEmailRole.set("collector@oneofakinde.com:collector", accountId);
  savedDropIdsByAccount.set(accountId, ["twilight-whispers", "through-the-lens", "voidrunner"]);
  membershipEntitlements.push({
    id: "mship_seed_dark_matter",
    accountId,
    studioHandle: "oneofakinde",
    worldId: "dark-matter",
    status: "active",
    startedAt: "2026-02-02T12:00:00.000Z",
    endsAt: null
  });

  const seededDrop = drops.get("stardust");
  if (seededDrop) {
    const seededReceipt: PurchaseReceipt = {
      id: "rcpt_seed_stardust",
      accountId,
      dropId: seededDrop.id,
      amountUsd: seededDrop.priceUsd,
      status: "completed",
      purchasedAt: "2026-02-16T12:00:00.000Z"
    };

    const seededCertificate: CertificateRecord = {
      id: "cert_seed_stardust",
      dropId: seededDrop.id,
      dropTitle: seededDrop.title,
      ownerHandle: account.handle,
      issuedAt: seededReceipt.purchasedAt,
      receiptId: seededReceipt.id,
      status: "verified",
      ownerAccountId: account.id
    };

    receiptsByAccount.set(accountId, [seededReceipt]);
    ownershipByAccount.set(accountId, [
      {
        drop: seededDrop,
        certificateId: seededCertificate.id,
        acquiredAt: seededReceipt.purchasedAt,
        receiptId: seededReceipt.id
      }
    ]);
    certificatesById.set(seededCertificate.id, seededCertificate);
  }

  return {
    drops,
    worlds,
    studios,
    accounts,
    accountsByEmailRole,
    sessionToAccount,
    ownershipByAccount,
    savedDropIdsByAccount,
    receiptsByAccount,
    certificatesById,
    pendingPayments,
    membershipEntitlements,
    patronTierConfigs,
    liveSessions,
    liveSessionArtifacts,
    workshopProProfiles,
    worldReleaseQueue,
    dropVersions,
    authorizedDerivatives
  };
}

const globalScope = globalThis as typeof globalThis & {
  __ookMockStore?: MockStore;
};

const store = globalScope.__ookMockStore ?? createInitialStore();
if (!globalScope.__ookMockStore) {
  globalScope.__ookMockStore = store;
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function accountKey(email: string, role: AccountRole): string {
  return `${normalizeEmail(email)}:${role}`;
}

function upsertAccount(input: CreateSessionInput): AccountRecord {
  const normalizedEmail = normalizeEmail(input.email);
  const key = accountKey(normalizedEmail, input.role);
  const existingId = store.accountsByEmailRole.get(key);

  if (existingId) {
    const existing = store.accounts.get(existingId);
    if (existing) {
      return existing;
    }
  }

  const handle = toHandle(normalizedEmail);
  const account: AccountRecord = {
    id: `acct_${randomUUID()}`,
    email: normalizedEmail,
    handle,
    displayName: startCase(handle),
    roles: [input.role]
  };

  store.accounts.set(account.id, account);
  store.accountsByEmailRole.set(key, account.id);

  return account;
}

function getOwnedDrops(accountId: string): OwnedDrop[] {
  return [...(store.ownershipByAccount.get(accountId) ?? [])].sort(
    (a, b) => Date.parse(b.acquiredAt) - Date.parse(a.acquiredAt)
  );
}

function getSavedDrops(accountId: string): LibraryDrop[] {
  const savedIds = store.savedDropIdsByAccount.get(accountId) ?? [];

  return savedIds
    .map((dropId, index) => {
      const drop = store.drops.get(dropId);
      if (!drop) return null;

      return {
        drop,
        savedAt: new Date(Date.now() - index * 86_400_000).toISOString()
      } satisfies LibraryDrop;
    })
    .filter((entry): entry is LibraryDrop => entry !== null);
}

function maxIsoDate(values: Array<string | null | undefined>): string {
  const fallback = new Date().toISOString();
  const timestamps = values
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return fallback;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function listAllReceipts(): PurchaseReceipt[] {
  return Array.from(store.receiptsByAccount.values()).flatMap((entries) => entries);
}

function getWorkshopAnalyticsPanelForAccount(account: AccountRecord): WorkshopAnalyticsPanel {
  const creatorDrops = Array.from(store.drops.values()).filter(
    (drop) => drop.studioHandle === account.handle
  );
  const creatorDropIdSet = new Set(creatorDrops.map((drop) => drop.id));
  const completedCollects = listAllReceipts().filter(
    (receipt) => receipt.status === "completed" && creatorDropIdSet.has(receipt.dropId)
  );

  const collectIntents = completedCollects.length * 2;
  const collectConversionRate =
    collectIntents > 0
      ? Number((completedCollects.length / collectIntents).toFixed(4))
      : 0;

  return {
    studioHandle: account.handle,
    dropsPublished: creatorDrops.length,
    discoveryImpressions: creatorDrops.length * 120,
    previewStarts: creatorDrops.length * 80,
    accessStarts: creatorDrops.length * 40,
    completions: creatorDrops.length * 18,
    collectIntents,
    completedCollects: completedCollects.length,
    collectConversionRate,
    updatedAt: maxIsoDate(
      completedCollects.map((receipt) => receipt.purchasedAt).concat(creatorDrops.map((drop) => drop.releaseDate))
    )
  };
}

function getMyCollectionAnalyticsPanelForAccount(account: AccountRecord): MyCollectionAnalyticsPanel {
  const ownedDrops = getOwnedDrops(account.id);
  const worldCount = new Set(ownedDrops.map((entry) => entry.drop.worldId)).size;
  const receipts = (store.receiptsByAccount.get(account.id) ?? []).filter(
    (receipt) => receipt.status === "completed"
  );
  const totalSpentUsd = receipts.reduce((sum, receipt) => sum + receipt.amountUsd, 0);
  const averageCollectPriceUsd =
    receipts.length > 0 ? Number((totalSpentUsd / receipts.length).toFixed(2)) : 0;
  const recentCollectCount30d = receipts.filter((receipt) => {
    const purchasedAt = Date.parse(receipt.purchasedAt);
    if (!Number.isFinite(purchasedAt)) {
      return false;
    }
    return Date.now() - purchasedAt <= 30 * 24 * 60 * 60 * 1000;
  }).length;
  const saveCount = (store.savedDropIdsByAccount.get(account.id) ?? []).length;

  return {
    accountHandle: account.handle,
    holdingsCount: ownedDrops.length,
    worldCount,
    totalSpentUsd: Number(totalSpentUsd.toFixed(2)),
    averageCollectPriceUsd,
    recentCollectCount30d,
    participation: {
      likes: 0,
      comments: 0,
      shares: 0,
      saves: saveCount
    },
    updatedAt: maxIsoDate(
      receipts.map((receipt) => receipt.purchasedAt).concat(ownedDrops.map((entry) => entry.acquiredAt))
    )
  };
}

function getOpsAnalyticsPanelForAccount(): OpsAnalyticsPanel {
  const receipts = listAllReceipts();
  const completedReceipts = receipts.filter((receipt) => receipt.status === "completed").length;
  const refundedReceipts = receipts.filter((receipt) => receipt.status === "refunded").length;
  const pendingPayments = store.pendingPayments.size;

  return {
    settlement: {
      completedReceipts,
      refundedReceipts,
      ledgerTransactions: 0,
      ledgerLineItems: 0,
      missingLedgerLinks: 0
    },
    webhooks: {
      processedEvents: 0,
      pendingPayments,
      failedPayments: 0,
      refundedPayments: 0
    },
    reliability: {
      watchSessionErrors: 0,
      watchSessionStalls: 0,
      rebufferEvents: 0,
      qualityStepDowns: 0
    },
    updatedAt: maxIsoDate(
      receipts.map((receipt) => receipt.purchasedAt).concat(Array.from(store.drops.values()).map((drop) => drop.releaseDate))
    )
  };
}

function buildDropLineageSnapshot(dropId: string): DropLineageSnapshot {
  const versions = store.dropVersions
    .filter((version) => version.dropId === dropId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const derivatives = store.authorizedDerivatives
    .filter((entry) => entry.sourceDropId === dropId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return {
    dropId,
    versions,
    derivatives
  };
}

function buildDropLiveArtifactsSnapshot(dropId: string): DropLiveArtifactsSnapshot {
  const artifacts = store.liveSessionArtifacts
    .filter((artifact) => artifact.status === "approved")
    .filter((artifact) => artifact.catalogDropId === dropId || artifact.sourceDropId === dropId)
    .map((artifact) => {
      const liveSession =
        store.liveSessions.find((entry) => entry.id === artifact.liveSessionId) ?? null;
      const sourceDrop = artifact.sourceDropId
        ? (store.drops.get(artifact.sourceDropId) ?? null)
        : null;
      const catalogDrop = artifact.catalogDropId
        ? (store.drops.get(artifact.catalogDropId) ?? null)
        : null;
      const approvedAt = artifact.approvedAt ?? artifact.capturedAt;

      return {
        artifactId: artifact.id,
        artifactKind: artifact.artifactKind,
        title: artifact.title,
        synopsis: artifact.synopsis,
        capturedAt: artifact.capturedAt,
        approvedAt,
        liveSessionId: artifact.liveSessionId,
        liveSessionTitle: liveSession?.title ?? artifact.liveSessionId,
        liveSessionStartsAt: liveSession?.startsAt ?? artifact.capturedAt,
        liveSessionType: liveSession?.type ?? "event",
        sourceDropId: artifact.sourceDropId ?? null,
        sourceDropTitle: sourceDrop?.title ?? null,
        catalogDropId: artifact.catalogDropId ?? artifact.id,
        catalogDropTitle: catalogDrop?.title ?? artifact.title
      };
    })
    .sort((a, b) => {
      const approvedDelta = Date.parse(b.approvedAt) - Date.parse(a.approvedAt);
      if (approvedDelta !== 0) {
        return approvedDelta;
      }
      return Date.parse(b.capturedAt) - Date.parse(a.capturedAt);
    });

  return {
    dropId,
    artifacts
  };
}

function grantOwnership({
  account,
  drop,
  receipt
}: {
  account: AccountRecord;
  drop: Drop;
  receipt: PurchaseReceipt;
}): OwnedDrop {
  const certificate: CertificateRecord = {
    id: `cert_${randomUUID()}`,
    dropId: drop.id,
    dropTitle: drop.title,
    ownerHandle: account.handle,
    issuedAt: receipt.purchasedAt,
    receiptId: receipt.id,
    status: "verified",
    ownerAccountId: account.id
  };

  const ownedDrop: OwnedDrop = {
    drop,
    certificateId: certificate.id,
    acquiredAt: receipt.purchasedAt,
    receiptId: receipt.id
  };

  store.certificatesById.set(certificate.id, certificate);

  return ownedDrop;
}

function isMembershipActive(entitlement: MembershipEntitlementRecord, nowMs = Date.now()): boolean {
  if (entitlement.status !== "active") {
    return false;
  }

  const startedAt = Date.parse(entitlement.startedAt);
  if (Number.isFinite(startedAt) && startedAt > nowMs) {
    return false;
  }

  if (!entitlement.endsAt) {
    return true;
  }

  const endsAt = Date.parse(entitlement.endsAt);
  if (!Number.isFinite(endsAt)) {
    return false;
  }

  return endsAt >= nowMs;
}

function resolveDropVisibility(drop: Drop): "public" | "world_members" | "collectors_only" {
  if (drop.visibility === "world_members" || drop.visibility === "collectors_only") {
    return drop.visibility;
  }

  return "public";
}

function hasActiveMembershipForWorld(accountId: string, world: World): boolean {
  return store.membershipEntitlements.some((entitlement) => {
    if (entitlement.accountId !== accountId) {
      return false;
    }

    if (entitlement.studioHandle !== world.studioHandle) {
      return false;
    }

    if (!isMembershipActive(entitlement)) {
      return false;
    }

    return entitlement.worldId === null || entitlement.worldId === world.id;
  });
}

function hasCollectEntitlementForWorld(accountId: string, world: World): boolean {
  return getOwnedDrops(accountId).some((ownership) => ownership.drop.worldId === world.id);
}

function canAccountDiscoverDrop(account: AccountRecord | null, drop: Drop): boolean {
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

  const ownsDrop = getOwnedDrops(account.id).some((ownership) => ownership.drop.id === drop.id);
  if (ownsDrop) {
    return true;
  }

  if (visibility === "collectors_only") {
    return false;
  }

  const world = store.worlds.get(drop.worldId) ?? null;
  if (!world) {
    return false;
  }

  return hasActiveMembershipForWorld(account.id, world) || hasCollectEntitlementForWorld(account.id, world);
}

function listDiscoverableDrops(viewerAccountId: string | null | undefined): Drop[] {
  const allDrops = [...store.drops.values()];
  if (viewerAccountId === undefined) {
    return allDrops;
  }

  const account = viewerAccountId ? (store.accounts.get(viewerAccountId) ?? null) : null;
  return allDrops.filter((drop) => canAccountDiscoverDrop(account, drop));
}

function toMembershipWhatYouGet(entitlement: MembershipEntitlementRecord): string {
  if (entitlement.worldId) {
    const world = store.worlds.get(entitlement.worldId);
    if (world) {
      return `${world.title} membership access in collect and live session eligibility.`;
    }
  }

  return `${entitlement.studioHandle} membership access across eligible live sessions.`;
}

function toMembershipEntitlement(entitlement: MembershipEntitlementRecord): MembershipEntitlement {
  return {
    id: entitlement.id,
    accountId: entitlement.accountId,
    studioHandle: entitlement.studioHandle,
    worldId: entitlement.worldId,
    status: entitlement.status,
    startedAt: entitlement.startedAt,
    endsAt: entitlement.endsAt,
    whatYouGet: toMembershipWhatYouGet(entitlement),
    isActive: isMembershipActive(entitlement)
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

function listWorkshopPatronTierConfigsByAccount(account: AccountRecord): PatronTierConfig[] {
  return store.patronTierConfigs
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
}

function upsertWorkshopPatronTierConfigRecord(
  accountId: string,
  input: UpsertWorkshopPatronTierConfigInput
): PatronTierConfigRecord | null {
  const account = store.accounts.get(accountId);
  if (!account || !account.roles.includes("creator")) {
    return null;
  }

  const worldId = input.worldId?.trim() || null;
  if (worldId) {
    const world = store.worlds.get(worldId);
    if (!world || world.studioHandle !== account.handle) {
      return null;
    }
  }

  if (!PATRON_TIER_STATUS_SET.has(input.status)) {
    return null;
  }

  const amountCents = Math.floor(input.amountCents);
  const periodDays = Math.floor(input.periodDays);
  const commitmentCadence = input.commitmentCadence;
  const earlyAccessWindowHours = Math.floor(input.earlyAccessWindowHours);
  if (!PATRON_COMMITMENT_CADENCE_SET.has(commitmentCadence)) {
    return null;
  }
  const expectedPeriodDays = PATRON_COMMITMENT_CADENCE_TO_PERIOD_DAYS[commitmentCadence];
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return null;
  }
  if (!Number.isFinite(periodDays) || periodDays <= 0 || periodDays !== expectedPeriodDays) {
    return null;
  }
  if (
    !Number.isFinite(earlyAccessWindowHours) ||
    earlyAccessWindowHours < 1 ||
    earlyAccessWindowHours > 168
  ) {
    return null;
  }

  const title = input.title.trim();
  if (!title) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const existing =
    store.patronTierConfigs.find(
      (entry) => entry.studioHandle === account.handle && entry.worldId === worldId
    ) ?? null;
  const record: PatronTierConfigRecord = existing ?? {
    id: `ptier_${randomUUID()}`,
    studioHandle: account.handle,
    worldId,
    title,
    amountCents,
    commitmentCadence,
    periodDays,
    earlyAccessWindowHours,
    benefitsSummary: input.benefitsSummary.trim(),
    status: input.status,
    updatedAt: nowIso,
    updatedByHandle: account.handle
  };

  record.title = title;
  record.amountCents = amountCents;
  record.commitmentCadence = commitmentCadence;
  record.periodDays = periodDays;
  record.earlyAccessWindowHours = earlyAccessWindowHours;
  record.benefitsSummary = input.benefitsSummary.trim();
  record.status = input.status;
  record.updatedAt = nowIso;
  record.updatedByHandle = account.handle;

  if (!existing) {
    store.patronTierConfigs.unshift(record);
  }

  return record;
}

function toLiveSessionWhatYouGet(liveSession: LiveSessionRecord): string {
  if (liveSession.eligibilityRule === "public") {
    return "public live session access.";
  }

  if (liveSession.eligibilityRule === "membership_active") {
    if (liveSession.worldId) {
      const world = store.worlds.get(liveSession.worldId);
      if (world) {
        return `active membership required for ${world.title}.`;
      }
    }

    return `active membership required for ${liveSession.studioHandle}.`;
  }

  if (liveSession.dropId) {
    const drop = store.drops.get(liveSession.dropId);
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

function toLiveSession(liveSession: LiveSessionRecord): LiveSession {
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
    whatYouGet: toLiveSessionWhatYouGet(liveSession)
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
    approvedAt: record.approvedAt,
    catalogDropId: record.catalogDropId
  };
}

function ensureWorkshopProProfileForCreator(
  account: AccountRecord
): {
  profile: WorkshopProProfileRecord;
  created: boolean;
} {
  const existing = store.workshopProProfiles.find((entry) => entry.studioHandle === account.handle);
  if (existing) {
    return {
      profile: existing,
      created: false
    };
  }

  const nowIso = new Date().toISOString();
  const profile: WorkshopProProfileRecord = {
    studioHandle: account.handle,
    state: "active",
    cycleAnchorAt: nowIso,
    updatedAt: nowIso
  };
  store.workshopProProfiles.unshift(profile);
  return {
    profile,
    created: true
  };
}

function canTransitionWorkshopProState(
  current: WorkshopProState,
  next: WorkshopProState
): boolean {
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
    profile.pastDueAt = undefined;
    profile.graceEndsAt = undefined;
    profile.lockedAt = undefined;
    return true;
  }

  if (nextState === "past_due") {
    profile.pastDueAt = nowIso;
    profile.graceEndsAt = undefined;
    profile.lockedAt = undefined;
    return true;
  }

  if (nextState === "grace") {
    if (!profile.pastDueAt) {
      profile.pastDueAt = nowIso;
    }
    profile.graceEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    profile.lockedAt = undefined;
    return true;
  }

  if (nextState === "locked") {
    profile.lockedAt = nowIso;
    return true;
  }

  return true;
}

function resolveLiveEligibility(accountId: string, liveSession: LiveSessionRecord): LiveSessionEligibility {
  const account = store.accounts.get(accountId);
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
    const match = store.membershipEntitlements.find((entitlement) => {
      if (entitlement.accountId !== account.id) return false;
      if (entitlement.studioHandle !== liveSession.studioHandle) return false;
      if (!isMembershipActive(entitlement)) return false;
      if (!liveSession.worldId) return entitlement.worldId === null;
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

  const ownsDrop =
    !!liveSession.dropId &&
    getOwnedDrops(account.id).some((ownership) => ownership.drop.id === liveSession.dropId);

  return {
    liveSessionId: liveSession.id,
    rule: liveSession.eligibilityRule,
    eligible: ownsDrop,
    reason: ownsDrop ? "eligible_drop_owner" : "ownership_required",
    matchedEntitlementId: null
  };
}

function parseIsoTimestamp(input: string): number | null {
  const parsed = Date.parse(input);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function createWorkshopLiveSessionRecord(
  accountId: string,
  input: CreateWorkshopLiveSessionInput
): LiveSessionRecord | null {
  const account = store.accounts.get(accountId);
  if (!account || !account.roles.includes("creator")) {
    return null;
  }

  const title = input.title.trim();
  if (!title) {
    return null;
  }

  const startsAtMs = parseIsoTimestamp(input.startsAt);
  if (startsAtMs === null) {
    return null;
  }

  let endsAt: string | null = null;
  if (input.endsAt) {
    const endsAtMs = parseIsoTimestamp(input.endsAt);
    if (endsAtMs === null || endsAtMs <= startsAtMs) {
      return null;
    }
    endsAt = new Date(endsAtMs).toISOString();
  }

  let worldId: string | null = input.worldId ?? null;
  if (worldId) {
    const world = store.worlds.get(worldId);
    if (!world || world.studioHandle !== account.handle) {
      return null;
    }
  }

  const dropId: string | null = input.dropId ?? null;
  if (dropId) {
    const drop = store.drops.get(dropId);
    if (!drop || drop.studioHandle !== account.handle) {
      return null;
    }

    if (worldId && drop.worldId !== worldId) {
      return null;
    }

    if (!worldId) {
      worldId = drop.worldId;
    }
  }

  if (input.eligibilityRule === "drop_owner" && !dropId) {
    return null;
  }

  const capacity =
    typeof input.capacity === "number" && Number.isFinite(input.capacity)
      ? Math.max(1, Math.floor(input.capacity))
      : 200;
  const spatialAudio = Boolean(input.spatialAudio);
  const sessionType =
    input.type === "opening" || input.type === "event" || input.type === "studio_session"
      ? input.type
      : input.eligibilityRule === "public"
        ? "studio_session"
        : "opening";

  return {
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
    type: sessionType,
    eligibility:
      input.eligibilityRule === "membership_active"
        ? "membership"
        : input.eligibilityRule === "drop_owner"
          ? "invite"
          : "open",
    spatialAudio,
    exclusiveDropWindowDropId: dropId ?? undefined,
    exclusiveDropWindowDelay: dropId ? 1440 : undefined,
    capacity
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

function listWorkshopWorldReleaseQueueRecords(
  account: AccountRecord,
  worldId?: string | null
): WorldReleaseQueueItem[] {
  return store.worldReleaseQueue
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
      const scheduleDelta = Date.parse(a.scheduledFor) - Date.parse(b.scheduledFor);
      if (scheduleDelta !== 0) {
        return scheduleDelta;
      }
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    })
    .map((entry) => toWorldReleaseQueueItem(entry));
}

function hasWorldReleasePacingConflict(record: {
  studioHandle: string;
  worldId: string;
  scheduledForMs: number;
  pacingWindowHours: number;
}): boolean {
  if (record.pacingWindowHours <= 0) {
    return false;
  }

  const pacingWindowMs = record.pacingWindowHours * 60 * 60 * 1000;
  return store.worldReleaseQueue.some((entry) => {
    if (entry.studioHandle !== record.studioHandle || entry.worldId !== record.worldId) {
      return false;
    }
    if (entry.status === "canceled") {
      return false;
    }

    return Math.abs(Date.parse(entry.scheduledFor) - record.scheduledForMs) < pacingWindowMs;
  });
}

function createWorkshopWorldReleaseRecord(
  accountId: string,
  input: CreateWorkshopWorldReleaseInput
): WorldReleaseQueueRecord | null {
  const account = store.accounts.get(accountId);
  if (!account || !account.roles.includes("creator")) {
    return null;
  }

  const world = store.worlds.get(input.worldId);
  const drop = store.drops.get(input.dropId);
  if (!world || !drop) {
    return null;
  }

  if (world.studioHandle !== account.handle || drop.studioHandle !== account.handle) {
    return null;
  }

  if (drop.worldId !== world.id) {
    return null;
  }

  const scheduledForMs = parseIsoTimestamp(input.scheduledFor);
  if (scheduledForMs === null || scheduledForMs < Date.now()) {
    return null;
  }

  const pacingWindowHours = WORLD_RELEASE_PACING_WINDOW_HOURS[input.pacingMode] ?? 0;
  if (
    hasWorldReleasePacingConflict({
      studioHandle: account.handle,
      worldId: world.id,
      scheduledForMs,
      pacingWindowHours
    })
  ) {
    return null;
  }

  const nowIso = new Date().toISOString();
  return {
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
}

function updateWorkshopWorldReleaseRecordStatus(
  accountId: string,
  releaseId: string,
  status: Exclude<WorldReleaseQueueStatus, "scheduled">
): WorldReleaseQueueRecord | null {
  const account = store.accounts.get(accountId);
  if (!account || !account.roles.includes("creator")) {
    return null;
  }

  const record = store.worldReleaseQueue.find((entry) => entry.id === releaseId);
  if (!record || record.studioHandle !== account.handle || record.status !== "scheduled") {
    return null;
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
  return record;
}

export const commerceGateway: CommerceGateway = {
  async listDrops(viewerAccountId?: string | null): Promise<Drop[]> {
    return listDiscoverableDrops(viewerAccountId).sort(
      (a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate)
    );
  },

  async listWorlds(): Promise<World[]> {
    return [...store.worlds.values()];
  },

  async getWorldById(worldId: string): Promise<World | null> {
    return store.worlds.get(worldId) ?? null;
  },

  async listDropsByWorldId(worldId: string, viewerAccountId?: string | null): Promise<Drop[]> {
    return sortDropsForWorldSurface(
      (await this.listDrops(viewerAccountId)).filter((drop) => drop.worldId === worldId)
    );
  },

  async getStudioByHandle(handle: string): Promise<Studio | null> {
    return store.studios.get(handle) ?? null;
  },

  async listDropsByStudioHandle(handle: string, viewerAccountId?: string | null): Promise<Drop[]> {
    return sortDropsForStudioSurface(
      (await this.listDrops(viewerAccountId)).filter((drop) => drop.studioHandle === handle)
    );
  },

  async getDropById(dropId: string, viewerAccountId?: string | null): Promise<Drop | null> {
    const drop = store.drops.get(dropId) ?? null;
    if (!drop) {
      return null;
    }

    if (viewerAccountId === undefined) {
      return drop;
    }

    const account = viewerAccountId ? (store.accounts.get(viewerAccountId) ?? null) : null;
    return canAccountDiscoverDrop(account, drop) ? drop : null;
  },

  async getDropLineage(dropId: string): Promise<DropLineageSnapshot | null> {
    if (!store.drops.has(dropId)) {
      return null;
    }

    return buildDropLineageSnapshot(dropId);
  },

  async getDropLiveArtifacts(dropId: string): Promise<DropLiveArtifactsSnapshot | null> {
    if (!store.drops.has(dropId)) {
      return null;
    }

    return buildDropLiveArtifactsSnapshot(dropId);
  },

  async createDropVersion(
    accountId: string,
    dropId: string,
    input: CreateDropVersionInput
  ): Promise<DropVersion | null> {
    const account = store.accounts.get(accountId);
    const drop = store.drops.get(dropId);
    if (!account || !drop || !account.roles.includes("creator")) {
      return null;
    }

    if (account.handle !== drop.studioHandle) {
      return null;
    }

    if (!DROP_VERSION_LABELS.has(input.label)) {
      return null;
    }

    const notes = input.notes?.trim() || null;
    const releasedAtRaw = input.releasedAt?.trim() || null;
    if (releasedAtRaw && parseIsoTimestamp(releasedAtRaw) === null) {
      return null;
    }

    const version: DropVersion = {
      id: `dver_${randomUUID()}`,
      dropId: drop.id,
      label: input.label,
      notes,
      createdByHandle: account.handle,
      createdAt: new Date().toISOString(),
      releasedAt: releasedAtRaw
    };
    store.dropVersions.unshift(version);
    return version;
  },

  async createAuthorizedDerivative(
    accountId: string,
    sourceDropId: string,
    input: CreateAuthorizedDerivativeInput
  ): Promise<AuthorizedDerivative | null> {
    const account = store.accounts.get(accountId);
    const sourceDrop = store.drops.get(sourceDropId);
    const derivativeDrop = store.drops.get(input.derivativeDropId);
    if (!account || !sourceDrop || !derivativeDrop || !account.roles.includes("creator")) {
      return null;
    }

    if (account.handle !== sourceDrop.studioHandle || sourceDrop.id === derivativeDrop.id) {
      return null;
    }

    if (!AUTHORIZED_DERIVATIVE_KINDS.has(input.kind)) {
      return null;
    }

    const attribution = input.attribution.trim();
    if (!attribution) {
      return null;
    }

    if (!Array.isArray(input.revenueSplits) || input.revenueSplits.length === 0) {
      return null;
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
      .filter((entry): entry is { recipientHandle: string; sharePercent: number } => entry !== null);
    if (revenueSplits.length !== input.revenueSplits.length || !hasValidRevenueSplitTotal(revenueSplits)) {
      return null;
    }

    const duplicate = store.authorizedDerivatives.find(
      (entry) =>
        entry.sourceDropId === sourceDrop.id &&
        entry.derivativeDropId === derivativeDrop.id &&
        entry.kind === input.kind
    );
    if (duplicate) {
      return null;
    }

    const derivative: AuthorizedDerivative = {
      id: `ader_${randomUUID()}`,
      sourceDropId: sourceDrop.id,
      derivativeDropId: derivativeDrop.id,
      kind: input.kind,
      attribution,
      revenueSplits,
      authorizedByHandle: account.handle,
      createdAt: new Date().toISOString()
    };
    store.authorizedDerivatives.unshift(derivative);
    return derivative;
  },

  async getCheckoutPreview(accountId: string, dropId: string): Promise<CheckoutPreview | null> {
    const drop = store.drops.get(dropId);
    if (!drop) return null;

    const ownedDrop = getOwnedDrops(accountId).find((entry) => entry.drop.id === dropId);
    const quote = ownedDrop
      ? buildCollectSettlementQuote({ subtotalUsd: 0, processingUsd: 0 })
      : buildCollectSettlementQuote({ subtotalUsd: drop.priceUsd, processingUsd: PROCESSING_FEE_USD });

    return {
      drop,
      subtotalUsd: quote.subtotalUsd,
      processingUsd: quote.processingUsd,
      totalUsd: quote.totalUsd,
      currency: "USD",
      quote
    };
  },

  async createCheckoutSession(
    accountId: string,
    dropId: string,
    options?: {
      successUrl?: string;
      cancelUrl?: string;
    }
  ): Promise<CheckoutSession | null> {
    const account = store.accounts.get(accountId);
    const drop = store.drops.get(dropId);
    if (!account || !drop) return null;

    const ownedDrop = getOwnedDrops(accountId).find((entry) => entry.drop.id === dropId);
    if (ownedDrop) {
      return {
        status: "already_owned",
        receiptId: ownedDrop.receiptId
      };
    }

    const paymentId = `pay_${randomUUID()}`;
    const checkoutSessionId = `mock_session_${randomUUID()}`;
    const quote = buildCollectSettlementQuote({
      subtotalUsd: drop.priceUsd,
      processingUsd: PROCESSING_FEE_USD
    });
    store.pendingPayments.set(paymentId, {
      accountId,
      dropId
    });

    return {
      status: "pending",
      paymentId,
      provider: "manual",
      checkoutSessionId,
      checkoutUrl:
        options?.successUrl ??
        `/collect/${encodeURIComponent(dropId)}?payment=success&payment_id=${encodeURIComponent(paymentId)}`,
      drop,
      amountUsd: quote.totalUsd,
      currency: "USD",
      quote
    };
  },

  async completePendingPayment(paymentId: string): Promise<PurchaseReceipt | null> {
    const pending = store.pendingPayments.get(paymentId);
    if (!pending) {
      return null;
    }

    const receipt = await this.purchaseDrop(pending.accountId, pending.dropId);
    if (!receipt || receipt.status === "already_owned") {
      store.pendingPayments.delete(paymentId);
      return receipt;
    }

    store.pendingPayments.delete(paymentId);
    return receipt;
  },

  async purchaseDrop(accountId: string, dropId: string): Promise<PurchaseReceipt | null> {
    const account = store.accounts.get(accountId);
    const drop = store.drops.get(dropId);
    if (!account || !drop) return null;

    const ownedDrop = getOwnedDrops(accountId).find((entry) => entry.drop.id === dropId);
    if (ownedDrop) {
      return {
        id: ownedDrop.receiptId,
        accountId,
        dropId,
        amountUsd: 0,
        status: "already_owned",
        purchasedAt: ownedDrop.acquiredAt
      };
    }

    const quote = buildCollectSettlementQuote({
      subtotalUsd: drop.priceUsd,
      processingUsd: PROCESSING_FEE_USD
    });
    const receipt: PurchaseReceipt = {
      id: `rcpt_${randomUUID()}`,
      accountId,
      dropId,
      amountUsd: quote.totalUsd,
      subtotalUsd: quote.subtotalUsd,
      processingUsd: quote.processingUsd,
      commissionUsd: quote.commissionUsd,
      payoutUsd: quote.payoutUsd,
      quoteEngineVersion: quote.engineVersion,
      status: "completed",
      purchasedAt: new Date().toISOString()
    };

    const owned = grantOwnership({ account, drop, receipt });

    store.ownershipByAccount.set(accountId, [owned, ...(store.ownershipByAccount.get(accountId) ?? [])]);
    store.receiptsByAccount.set(accountId, [receipt, ...(store.receiptsByAccount.get(accountId) ?? [])]);

    return receipt;
  },

  async getMyCollection(accountId: string): Promise<MyCollectionSnapshot | null> {
    const account = store.accounts.get(accountId);
    if (!account) return null;

    const receipts = store.receiptsByAccount.get(accountId) ?? [];
    const totalSpentUsd = receipts
      .filter((receipt) => receipt.status === "completed")
      .reduce((sum, receipt) => sum + receipt.amountUsd, 0);

    return {
      account: {
        accountId: account.id,
        handle: account.handle,
        displayName: account.displayName
      },
      ownedDrops: getOwnedDrops(accountId),
      totalSpentUsd: Number(totalSpentUsd.toFixed(2))
    };
  },

  async getMyCollectionAnalyticsPanel(accountId: string): Promise<MyCollectionAnalyticsPanel | null> {
    const account = store.accounts.get(accountId);
    if (!account) {
      return null;
    }

    return getMyCollectionAnalyticsPanelForAccount(account);
  },

  async getLibrary(
    accountId: string,
    _options?: {
      queueLimit?: number;
    }
  ): Promise<LibrarySnapshot | null> {
    void _options;
    const account = store.accounts.get(accountId);
    if (!account) return null;

    const ownedDropIds = new Set(getOwnedDrops(accountId).map((entry) => entry.drop.id));
    const evaluatedAt = new Date().toISOString();
    const savedDrops = getSavedDrops(accountId).map((entry) => {
      const hasEntitlement = ownedDropIds.has(entry.drop.id);
      const state: "owned" | "unlocked" = hasEntitlement ? "owned" : "unlocked";
      return {
        ...entry,
        eligibility: {
          state,
          delta: "initial" as const,
          previousState: null,
          canDiscover: true,
          canCollectNow: true,
          hasEntitlement,
          evaluatedAt
        }
      };
    });

    const readQueue = savedDrops.map((entry, index) => ({
      drop: entry.drop,
      savedAt: entry.savedAt,
      queuePosition: index + 1,
      eligibility: entry.eligibility,
      resume: {
        completionPercent: 0,
        progressState: "pending" as const,
        lastActivityAt: null,
        resumeLabel: "start reading",
        progressLabel: "0% complete",
        consumedSeconds: 0,
        positionHint: null
      }
    }));
    const listenQueue = savedDrops.map((entry, index) => ({
      drop: entry.drop,
      savedAt: entry.savedAt,
      queuePosition: index + 1,
      eligibility: entry.eligibility,
      resume: {
        completionPercent: 0,
        progressState: "pending" as const,
        lastActivityAt: null,
        resumeLabel: "start listening",
        progressLabel: "0% complete",
        consumedSeconds: 0,
        positionHint: null
      }
    }));

    return {
      account: {
        accountId: account.id,
        handle: account.handle,
        displayName: account.displayName
      },
      savedDrops,
      readQueue,
      listenQueue
    };
  },

  async getWorkshopAnalyticsPanel(accountId: string): Promise<WorkshopAnalyticsPanel | null> {
    const account = store.accounts.get(accountId);
    if (!account || !account.roles.includes("creator")) {
      return null;
    }

    return getWorkshopAnalyticsPanelForAccount(account);
  },

  async getOpsAnalyticsPanel(accountId: string): Promise<OpsAnalyticsPanel | null> {
    const account = store.accounts.get(accountId);
    if (!account || !account.roles.includes("creator")) {
      return null;
    }

    return getOpsAnalyticsPanelForAccount();
  },

  async getReceipt(accountId: string, receiptId: string): Promise<PurchaseReceipt | null> {
    const receipts = store.receiptsByAccount.get(accountId) ?? [];
    return receipts.find((receipt) => receipt.id === receiptId) ?? null;
  },

  async hasDropEntitlement(accountId: string, dropId: string): Promise<boolean> {
    const ownedDrops = getOwnedDrops(accountId);
    return ownedDrops.some((entry) => entry.drop.id === dropId);
  },

  async listMembershipEntitlements(accountId: string): Promise<MembershipEntitlement[]> {
    return store.membershipEntitlements
      .filter((entitlement) => entitlement.accountId === accountId)
      .map(toMembershipEntitlement)
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  },

  async listCollectLiveSessions(accountId: string): Promise<CollectLiveSessionSnapshot[]> {
    return [...store.liveSessions]
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
      .map((liveSession) => ({
        liveSession: toLiveSession(liveSession),
        eligibility: resolveLiveEligibility(accountId, liveSession)
      }));
  },

  async getCollectLiveSessionEligibility(
    accountId: string,
    liveSessionId: string
  ): Promise<LiveSessionEligibility | null> {
    const liveSession = store.liveSessions.find((entry) => entry.id === liveSessionId);
    if (!liveSession) {
      return null;
    }

    return resolveLiveEligibility(accountId, liveSession);
  },

  async listWorkshopLiveSessions(accountId: string): Promise<LiveSession[]> {
    const account = store.accounts.get(accountId);
    if (!account || !account.roles.includes("creator")) {
      return [];
    }

    return store.liveSessions
      .filter((liveSession) => liveSession.studioHandle === account.handle)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
      .map(toLiveSession);
  },

  async listWorkshopLiveSessionArtifacts(accountId: string): Promise<LiveSessionArtifact[]> {
    const account = store.accounts.get(accountId);
    if (!account || !account.roles.includes("creator")) {
      return [];
    }

    return store.liveSessionArtifacts
      .filter((artifact) => artifact.studioHandle === account.handle)
      .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))
      .map((artifact) => toLiveSessionArtifact(artifact));
  },

  async listWorkshopPatronTierConfigs(accountId: string): Promise<PatronTierConfig[]> {
    const account = store.accounts.get(accountId);
    if (!account || !account.roles.includes("creator")) {
      return [];
    }

    return listWorkshopPatronTierConfigsByAccount(account);
  },

  async upsertWorkshopPatronTierConfig(
    accountId: string,
    input: UpsertWorkshopPatronTierConfigInput
  ): Promise<PatronTierConfig | null> {
    const updated = upsertWorkshopPatronTierConfigRecord(accountId, input);
    if (!updated) {
      return null;
    }

    return toPatronTierConfig(updated);
  },

  async createWorkshopLiveSession(
    accountId: string,
    input: CreateWorkshopLiveSessionInput
  ): Promise<LiveSession | null> {
    const created = createWorkshopLiveSessionRecord(accountId, input);
    if (!created) {
      return null;
    }

    store.liveSessions.unshift(created);
    return toLiveSession(created);
  },

  async captureWorkshopLiveSessionArtifact(
    accountId: string,
    input: CaptureWorkshopLiveSessionArtifactInput
  ): Promise<LiveSessionArtifact | null> {
    const account = store.accounts.get(accountId);
    if (!account || !account.roles.includes("creator")) {
      return null;
    }

    const liveSession = store.liveSessions.find((entry) => entry.id === input.liveSessionId);
    if (!liveSession || liveSession.studioHandle !== account.handle) {
      return null;
    }

    const title = input.title.trim();
    if (!title) {
      return null;
    }

    const artifactKind = input.artifactKind ?? "highlight";
    if (!LIVE_SESSION_ARTIFACT_KINDS.has(artifactKind)) {
      return null;
    }

    let worldId = input.worldId ?? liveSession.worldId ?? null;
    if (worldId) {
      const world = store.worlds.get(worldId);
      if (!world || world.studioHandle !== account.handle) {
        return null;
      }
    }

    const sourceDropId = input.sourceDropId ?? liveSession.dropId ?? null;
    if (sourceDropId) {
      const sourceDrop = store.drops.get(sourceDropId);
      if (!sourceDrop || sourceDrop.studioHandle !== account.handle) {
        return null;
      }

      if (!worldId) {
        worldId = sourceDrop.worldId;
      }

      if (worldId && sourceDrop.worldId !== worldId) {
        return null;
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
      approvedAt: undefined,
      catalogDropId: undefined
    };
    store.liveSessionArtifacts.unshift(artifact);

    return toLiveSessionArtifact(artifact);
  },

  async approveWorkshopLiveSessionArtifact(
    accountId: string,
    artifactId: string
  ): Promise<LiveSessionArtifact | null> {
    const account = store.accounts.get(accountId);
    if (!account || !account.roles.includes("creator")) {
      return null;
    }

    const artifact = store.liveSessionArtifacts.find(
      (entry) => entry.id === artifactId && entry.studioHandle === account.handle
    );
    if (!artifact || artifact.status !== "held_for_review") {
      return null;
    }

    const liveSession =
      store.liveSessions.find((entry) => entry.id === artifact.liveSessionId) ?? null;
    const sourceDrop =
      (artifact.sourceDropId ? store.drops.get(artifact.sourceDropId) ?? null : null) ??
      (liveSession?.dropId ? store.drops.get(liveSession.dropId) ?? null : null);

    const worldId = artifact.worldId ?? liveSession?.worldId ?? sourceDrop?.worldId ?? null;
    if (!worldId) {
      return null;
    }

    const world = store.worlds.get(worldId);
    if (!world || world.studioHandle !== account.handle) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const artifactCountForSession = store.liveSessionArtifacts.filter(
      (entry) => entry.liveSessionId === artifact.liveSessionId
    ).length;
    const dropId = `artifact_${randomUUID()}`;

    const drop: Drop = {
      id: dropId,
      title: artifact.title,
      seasonLabel: world.releaseStructure?.currentLabel ?? "live artifacts",
      episodeLabel: `artifact ${artifactCountForSession}`,
      studioHandle: account.handle,
      worldId,
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
    };

    store.drops.set(drop.id, drop);

    artifact.status = "approved";
    artifact.approvedAt = nowIso;
    artifact.catalogDropId = drop.id;
    artifact.worldId = worldId;
    if (!artifact.sourceDropId && sourceDrop) {
      artifact.sourceDropId = sourceDrop.id;
    }

    return toLiveSessionArtifact(artifact);
  },

  async getWorkshopProProfile(accountId: string): Promise<WorkshopProProfile | null> {
    const account = store.accounts.get(accountId);
    if (!account || !account.roles.includes("creator")) {
      return null;
    }

    const ensured = ensureWorkshopProProfileForCreator(account);
    return ensured.profile;
  },

  async transitionWorkshopProState(
    accountId: string,
    state: WorkshopProState
  ): Promise<WorkshopProProfile | null> {
    const account = store.accounts.get(accountId);
    if (!account || !account.roles.includes("creator")) {
      return null;
    }

    if (!WORKSHOP_PRO_STATES.has(state)) {
      return null;
    }

    const ensured = ensureWorkshopProProfileForCreator(account);
    if (!applyWorkshopProStateTransition(ensured.profile, state)) {
      return null;
    }

    return ensured.profile;
  },

  async listWorkshopWorldReleaseQueue(
    accountId: string,
    worldId?: string | null
  ): Promise<WorldReleaseQueueItem[]> {
    const account = store.accounts.get(accountId);
    if (!account || !account.roles.includes("creator")) {
      return [];
    }

    if (worldId) {
      const world = store.worlds.get(worldId);
      if (!world || world.studioHandle !== account.handle) {
        return [];
      }
    }

    return listWorkshopWorldReleaseQueueRecords(account, worldId);
  },

  async createWorkshopWorldRelease(
    accountId: string,
    input: CreateWorkshopWorldReleaseInput
  ): Promise<WorldReleaseQueueItem | null> {
    const created = createWorkshopWorldReleaseRecord(accountId, input);
    if (!created) {
      return null;
    }

    store.worldReleaseQueue.push(created);
    return toWorldReleaseQueueItem(created);
  },

  async updateWorkshopWorldReleaseStatus(
    accountId: string,
    releaseId: string,
    status: Exclude<WorldReleaseQueueStatus, "scheduled">
  ): Promise<WorldReleaseQueueItem | null> {
    const updated = updateWorkshopWorldReleaseRecordStatus(accountId, releaseId, status);
    if (!updated) {
      return null;
    }
    return toWorldReleaseQueueItem(updated);
  },

  async appealTownhallComment(
    _accountId: string,
    _dropId: string,
    _commentId: string
  ): Promise<TownhallDropSocialSnapshot | null> {
    void _accountId;
    void _dropId;
    void _commentId;
    return null;
  },

  async listTownhallModerationQueue(_accountId: string): Promise<TownhallModerationQueueItem[]> {
    void _accountId;
    return [];
  },

  async resolveTownhallModerationCase(
    _accountId: string,
    _dropId: string,
    _commentId: string,
    _resolution: TownhallModerationCaseResolution
  ): Promise<TownhallModerationCaseResolveResult> {
    void _accountId;
    void _dropId;
    void _commentId;
    void _resolution;
    return {
      ok: false,
      reason: "forbidden"
    };
  },

  async getCertificateById(certificateId: string): Promise<Certificate | null> {
    const certificate = store.certificatesById.get(certificateId);
    return certificate ? toPublicCertificate(certificate) : null;
  },

  async getCertificateByReceipt(accountId: string, receiptId: string): Promise<Certificate | null> {
    const certificate = [...store.certificatesById.values()].find(
      (item) => item.ownerAccountId === accountId && item.receiptId === receiptId
    );

    return certificate ? toPublicCertificate(certificate) : null;
  },

  async getSessionByToken(sessionToken: string): Promise<Session | null> {
    const accountId = store.sessionToAccount.get(sessionToken);
    if (!accountId) return null;

    const account = store.accounts.get(accountId);
    if (!account) return null;

    return toSession(account, sessionToken);
  },

  async createSession(input: CreateSessionInput): Promise<Session> {
    const account = upsertAccount(input);
    const sessionToken = `sess_${randomUUID()}`;
    store.sessionToAccount.set(sessionToken, account.id);
    return toSession(account, sessionToken);
  },

  async clearSession(sessionToken: string): Promise<void> {
    store.sessionToAccount.delete(sessionToken);
  }
};
