import { PatronBadge } from "@/features/patron/patron-badge";
import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import { WorldMembershipButton } from "@/features/world/world-membership-button";
import { sortDropsForWorldSurface } from "@/lib/catalog/drop-curation";
import type {
  CollectLiveSessionSnapshot,
  Drop,
  PatronStatus,
  Session,
  World,
  WorldPatronRosterSnapshot,
  WorldCollectBundleSnapshot,
  WorldCollectUpgradePreview
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type WorldDetailScreenProps = {
  world: World;
  drops: Drop[];
  session: Session | null;
  isMember: boolean;
  worldCollectSnapshot: WorldCollectBundleSnapshot | null;
  worldCollectFullWorldUpgradePreview: WorldCollectUpgradePreview | null;
  worldPatronRosterSnapshot: WorldPatronRosterSnapshot | null;
  worldPatronRosterAccessState: "signed_out" | "eligible" | "forbidden" | "not_found";
  worldLiveSessions: CollectLiveSessionSnapshot[];
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

const PATRON_STATUS_COPY: Record<PatronStatus, string> = {
  active: "active",
  lapsed: "lapsed"
};

const PATRON_RECOGNITION_COPY: Record<"founding" | "active", string> = {
  founding: "founding patron",
  active: "patron"
};

const LIVE_ELIGIBILITY_REASON_COPY: Record<
  CollectLiveSessionSnapshot["eligibility"]["reason"],
  string
> = {
  eligible_public: "public access",
  eligible_membership_active: "membership verified",
  eligible_drop_owner: "drop ownership verified",
  session_required: "session required",
  membership_required: "membership or world collect required",
  patron_required: "active patron or world collect required",
  ownership_required: "drop ownership required"
};

function formatLiveTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return `${new Date(parsed).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function WorldDetailScreen({
  world,
  drops,
  session,
  isMember,
  worldCollectSnapshot,
  worldCollectFullWorldUpgradePreview,
  worldPatronRosterSnapshot,
  worldPatronRosterAccessState,
  worldLiveSessions
}: WorldDetailScreenProps) {
  const orderedDrops = sortDropsForWorldSurface(drops);
  const dropTitleById = new Map(drops.map((drop) => [drop.id, drop.title]));
  const worldOpeningSessions = worldLiveSessions.filter(
    (entry) => entry.liveSession.type === "opening"
  );
  const eligibleOpeningSessions = worldOpeningSessions.filter(
    (entry) => entry.eligibility.eligible
  ).length;
  const nowMs = Date.now();
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
  const worldLiveSessionsHref = `/api/v1/collect/live-sessions?world_id=${encodeURIComponent(world.id)}`;
  const worldLiveSessionEligibilityHref = (sessionId: string) =>
    `/api/v1/collect/live-sessions/${encodeURIComponent(sessionId)}/eligibility`;
  const worldLiveSessionJoinHref = (sessionId: string) =>
    `/api/v1/live-sessions/${encodeURIComponent(sessionId)}/join`;
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
          {session ? (
            <WorldMembershipButton worldId={world.id} initialIsMember={isMember} />
          ) : null}
          {session ? (
            <Link href={routes.worldMembership(world.id)} className="slice-button ghost">
              membership &amp; tiers
            </Link>
          ) : null}
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
            <Link
              href={routes.worldConversation(world.id)}
              className="slice-button ghost"
              data-testid="world-conversation-entry"
            >
              world conversation
            </Link>
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

      <section className="slice-panel" data-testid="world-patron-roster-panel">
        <p className="slice-label">world patron roster</p>
        <p className="slice-copy">
          active patron presence is visible with recognition + status context for eligible world viewers.
        </p>
        {worldPatronRosterAccessState === "signed_out" ? (
          <>
            <p className="slice-meta">sign in to view world patron roster recognition.</p>
            <div className="slice-button-row">
              <Link href={routes.signIn(routes.world(world.id))} className="slice-button">
                sign in for patron roster
              </Link>
            </div>
          </>
        ) : worldPatronRosterAccessState === "forbidden" ? (
          <>
            <p className="slice-meta">
              patron roster visibility requires membership, collect entitlement, creator access, or active patron support.
            </p>
            <div className="slice-button-row">
              <a href={patronRosterHref} className="slice-button ghost">
                open roster contract
              </a>
            </div>
          </>
        ) : !worldPatronRosterSnapshot ? (
          <>
            <p className="slice-meta">patron roster is unavailable for this world.</p>
            <div className="slice-button-row">
              <a href={patronRosterHref} className="slice-button ghost">
                open roster contract
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="slice-meta">
              total patrons: {worldPatronRosterSnapshot.totals.totalCount} · active{" "}
              {worldPatronRosterSnapshot.totals.activeCount} · lapsed{" "}
              {worldPatronRosterSnapshot.totals.lapsedCount}
            </p>
            <p className="slice-meta">
              viewer access: membership{" "}
              {worldPatronRosterSnapshot.viewerAccess.hasMembershipEntitlement ? "yes" : "no"} ·
              collect {worldPatronRosterSnapshot.viewerAccess.hasCollectEntitlement ? "yes" : "no"}
              · patron{" "}
              {worldPatronRosterSnapshot.viewerAccess.hasPatronCommitment ? "yes" : "no"} ·
              creator {worldPatronRosterSnapshot.viewerAccess.hasCreatorAccess ? "yes" : "no"}
            </p>
            {worldPatronRosterSnapshot.patrons.length === 0 ? (
              <p className="slice-meta">
                no active patrons are currently visible for this world.
              </p>
            ) : (
              <ul className="slice-grid" aria-label="world patron roster entries">
                {worldPatronRosterSnapshot.patrons.map((entry) => (
                  <li
                    key={`${entry.handle}-${entry.committedAt}`}
                    className="slice-drop-card"
                    data-testid="world-patron-roster-entry"
                  >
                    <PatronBadge
                      recognitionTier={entry.recognitionTier}
                      status={entry.status}
                      handle={entry.handle}
                      committedAt={entry.committedAt}
                    />
                  </li>
                ))}
              </ul>
            )}
            <div className="slice-button-row">
              <a href={patronRosterHref} className="slice-button ghost">
                open roster contract
              </a>
            </div>
          </>
        )}
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

      <section className="slice-panel" data-testid="world-live-openings-panel">
        <p className="slice-label">world live openings</p>
        <p className="slice-copy">
          opening sessions expose eligibility and join readiness before collectors attempt session
          entry.
        </p>
        {!session ? (
          <>
            <p className="slice-meta">sign in to view personalized world opening eligibility.</p>
            <div className="slice-button-row">
              <Link href={routes.signIn(routes.world(world.id))} className="slice-button">
                sign in for live openings
              </Link>
              <a href={worldLiveSessionsHref} className="slice-button ghost">
                opening contract
              </a>
            </div>
          </>
        ) : worldOpeningSessions.length === 0 ? (
          <>
            <p className="slice-meta">
              no opening sessions are currently scheduled for this world.
            </p>
            <p className="slice-meta">world live sessions discovered: {worldLiveSessions.length}</p>
            <div className="slice-button-row">
              <a href={worldLiveSessionsHref} className="slice-button ghost">
                opening contract
              </a>
              <Link href={routes.liveHub()} className="slice-button alt">
                open live hub
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="slice-meta">
              openings: {worldOpeningSessions.length} · eligible now/soon:{" "}
              {eligibleOpeningSessions} · ineligible:{" "}
              {Math.max(0, worldOpeningSessions.length - eligibleOpeningSessions)}
            </p>
            <ul className="slice-grid" aria-label="world live opening sessions">
              {worldOpeningSessions.map((entry) => {
                const live = entry.liveSession;
                const startsAtMs = Date.parse(live.startsAt);
                const endsAtMs = live.endsAt ? Date.parse(live.endsAt) : Number.NaN;
                const isScheduled = Number.isFinite(startsAtMs) && nowMs < startsAtMs;
                const isClosed = Number.isFinite(endsAtMs) && nowMs > endsAtMs;
                const isActiveNow =
                  Number.isFinite(startsAtMs) &&
                  nowMs >= startsAtMs &&
                  (!Number.isFinite(endsAtMs) || nowMs <= endsAtMs);
                const joinState = !entry.eligibility.eligible
                  ? `blocked · ${LIVE_ELIGIBILITY_REASON_COPY[entry.eligibility.reason]}`
                  : isActiveNow
                    ? "eligible now"
                    : isScheduled
                      ? "scheduled · not active yet"
                      : isClosed
                        ? "closed"
                        : "availability pending";
                return (
                  <li
                    key={live.id}
                    className="slice-drop-card"
                    data-testid="world-live-opening-entry"
                  >
                    <p className="slice-label">{live.type ?? "event"}</p>
                    <h2 className="slice-title">{live.title}</h2>
                    <p className="slice-copy">{live.synopsis}</p>
                    <p className="slice-meta">starts {formatLiveTimestamp(live.startsAt)}</p>
                    {live.endsAt ? (
                      <p className="slice-meta">ends {formatLiveTimestamp(live.endsAt)}</p>
                    ) : null}
                    <p className="slice-meta">
                      eligibility: {LIVE_ELIGIBILITY_REASON_COPY[entry.eligibility.reason]}
                    </p>
                    <p className="slice-meta">join state: {joinState}</p>
                    <div className="slice-button-row">
                      {entry.eligibility.eligible ? (
                        <a href={worldLiveSessionJoinHref(live.id)} className="slice-button">
                          join contract
                        </a>
                      ) : null}
                      <a
                        href={worldLiveSessionEligibilityHref(live.id)}
                        className="slice-button ghost"
                      >
                        eligibility contract
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="slice-button-row">
              <a href={worldLiveSessionsHref} className="slice-button ghost">
                opening contract
              </a>
              <Link href={routes.liveHub()} className="slice-button alt">
                open live hub
              </Link>
            </div>
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
