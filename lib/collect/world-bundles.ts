import type {
  Drop,
  MembershipEntitlement,
  World,
  WorldCollectBundle,
  WorldCollectBundleOption,
  WorldCollectBundleType,
  WorldCollectOwnership,
  WorldCollectOwnershipScope,
  WorldCollectUpgradeEligibilityReason,
  WorldCollectUpgradePreview
} from "@/lib/domain/contracts";

const DAY_MS = 24 * 60 * 60 * 1000;
const WORLD_COLLECT_PRIORITY: Record<WorldCollectBundleType, number> = {
  current_only: 1,
  season_pass_window: 2,
  full_world: 3
};

const WORLD_COLLECT_PRORATION_STRATEGY = "placeholder_linear_proration_v1" as const;

function sortByReleaseDesc(a: Drop, b: Drop): number {
  const releaseDelta = Date.parse(b.releaseDate) - Date.parse(a.releaseDate);
  if (releaseDelta !== 0) {
    return releaseDelta;
  }

  return a.id.localeCompare(b.id);
}

function clampCurrency(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(Math.max(0, value).toFixed(2));
}

function normalizeBundles(raw: WorldCollectBundle[] | undefined): WorldCollectBundle[] {
  if (!raw || raw.length === 0) {
    return [];
  }

  const byType = new Map<WorldCollectBundleType, WorldCollectBundle>();
  for (const bundle of raw) {
    if (!bundle || typeof bundle !== "object") {
      continue;
    }
    byType.set(bundle.bundleType, {
      bundleType: bundle.bundleType,
      title: bundle.title,
      synopsis: bundle.synopsis,
      priceUsd: clampCurrency(bundle.priceUsd),
      currency: "USD",
      eligibilityRule: bundle.eligibilityRule,
      seasonWindowDays:
        typeof bundle.seasonWindowDays === "number" && Number.isFinite(bundle.seasonWindowDays)
          ? Math.max(1, Math.trunc(bundle.seasonWindowDays))
          : null
    });
  }

  return Array.from(byType.values()).sort(
    (a, b) => WORLD_COLLECT_PRIORITY[a.bundleType] - WORLD_COLLECT_PRIORITY[b.bundleType]
  );
}

export function defaultWorldCollectBundles(world: World, drops: Drop[]): WorldCollectBundle[] {
  const orderedDrops = [...drops].sort(sortByReleaseDesc);
  const newestDropPrice = clampCurrency(orderedDrops[0]?.priceUsd ?? 1.99);
  const averageDropPrice =
    orderedDrops.length > 0
      ? clampCurrency(
          orderedDrops.reduce((sum, drop) => sum + clampCurrency(drop.priceUsd), 0) / orderedDrops.length
        )
      : newestDropPrice;

  return [
    {
      bundleType: "current_only",
      title: `${world.title} current drop`,
      synopsis: "access to the latest chapter currently live in this world.",
      priceUsd: newestDropPrice,
      currency: "USD",
      eligibilityRule: "public",
      seasonWindowDays: 14
    },
    {
      bundleType: "season_pass_window",
      title: `${world.title} season pass`,
      synopsis: "rolling access to this season window with upcoming drops included.",
      priceUsd: clampCurrency(Math.max(newestDropPrice * 2.1, averageDropPrice * 2.4)),
      currency: "USD",
      eligibilityRule: "membership_active",
      seasonWindowDays: 90
    },
    {
      bundleType: "full_world",
      title: `${world.title} full world`,
      synopsis: "permanent access to the full world catalog and future canonical updates.",
      priceUsd: clampCurrency(Math.max(newestDropPrice * 3.6, averageDropPrice * 4.1)),
      currency: "USD",
      eligibilityRule: "public",
      seasonWindowDays: null
    }
  ];
}

export function resolveWorldCollectBundles(world: World, drops: Drop[]): WorldCollectBundle[] {
  const explicit = normalizeBundles(world.collectBundles);
  if (explicit.length > 0) {
    return explicit;
  }
  return defaultWorldCollectBundles(world, drops);
}

export function getActiveWorldCollectOwnership(
  ownerships: WorldCollectOwnership[],
  accountId: string,
  worldId: string
): WorldCollectOwnership | null {
  const candidates = ownerships
    .filter(
      (ownership) =>
        ownership.accountId === accountId &&
        ownership.worldId === worldId &&
        ownership.status === "active"
    )
    .sort((a, b) => Date.parse(b.purchasedAt) - Date.parse(a.purchasedAt));

  return candidates[0] ?? null;
}

function isMembershipActiveForWorld(
  memberships: MembershipEntitlement[],
  world: World
): boolean {
  return memberships.some((membership) => {
    if (!membership.isActive) {
      return false;
    }

    if (membership.studioHandle !== world.studioHandle) {
      return false;
    }

    return membership.worldId === null || membership.worldId === world.id;
  });
}

function resolveUpgradeEligibilityReason(input: {
  targetBundle: WorldCollectBundle;
  activeOwnership: WorldCollectOwnership | null;
  membershipActive: boolean;
}): WorldCollectUpgradeEligibilityReason {
  const { targetBundle, activeOwnership, membershipActive } = input;

  if (targetBundle.eligibilityRule === "membership_active" && !membershipActive) {
    return "membership_required";
  }

  if (!activeOwnership) {
    return "eligible";
  }

  if (activeOwnership.bundleType === targetBundle.bundleType) {
    return "already_owned_target";
  }

  if (activeOwnership.bundleType === "full_world") {
    return "already_owned_full_world";
  }

  const currentPriority = WORLD_COLLECT_PRIORITY[activeOwnership.bundleType];
  const targetPriority = WORLD_COLLECT_PRIORITY[targetBundle.bundleType];
  if (targetPriority <= currentPriority) {
    return "invalid_upgrade_path";
  }

  return "eligible";
}

export function buildWorldCollectUpgradePreview(input: {
  world: World;
  targetBundle: WorldCollectBundle;
  activeOwnership: WorldCollectOwnership | null;
  memberships: MembershipEntitlement[];
}): WorldCollectUpgradePreview {
  const membershipActive = isMembershipActiveForWorld(input.memberships, input.world);
  const eligibilityReason = resolveUpgradeEligibilityReason({
    targetBundle: input.targetBundle,
    activeOwnership: input.activeOwnership,
    membershipActive
  });
  const eligible = eligibilityReason === "eligible";

  const rawCredit =
    input.activeOwnership && input.activeOwnership.status === "active"
      ? clampCurrency(input.activeOwnership.amountPaidUsd)
      : 0;
  const cappedCredit = clampCurrency(Math.min(rawCredit, input.targetBundle.priceUsd));
  const subtotalUsd = clampCurrency(input.targetBundle.priceUsd);
  const totalUsd = clampCurrency(eligible ? subtotalUsd - cappedCredit : subtotalUsd);
  const prorationRatio =
    subtotalUsd > 0 ? Number((cappedCredit / subtotalUsd).toFixed(4)) : 0;

  return {
    worldId: input.world.id,
    targetBundleType: input.targetBundle.bundleType,
    currentBundleType: input.activeOwnership?.bundleType ?? null,
    eligible,
    eligibilityReason,
    previousOwnershipCreditUsd: cappedCredit,
    prorationStrategy: WORLD_COLLECT_PRORATION_STRATEGY,
    prorationRatio,
    subtotalUsd,
    totalUsd,
    currency: "USD"
  };
}

export function buildWorldCollectBundleOptions(input: {
  world: World;
  drops: Drop[];
  activeOwnership: WorldCollectOwnership | null;
  memberships: MembershipEntitlement[];
}): WorldCollectBundleOption[] {
  const bundles = resolveWorldCollectBundles(input.world, input.drops);
  const orderedDrops = [...input.drops].sort(sortByReleaseDesc);

  function buildOwnershipScope(bundle: WorldCollectBundle): WorldCollectOwnershipScope {
    if (orderedDrops.length === 0) {
      if (bundle.bundleType === "current_only") {
        return {
          includedDropIds: [],
          includedDropCount: 0,
          includesFutureCanonicalDrops: false,
          coverageLabel: "latest drop only (0 drops currently live)"
        };
      }

      if (bundle.bundleType === "season_pass_window") {
        return {
          includedDropIds: [],
          includedDropCount: 0,
          includesFutureCanonicalDrops: true,
          coverageLabel: "season window (0 drops currently live)"
        };
      }

      return {
        includedDropIds: [],
        includedDropCount: 0,
        includesFutureCanonicalDrops: true,
        coverageLabel: "full world catalog (0 drops currently live)"
      };
    }

    if (bundle.bundleType === "current_only") {
      const includedDropIds = [orderedDrops[0]?.id].filter((value): value is string => Boolean(value));
      return {
        includedDropIds,
        includedDropCount: includedDropIds.length,
        includesFutureCanonicalDrops: false,
        coverageLabel: `latest drop only (${includedDropIds.length} drop${includedDropIds.length === 1 ? "" : "s"})`
      };
    }

    if (bundle.bundleType === "season_pass_window") {
      const anchorReleaseMs = Date.parse(orderedDrops[0]?.releaseDate ?? "");
      const windowDays = bundle.seasonWindowDays ?? 90;
      const includedDrops = Number.isFinite(anchorReleaseMs)
        ? orderedDrops.filter((drop) => {
            const releaseMs = Date.parse(drop.releaseDate);
            if (!Number.isFinite(releaseMs)) {
              return false;
            }
            return anchorReleaseMs - releaseMs <= windowDays * DAY_MS;
          })
        : [orderedDrops[0]];
      const stableIncludedDrops = includedDrops.length > 0 ? includedDrops : [orderedDrops[0]];
      const includedDropIds = stableIncludedDrops
        .map((drop) => drop?.id)
        .filter((value): value is string => Boolean(value));
      return {
        includedDropIds,
        includedDropCount: includedDropIds.length,
        includesFutureCanonicalDrops: true,
        coverageLabel: `season window (${includedDropIds.length} drops · ${windowDays} days)`
      };
    }

    const includedDropIds = orderedDrops.map((drop) => drop.id);
    return {
      includedDropIds,
      includedDropCount: includedDropIds.length,
      includesFutureCanonicalDrops: true,
      coverageLabel: `full world catalog (${includedDropIds.length} drops) + future canonical drops`
    };
  }

  return bundles.map((bundle) => ({
    bundle,
    upgradePreview: buildWorldCollectUpgradePreview({
      world: input.world,
      targetBundle: bundle,
      activeOwnership: input.activeOwnership,
      memberships: input.memberships
    }),
    ownershipScope: buildOwnershipScope(bundle)
  }));
}
