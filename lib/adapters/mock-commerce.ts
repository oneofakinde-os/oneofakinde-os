import type {
  AccountRole,
  AuthorizedDerivative,
  AuthorizedDerivativeKind,
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
  DropLineageSnapshot,
  DropVersion,
  DropVersionLabel,
  LibraryDrop,
  LibrarySnapshot,
  LiveSession,
  LiveSessionEligibility,
  MembershipEntitlement,
  MyCollectionSnapshot,
  OwnedDrop,
  PatronTierConfig,
  PatronTierStatus,
  PurchaseReceipt,
  Session,
  Studio,
  TownhallModerationCaseResolution,
  TownhallModerationCaseResolveResult,
  TownhallDropSocialSnapshot,
  TownhallModerationQueueItem,
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
const PATRON_TIER_STATUS_SET = new Set<PatronTierStatus>(["active", "disabled"]);

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
        previewMedia: seedPreviewMediaForDrop("stardust")
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
        previewMedia: seedPreviewMediaForDrop("twilight-whispers")
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
        previewMedia: seedPreviewMediaForDrop("voidrunner")
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
        previewMedia: seedPreviewMediaForDrop("through-the-lens")
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
      periodDays: 30,
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
      eligibilityRule: "public"
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
      eligibilityRule: "membership_active"
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
      eligibilityRule: "drop_owner"
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
    endsAt: "2026-03-18T12:00:00.000Z"
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
    periodDays: config.periodDays,
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
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return null;
  }
  if (!Number.isFinite(periodDays) || periodDays <= 0) {
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
    periodDays,
    benefitsSummary: input.benefitsSummary.trim(),
    status: input.status,
    updatedAt: nowIso,
    updatedByHandle: account.handle
  };

  record.title = title;
  record.amountCents = amountCents;
  record.periodDays = periodDays;
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
    whatYouGet: toLiveSessionWhatYouGet(liveSession)
  };
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
    eligibilityRule: input.eligibilityRule
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
  async listDrops(): Promise<Drop[]> {
    return [...store.drops.values()].sort(
      (a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate)
    );
  },

  async listWorlds(): Promise<World[]> {
    return [...store.worlds.values()];
  },

  async getWorldById(worldId: string): Promise<World | null> {
    return store.worlds.get(worldId) ?? null;
  },

  async listDropsByWorldId(worldId: string): Promise<Drop[]> {
    return sortDropsForWorldSurface((await this.listDrops()).filter((drop) => drop.worldId === worldId));
  },

  async getStudioByHandle(handle: string): Promise<Studio | null> {
    return store.studios.get(handle) ?? null;
  },

  async listDropsByStudioHandle(handle: string): Promise<Drop[]> {
    return sortDropsForStudioSurface(
      (await this.listDrops()).filter((drop) => drop.studioHandle === handle)
    );
  },

  async getDropById(dropId: string): Promise<Drop | null> {
    return store.drops.get(dropId) ?? null;
  },

  async getDropLineage(dropId: string): Promise<DropLineageSnapshot | null> {
    if (!store.drops.has(dropId)) {
      return null;
    }

    return buildDropLineageSnapshot(dropId);
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

  async getLibrary(accountId: string): Promise<LibrarySnapshot | null> {
    const account = store.accounts.get(accountId);
    if (!account) return null;

    return {
      account: {
        accountId: account.id,
        handle: account.handle,
        displayName: account.displayName
      },
      savedDrops: getSavedDrops(accountId)
    };
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
