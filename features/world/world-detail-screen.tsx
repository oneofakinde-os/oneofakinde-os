import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import { sortDropsForWorldSurface } from "@/lib/catalog/drop-curation";
import type {
  Drop,
  Session,
  World,
  WorldCollectBundleSnapshot,
  WorldCollectUpgradePreview
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type WorldDetailScreenProps = {
  world: World;
  drops: Drop[];
  session: Session | null;
  worldCollectSnapshot: WorldCollectBundleSnapshot | null;
  worldCollectFullWorldUpgradePreview: WorldCollectUpgradePreview | null;
};

const ENTRY_RULE_COPY: Record<NonNullable<World["entryRule"]>, string> = {
  open: "open entry",
  membership: "membership required",
  patron: "patron support required"
};

const DEFAULT_DROP_VISIBILITY_COPY: Record<NonNullable<World["defaultDropVisibility"]>, string> = {
  public: "public",
  world_members: "world members",
  collectors_only: "collectors only"
};

export function WorldDetailScreen({
  world,
  drops,
  session,
  worldCollectSnapshot,
  worldCollectFullWorldUpgradePreview
}: WorldDetailScreenProps) {
  const orderedDrops = sortDropsForWorldSurface(drops);
  const dropTitleById = new Map(drops.map((drop) => [drop.id, drop.title]));
  const entryRuleLabel = world.entryRule ? ENTRY_RULE_COPY[world.entryRule] : "not configured";
  const memberGatingState =
    world.entryRule === "membership"
      ? "membership gate active"
      : world.entryRule === "patron"
        ? "patron gate active"
        : "open access";
  const defaultDropVisibilityLabel = world.defaultDropVisibility
    ? DEFAULT_DROP_VISIBILITY_COPY[world.defaultDropVisibility]
    : "inherit from world release defaults";
  const worldConversationHref = `/api/v1/worlds/${encodeURIComponent(world.id)}/conversation`;
  const patronRosterHref = `/api/v1/worlds/${encodeURIComponent(world.id)}/patron-roster`;
  const worldCollectBundlesHref = `/api/v1/collect/worlds/${encodeURIComponent(world.id)}/bundles`;
  const worldCollectUpgradePreviewHref = (bundleType: string) =>
    `/api/v1/collect/worlds/${encodeURIComponent(world.id)}/upgrade-preview?target_bundle_type=${encodeURIComponent(bundleType)}`;
  const worldIdentityStyle = world.visualIdentity
    ? {
        backgroundColor: world.visualIdentity.colorPrimary,
        backgroundImage: world.visualIdentity.coverImageSrc
          ? `linear-gradient(140deg, ${world.visualIdentity.colorPrimary}, ${world.visualIdentity.colorSecondary ?? world.visualIdentity.colorPrimary}), url(${world.visualIdentity.coverImageSrc})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: "0.75rem",
        padding: "1rem",
        border: "1px solid rgba(255,255,255,0.12)"
      }
    : undefined;

  return (
    <AppShell
      title="world"
      subtitle="world detail with related drops and studio linkage"
      session={session}
      activeNav="worlds"
    >
      <section className="slice-panel">
        <p className="slice-label">studio @{world.studioHandle}</p>
        <h2 className="slice-title">{world.title}</h2>
        <p className="slice-copy">{world.synopsis}</p>
        <div className="slice-button-row">
          <Link href={routes.worldDrops(world.id)} className="slice-button">
            open drops
          </Link>
          <Link href={routes.studio(world.studioHandle)} className="slice-button alt">
            open studio
          </Link>
        </div>
        {world.visualIdentity ? (
          <div
            className="slice-panel"
            style={worldIdentityStyle}
            data-testid="world-visual-identity"
            aria-label="world visual identity"
          >
            <p className="slice-label">visual identity</p>
            <p className="slice-copy">
              primary {world.visualIdentity.colorPrimary}
              {world.visualIdentity.colorSecondary ? ` · secondary ${world.visualIdentity.colorSecondary}` : ""}
            </p>
            {world.visualIdentity.motionTreatment ? (
              <p className="slice-meta">motion treatment · {world.visualIdentity.motionTreatment}</p>
            ) : null}
          </div>
        ) : (
          <p className="slice-meta">visual identity not configured for this world yet.</p>
        )}
      </section>

      <section className="slice-panel" data-testid="world-access-contract">
        <p className="slice-label">world constitution</p>
        <p className="slice-copy">{world.lore ?? "lore has not been published yet."}</p>
        <p className="slice-meta">entry rule state · {entryRuleLabel}</p>
        <p className="slice-meta">member gating · {memberGatingState}</p>
        <p className="slice-meta">default drop visibility · {defaultDropVisibilityLabel}</p>
        {world.ambientAudioSrc ? (
          <p className="slice-meta">ambient audio rail configured</p>
        ) : (
          <p className="slice-meta">ambient audio rail not configured</p>
        )}
        <div className="slice-button-row">
          {session ? (
            <a
              href={worldConversationHref}
              className="slice-button ghost"
              data-testid="world-conversation-entry"
            >
              world conversation
            </a>
          ) : (
            <Link
              href={routes.signIn(routes.world(world.id))}
              className="slice-button ghost"
              data-testid="world-conversation-entry"
            >
              sign in for conversation
            </Link>
          )}
          {session ? (
            <a
              href={patronRosterHref}
              className="slice-button alt"
              data-testid="world-patron-roster-hook"
            >
              patron roster
            </a>
          ) : (
            <Link
              href={routes.signIn(routes.world(world.id))}
              className="slice-button alt"
              data-testid="world-patron-roster-hook"
            >
              sign in for patron roster
            </Link>
          )}
        </div>
        <p className="slice-meta">
          conversation and patron roster rails require world membership or collect entitlement.
        </p>
      </section>

      <section className="slice-panel" data-testid="world-collect-contract">
        <p className="slice-label">world collect ownership rails</p>
        <p className="slice-copy">
          bundle scope + upgrade credit are explicit so collectors can see included ownership before collecting.
        </p>
        {!session ? (
          <>
            <p className="slice-meta">sign in to view personalized bundle eligibility and upgrade credit.</p>
            <div className="slice-button-row">
              <Link href={routes.signIn(routes.world(world.id))} className="slice-button">
                sign in for world collect
              </Link>
            </div>
          </>
        ) : !worldCollectSnapshot ? (
          <>
            <p className="slice-meta">world collect bundles are unavailable for this session.</p>
            <div className="slice-button-row">
              <a href={worldCollectBundlesHref} className="slice-button ghost">
                open bundle contract
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="slice-meta">
              active ownership:{" "}
              {worldCollectSnapshot.activeOwnership
                ? `${worldCollectSnapshot.activeOwnership.bundleType.replaceAll("_", " ")} · paid ${formatUsd(worldCollectSnapshot.activeOwnership.amountPaidUsd)}`
                : "none"}
            </p>
            {worldCollectFullWorldUpgradePreview ? (
              <p className="slice-meta">
                full-world upgrade:{" "}
                {worldCollectFullWorldUpgradePreview.eligible
                  ? `eligible · credit ${formatUsd(worldCollectFullWorldUpgradePreview.previousOwnershipCreditUsd)} · total ${formatUsd(worldCollectFullWorldUpgradePreview.totalUsd)}`
                  : `not eligible (${worldCollectFullWorldUpgradePreview.eligibilityReason.replaceAll("_", " ")})`}
              </p>
            ) : null}
            <ul className="slice-grid" aria-label="world collect bundle options">
              {worldCollectSnapshot.bundles.map((entry) => {
                const includedDropTitles = entry.ownershipScope.includedDropIds
                  .map((dropId) => dropTitleById.get(dropId) ?? dropId)
                  .join(", ");
                return (
                  <li key={entry.bundle.bundleType} className="slice-drop-card">
                    <p className="slice-label">{entry.bundle.bundleType.replaceAll("_", " ")}</p>
                    <h2 className="slice-title">{entry.bundle.title}</h2>
                    <p className="slice-copy">{entry.bundle.synopsis}</p>
                    <p className="slice-meta">
                      {formatUsd(entry.bundle.priceUsd)} · {entry.ownershipScope.coverageLabel}
                    </p>
                    <p className="slice-meta">
                      included drops: {includedDropTitles || "none currently published"}
                    </p>
                    <p className="slice-meta">
                      upgrade state:{" "}
                      {entry.upgradePreview.eligible
                        ? `eligible · credit ${formatUsd(entry.upgradePreview.previousOwnershipCreditUsd)} · total ${formatUsd(entry.upgradePreview.totalUsd)}`
                        : `blocked (${entry.upgradePreview.eligibilityReason.replaceAll("_", " ")})`}
                    </p>
                    <div className="slice-button-row">
                      <a
                        href={worldCollectUpgradePreviewHref(entry.bundle.bundleType)}
                        className="slice-button ghost"
                      >
                        upgrade preview
                      </a>
                      <a href={worldCollectBundlesHref} className="slice-button alt">
                        bundle contract
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="slice-panel">
        <p className="slice-label">recent drops</p>
        {drops.length === 0 ? (
          <p className="slice-copy">no drops published in this world yet.</p>
        ) : (
          <ul className="slice-grid" aria-label="world drop highlights">
            {orderedDrops.slice(0, 6).map((drop) => (
              <li key={drop.id} className="slice-drop-card">
                {drop.worldOrderIndex ? (
                  <p className="slice-label">world order #{drop.worldOrderIndex}</p>
                ) : null}
                <h2 className="slice-title">{drop.title}</h2>
                <p className="slice-copy">{drop.synopsis}</p>
                <p className="slice-meta">{formatUsd(drop.priceUsd)}</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(drop.id)} className="slice-button ghost">
                    open drop
                  </Link>
                  <Link href={routes.dropPreview(drop.id)} className="slice-button alt">
                    preview
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
