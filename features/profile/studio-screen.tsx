import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import { FollowStudioButton } from "@/features/studio/follow-studio-button";
import { isStudioPinned, sortDropsForStudioSurface } from "@/lib/catalog/drop-curation";
import type { Drop, Session, Studio, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { StudioThreadPanel } from "./studio-thread-panel";

type StudioViewerMembershipIndicator = {
  hasSession: boolean;
  hasStudioMembership: boolean;
  activeMembershipCount: number;
  memberWorldIds: string[];
  canCommitPatron: boolean;
};

type StudioScreenProps = {
  session: Session | null;
  studio: Studio;
  worlds: World[];
  drops: Drop[];
  viewerMembershipIndicator?: StudioViewerMembershipIndicator;
  viewerFollowing?: boolean;
  followerCount?: number;
};

export function StudioScreen({
  session,
  studio,
  worlds,
  drops,
  viewerMembershipIndicator,
  viewerFollowing = false,
  followerCount = 0
}: StudioScreenProps) {
  const orderedDrops = sortDropsForStudioSurface(drops);
  const pinnedDrops = orderedDrops.filter((drop) => isStudioPinned(drop));
  const memberWorldIds = new Set(viewerMembershipIndicator?.memberWorldIds ?? []);
  const studioPatronWorldId = worlds[0]?.id ?? null;
  const studioConversationHref = `/api/v1/studios/${encodeURIComponent(studio.handle)}/conversation`;
  const canModerateStudioThread = Boolean(
    session?.roles.includes("creator") && session.handle.toLowerCase() === studio.handle.toLowerCase()
  );
  const membershipStatus = !viewerMembershipIndicator?.hasSession
    ? "sign in to check membership"
    : viewerMembershipIndicator.hasStudioMembership
      ? `active (${viewerMembershipIndicator.activeMembershipCount})`
      : "not active";
  const patronStatus = viewerMembershipIndicator?.canCommitPatron
    ? "available for collector accounts"
    : "sign in as a collector to enable";

  return (
    <AppShell
      title="studio"
      subtitle="public studio surface with drops and world context"
      session={session}
      activeNav="townhall"
    >
      <section className="slice-panel">
        <p className="slice-label">@{studio.handle}</p>
        <h2 className="slice-title">{studio.title}</h2>
        <p className="slice-copy">{studio.synopsis}</p>
        {session ? (
          <FollowStudioButton
            studioHandle={studio.handle}
            initialFollowing={viewerFollowing}
            initialFollowerCount={followerCount}
          />
        ) : null}
        <p className="slice-meta" data-testid="studio-membership-indicator">
          membership status · {membershipStatus}
        </p>
        <p className="slice-meta" data-testid="studio-patron-indicator">
          patron support · {patronStatus}
        </p>
        {studioPatronWorldId ? (
          <div className="slice-button-row">
            {session ? (
              <a
                href={`/api/v1/worlds/${encodeURIComponent(studioPatronWorldId)}/patron-roster`}
                className="slice-button ghost"
              >
                patron roster hook
              </a>
            ) : (
              <Link href={routes.signIn(routes.studio(studio.handle))} className="slice-button ghost">
                sign in for patron roster
              </Link>
            )}
          </div>
        ) : null}
        <div className="slice-button-row">
          {session ? (
            <a
              href={studioConversationHref}
              className="slice-button ghost"
              data-testid="studio-thread-entry"
            >
              studio thread entry
            </a>
          ) : (
            <Link
              href={routes.signIn(routes.studio(studio.handle))}
              className="slice-button ghost"
              data-testid="studio-thread-entry"
            >
              sign in for studio thread
            </Link>
          )}
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">worlds</p>
        <ul className="slice-world-grid" aria-label="studio worlds">
          {worlds.map((world) => (
            <li key={world.id} className="slice-world-card">
              <h2 className="slice-title">{world.title}</h2>
              <p className="slice-copy">{world.synopsis}</p>
              <p className="slice-meta">
                entry rule · {world.entryRule ?? "open"}
                {world.entryRule === "membership"
                  ? memberWorldIds.has(world.id) || viewerMembershipIndicator?.hasStudioMembership
                    ? " · membership active"
                    : " · membership required"
                  : ""}
                {world.entryRule === "patron" ? " · patron required" : ""}
              </p>
              <p className="slice-meta">
                default drop visibility · {world.defaultDropVisibility ?? "inherit defaults"}
              </p>
              <div className="slice-button-row">
                <Link href={routes.world(world.id)} className="slice-button ghost">
                  open world
                </Link>
                <Link href={routes.worldDrops(world.id)} className="slice-button alt">
                  open drops
                </Link>
                {session ? (
                  <a
                    href={`/api/v1/worlds/${encodeURIComponent(world.id)}/patron-roster`}
                    className="slice-button"
                  >
                    patron roster
                  </a>
                ) : (
                  <Link href={routes.signIn(routes.studio(studio.handle))} className="slice-button">
                    sign in for patron roster
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {pinnedDrops.length > 0 ? (
        <section className="slice-panel">
          <p className="slice-label">studio pinned</p>
          <ul className="slice-grid" aria-label="studio pinned drops">
            {pinnedDrops.map((drop) => (
              <li key={drop.id} className="slice-drop-card">
                <p className="slice-label">pin #{drop.studioPinRank ?? 0}</p>
                <h2 className="slice-title">{drop.title}</h2>
                <p className="slice-copy">{drop.synopsis}</p>
                <p className="slice-meta">{formatUsd(drop.priceUsd)}</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(drop.id)} className="slice-button ghost">
                    open drop
                  </Link>
                  <Link href={routes.dropWatch(drop.id)} className="slice-button alt">
                    watch
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="slice-panel">
        <p className="slice-label">drops</p>
        <ul className="slice-grid" aria-label="studio drops">
          {orderedDrops.map((drop) => (
            <li key={drop.id} className="slice-drop-card">
              {drop.worldOrderIndex ? <p className="slice-label">world order #{drop.worldOrderIndex}</p> : null}
              <h2 className="slice-title">{drop.title}</h2>
              <p className="slice-copy">{drop.synopsis}</p>
              <p className="slice-meta">{formatUsd(drop.priceUsd)}</p>
              <div className="slice-button-row">
                <Link href={routes.drop(drop.id)} className="slice-button ghost">
                  open drop
                </Link>
                <Link href={routes.dropWatch(drop.id)} className="slice-button alt">
                  watch
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="studio-thread" data-testid="studio-thread-surface">
        <StudioThreadPanel
          studioHandle={studio.handle}
          canInteract={Boolean(session)}
          canModerate={canModerateStudioThread}
          signInHref={routes.signIn(routes.studio(studio.handle))}
          dropContextOptions={orderedDrops.slice(0, 6).map((drop) => ({
            id: drop.id,
            title: drop.title
          }))}
        />
      </section>
    </AppShell>
  );
}
