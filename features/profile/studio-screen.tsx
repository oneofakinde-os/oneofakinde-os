import { OptimizedImage } from "@/features/media/optimized-image";
import { PatronBadge } from "@/features/patron/patron-badge";
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

type StudioViewerPatronIndicator = {
  recognitionTier: "founding" | "active";
  status: "active" | "lapsed";
  committedAt: string;
};

type StudioScreenProps = {
  session: Session | null;
  studio: Studio;
  worlds: World[];
  drops: Drop[];
  viewerMembershipIndicator?: StudioViewerMembershipIndicator;
  viewerFollowing?: boolean;
  followerCount?: number;
  viewerPatronIndicator?: StudioViewerPatronIndicator | null;
};

function resolveDropPoster(drop: Drop): string | undefined {
  const preview = drop.previewMedia?.watch ?? drop.previewMedia?.photos;
  return preview?.posterSrc ?? preview?.src ?? undefined;
}

function resolveWorldCover(world: World): string | undefined {
  return world.visualIdentity?.coverImageSrc ?? undefined;
}

export function StudioScreen({
  session,
  studio,
  worlds,
  drops,
  viewerMembershipIndicator,
  viewerFollowing = false,
  followerCount = 0,
  viewerPatronIndicator
}: StudioScreenProps) {
  const orderedDrops = sortDropsForStudioSurface(drops);
  const pinnedDrops = orderedDrops.filter((drop) => isStudioPinned(drop));
  const memberWorldIds = new Set(viewerMembershipIndicator?.memberWorldIds ?? []);
  const studioPatronWorldId = worlds[0]?.id ?? null;
  const studioConversationHref = `/api/v1/studios/${encodeURIComponent(studio.handle)}/conversation`;
  const canModerateStudioThread = Boolean(
    session?.roles.includes("creator") && session.handle.toLowerCase() === studio.handle.toLowerCase()
  );

  return (
    <AppShell
      title="studio"
      subtitle={studio.title}
      session={session}
      activeNav="collect"
    >
      {/* ── studio header ── */}
      <section className="slice-panel">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--surface-2, #1a2a3a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text-muted, #8899aa)",
              flexShrink: 0
            }}
          >
            {studio.handle.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 className="slice-title" style={{ margin: 0 }}>{studio.title}</h2>
            <p className="slice-meta" style={{ margin: "0.25rem 0 0" }}>@{studio.handle}</p>
          </div>
        </div>

        <p className="slice-copy">{studio.synopsis}</p>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.75rem", flexWrap: "wrap" }}>
          <span className="slice-meta">{followerCount} follower{followerCount !== 1 ? "s" : ""}</span>
          <span className="slice-meta">{worlds.length} world{worlds.length !== 1 ? "s" : ""}</span>
          <span className="slice-meta">{drops.length} drop{drops.length !== 1 ? "s" : ""}</span>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.75rem", flexWrap: "wrap" }}>
          {session ? (
            <FollowStudioButton
              studioHandle={studio.handle}
              initialFollowing={viewerFollowing}
              initialFollowerCount={followerCount}
            />
          ) : (
            <Link href={routes.signIn(routes.studio(studio.handle))} className="slice-button ghost">
              sign in to follow
            </Link>
          )}
          {viewerPatronIndicator ? (
            <div data-testid="studio-patron-indicator">
              <PatronBadge
                recognitionTier={viewerPatronIndicator.recognitionTier}
                status={viewerPatronIndicator.status}
                committedAt={viewerPatronIndicator.committedAt}
                size="compact"
              />
            </div>
          ) : null}
        </div>

        <p className="slice-meta" data-testid="studio-membership-indicator" style={{ marginTop: "0.5rem" }}>
          membership status ·{" "}
          {!viewerMembershipIndicator?.hasSession
            ? "sign in to check"
            : viewerMembershipIndicator.hasStudioMembership
              ? `active (${viewerMembershipIndicator.activeMembershipCount})`
              : "not active"}
        </p>
        {!viewerPatronIndicator ? (
          <p className="slice-meta" data-testid="studio-patron-indicator">
            patron support ·{" "}
            {viewerMembershipIndicator?.canCommitPatron
              ? "available for collector accounts"
              : "sign in as a collector to enable"}
          </p>
        ) : null}

        {studioPatronWorldId ? (
          <div className="slice-button-row" style={{ marginTop: "0.5rem" }}>
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
      </section>

      {/* ── worlds ── */}
      {worlds.length > 0 ? (
        <section className="slice-panel">
          <p className="slice-label">worlds</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem"
            }}
            aria-label="studio worlds"
          >
            {worlds.map((world) => {
              const coverSrc = resolveWorldCover(world);
              const entryRule = world.entryRule ?? "open";
              const hasMembership =
                memberWorldIds.has(world.id) || Boolean(viewerMembershipIndicator?.hasStudioMembership);

              return (
                <div
                  key={world.id}
                  className="slice-drop-card"
                  style={{ position: "relative", overflow: "hidden", minHeight: 200 }}
                >
                  {coverSrc ? (
                    <div style={{ position: "relative", width: "100%", height: 140, marginBottom: "0.75rem" }}>
                      <OptimizedImage
                        src={coverSrc}
                        alt={`${world.title} cover`}
                        preset="dropPosterCard"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "0.5rem"
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)",
                          borderRadius: "0.5rem"
                        }}
                      />
                      <h3
                        style={{
                          position: "absolute",
                          bottom: "0.5rem",
                          left: "0.75rem",
                          margin: 0,
                          fontWeight: 700,
                          fontSize: "1.1rem"
                        }}
                      >
                        {world.title}
                      </h3>
                    </div>
                  ) : (
                    <h3 className="slice-title">{world.title}</h3>
                  )}

                  <p className="slice-copy">{world.synopsis}</p>

                  <p className="slice-meta" style={{ marginTop: "0.5rem" }}>
                    {entryRule}
                    {entryRule === "membership"
                      ? hasMembership
                        ? " · ✓ membership active"
                        : " · membership required"
                      : ""}
                    {entryRule === "patron" ? " · patron required" : ""}
                  </p>

                  <div className="slice-button-row">
                    <Link href={routes.world(world.id)} className="slice-button ghost">
                      open world
                    </Link>
                    <Link href={routes.worldDrops(world.id)} className="slice-button alt">
                      drops
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── pinned drops ── */}
      {pinnedDrops.length > 0 ? (
        <section className="slice-panel">
          <p className="slice-label">pinned by studio</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "1rem"
            }}
            aria-label="studio pinned drops"
          >
            {pinnedDrops.map((drop) => {
              const posterSrc = resolveDropPoster(drop);
              return (
                <div key={drop.id} className="slice-drop-card">
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    {posterSrc ? (
                      <OptimizedImage
                        src={posterSrc}
                        alt={drop.title}
                        preset="thumbnail"
                        style={{
                          width: 64,
                          height: 64,
                          objectFit: "cover",
                          borderRadius: "0.375rem",
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: "0.375rem",
                          background: "var(--surface-2, #1a2a3a)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          color: "var(--text-muted, #8899aa)",
                          flexShrink: 0
                        }}
                      >
                        pin #{drop.studioPinRank ?? 0}
                      </div>
                    )}
                    <div>
                      <h3 className="slice-title" style={{ margin: 0, fontSize: "1rem" }}>{drop.title}</h3>
                      <p className="slice-meta" style={{ margin: "0.25rem 0 0" }}>{formatUsd(drop.priceUsd)}</p>
                    </div>
                  </div>
                  <p className="slice-copy" style={{ marginTop: "0.5rem" }}>{drop.synopsis}</p>
                  <div className="slice-button-row">
                    <Link href={routes.drop(drop.id)} className="slice-button ghost">open</Link>
                    <Link href={routes.dropWatch(drop.id)} className="slice-button alt">watch</Link>
                    <Link href={routes.collectDrop(drop.id)} className="slice-button">collect</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── all drops ── */}
      <section className="slice-panel">
        <p className="slice-label">all drops · {orderedDrops.length}</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1rem"
          }}
          aria-label="studio drops"
        >
          {orderedDrops.map((drop) => {
            const posterSrc = resolveDropPoster(drop);
            return (
              <div key={drop.id} className="slice-drop-card">
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  {posterSrc ? (
                    <OptimizedImage
                      src={posterSrc}
                      alt={drop.title}
                      preset="thumbnail"
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: "cover",
                        borderRadius: "0.375rem",
                        flexShrink: 0
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "0.375rem",
                        background: "var(--surface-2, #1a2a3a)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        color: "var(--text-muted, #8899aa)",
                        flexShrink: 0,
                        textTransform: "uppercase"
                      }}
                    >
                      {drop.title.substring(0, 2)}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h3 className="slice-title" style={{ margin: 0, fontSize: "1rem" }}>{drop.title}</h3>
                    <p className="slice-meta" style={{ margin: "0.25rem 0 0" }}>
                      {formatUsd(drop.priceUsd)}
                      {drop.worldOrderIndex ? ` · #${drop.worldOrderIndex}` : ""}
                    </p>
                  </div>
                </div>
                <p className="slice-copy" style={{ marginTop: "0.5rem" }}>{drop.synopsis}</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(drop.id)} className="slice-button ghost">open</Link>
                  <Link href={routes.dropWatch(drop.id)} className="slice-button alt">watch</Link>
                  <Link href={routes.collectDrop(drop.id)} className="slice-button">collect</Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── studio thread ── */}
      <section id="studio-thread" data-testid="studio-thread-surface">
        {session ? (
          <a
            href={studioConversationHref}
            className="slice-button ghost"
            data-testid="studio-thread-entry"
            style={{ display: "none" }}
          >
            studio thread entry
          </a>
        ) : (
          <Link
            href={routes.signIn(routes.studio(studio.handle))}
            className="slice-button ghost"
            data-testid="studio-thread-entry"
            style={{ display: "none" }}
          >
            sign in for studio thread
          </Link>
        )}
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
