import { OptimizedImage } from "@/features/media/optimized-image";
import { formatUsd } from "@/features/shared/format";
import { resolveDropPoster } from "@/features/shared/resolve-poster";
import { AppShell } from "@/features/shell/app-shell";
import type { Drop, Session, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type FollowingFeedScreenProps = {
  session: Session;
  followedHandles: string[];
  drops: Drop[];
  worlds: World[];
};

/** Build a timeline of recent activity from followed studios. */
function buildFeedTimeline(
  drops: Drop[],
  followedHandles: Set<string>
): { followedDrops: Drop[]; discoveryDrops: Drop[] } {
  const followedDrops = drops
    .filter((d) => followedHandles.has(d.studioHandle.toLowerCase()))
    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

  const discoveryDrops = drops
    .filter((d) => !followedHandles.has(d.studioHandle.toLowerCase()))
    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
    .slice(0, 4);

  return { followedDrops, discoveryDrops };
}

export function FollowingFeedScreen({
  session,
  followedHandles,
  drops,
  worlds
}: FollowingFeedScreenProps) {
  const followedSet = new Set(followedHandles.map((h) => h.toLowerCase()));
  const { followedDrops, discoveryDrops } = buildFeedTimeline(drops, followedSet);
  const followedWorlds = worlds.filter((w) => followedSet.has(w.studioHandle.toLowerCase()));

  return (
    <AppShell
      title="following"
      subtitle={`updates from ${followedHandles.length} studio${followedHandles.length !== 1 ? "s" : ""} you follow`}
      session={session}
      activeNav="library"
    >
      {/* ── followed studios overview ── */}
      <section className="slice-panel">
        <p className="slice-label">studios you follow</p>
        {followedHandles.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              alignItems: "center"
            }}
            aria-label="followed studios"
          >
            {followedHandles.map((handle) => (
              <Link
                key={handle}
                href={routes.studio(handle)}
                className="following-studio-chip"
              >
                <span
                  className="following-studio-avatar"
                  aria-hidden
                >
                  {handle.charAt(0).toUpperCase()}
                </span>
                <span>@{handle}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="following-empty-state">
            <p className="slice-copy">
              you&apos;re not following any studios yet. explore the showroom and follow creators whose work you love.
            </p>
            <div className="slice-button-row">
              <Link href={routes.showroom()} className="slice-button ghost">
                explore showroom
              </Link>
              <Link href={routes.worlds()} className="slice-button alt">
                browse worlds
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ── recent drops from followed studios ── */}
      {followedDrops.length > 0 ? (
        <section className="slice-panel">
          <p className="slice-label">recent drops from your studios</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1rem"
            }}
            aria-label="followed studio drops"
          >
            {followedDrops.map((drop) => {
              const posterSrc = resolveDropPoster(drop);
              return (
                <div key={drop.id} className="slice-drop-card" style={{ position: "relative", overflow: "hidden" }}>
                  {posterSrc ? (
                    <div style={{ position: "relative", width: "100%", height: 150, marginBottom: "0.75rem" }}>
                      <OptimizedImage
                        src={posterSrc}
                        alt={drop.title}
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
                          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)",
                          borderRadius: "0.5rem"
                        }}
                      />
                      <div style={{ position: "absolute", bottom: "0.5rem", left: "0.75rem", right: "0.75rem" }}>
                        <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1.05rem" }}>{drop.title}</h3>
                        <p className="slice-meta" style={{ margin: "0.125rem 0 0", opacity: 0.85 }}>
                          {formatUsd(drop.priceUsd)} · @{drop.studioHandle}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="slice-title">{drop.title}</h3>
                      <p className="slice-meta">{formatUsd(drop.priceUsd)} · @{drop.studioHandle}</p>
                    </>
                  )}
                  <p className="slice-copy">{drop.synopsis}</p>
                  <p className="slice-meta" style={{ marginTop: "0.25rem" }}>
                    {drop.worldLabel} · {new Date(drop.releaseDate).toLocaleDateString()}
                  </p>
                  <div className="slice-button-row">
                    <Link href={routes.drop(drop.id)} className="slice-button ghost">open</Link>
                    <Link href={routes.collectDrop(drop.id)} className="slice-button">collect</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : followedHandles.length > 0 ? (
        <section className="slice-panel">
          <p className="slice-label">recent drops</p>
          <p className="slice-copy">no recent drops from studios you follow. check back soon!</p>
        </section>
      ) : null}

      {/* ── worlds from followed studios ── */}
      {followedWorlds.length > 0 ? (
        <section className="slice-panel">
          <p className="slice-label">worlds from followed studios</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "0.75rem"
            }}
            aria-label="followed studio worlds"
          >
            {followedWorlds.map((world) => (
              <div key={world.id} className="slice-drop-card">
                <h3 className="slice-title" style={{ margin: 0 }}>{world.title}</h3>
                <p className="slice-meta" style={{ margin: "0.25rem 0" }}>@{world.studioHandle}</p>
                <p className="slice-copy">{world.synopsis}</p>
                <div className="slice-button-row">
                  <Link href={routes.world(world.id)} className="slice-button ghost">enter world</Link>
                  <Link href={routes.worldDrops(world.id)} className="slice-button alt">drops</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── discover new studios ── */}
      {discoveryDrops.length > 0 ? (
        <section className="slice-panel">
          <div className="slice-row">
            <p className="slice-label">discover new studios</p>
            <Link href={routes.explore()} className="slice-button ghost">explore all</Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "0.75rem"
            }}
            aria-label="discovery drops"
          >
            {discoveryDrops.map((drop) => {
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
                          flexShrink: 0
                        }}
                      >
                        {drop.title.substring(0, 2)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <h3 className="slice-title" style={{ margin: 0, fontSize: "0.95rem" }}>{drop.title}</h3>
                      <p className="slice-meta" style={{ margin: "0.125rem 0 0" }}>
                        {formatUsd(drop.priceUsd)} · @{drop.studioHandle}
                      </p>
                    </div>
                  </div>
                  <div className="slice-button-row" style={{ marginTop: "0.5rem" }}>
                    <Link href={routes.drop(drop.id)} className="slice-button ghost">open</Link>
                    <Link href={routes.studio(drop.studioHandle)} className="slice-button alt">studio</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
