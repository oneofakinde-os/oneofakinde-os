import { OptimizedImage } from "@/features/media/optimized-image";
import { formatUsd } from "@/features/shared/format";
import { resolveDropPoster, resolveWorldCover } from "@/features/shared/resolve-poster";
import { AppShell } from "@/features/shell/app-shell";
import type { Drop, Session, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type ExploreScreenProps = {
  session: Session | null;
  drops: Drop[];
  worlds: World[];
};

/** Group drops by media type for the "browse by media" section. */
function groupByMedia(drops: Drop[]): Record<string, Drop[]> {
  const groups: Record<string, Drop[]> = {};
  for (const drop of drops) {
    const modes = drop.previewMedia ? Object.keys(drop.previewMedia) : ["watch"];
    const primary = modes[0] ?? "watch";
    if (!groups[primary]) groups[primary] = [];
    groups[primary].push(drop);
  }
  return groups;
}

/** Extract unique studios from a list of drops. */
function extractStudios(drops: Drop[]): { handle: string; dropCount: number }[] {
  const counts = new Map<string, number>();
  for (const drop of drops) {
    counts.set(drop.studioHandle, (counts.get(drop.studioHandle) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([handle, dropCount]) => ({ handle, dropCount }))
    .sort((a, b) => b.dropCount - a.dropCount);
}

const MEDIA_LABELS: Record<string, string> = {
  watch: "watch",
  listen: "listen",
  read: "read",
  photos: "photos",
  live: "live"
};

const MEDIA_ROUTES: Record<string, () => ReturnType<typeof routes.showroomWatch>> = {
  watch: routes.showroomWatch,
  listen: routes.showroomListen,
  read: routes.showroomRead,
  photos: routes.showroomPhotos,
  live: routes.showroomLive
};

export function ExploreScreen({ session, drops, worlds }: ExploreScreenProps) {
  const recentDrops = [...drops]
    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
    .slice(0, 6);

  const mediaGroups = groupByMedia(drops);
  const studios = extractStudios(drops);

  return (
    <AppShell
      title="explore"
      subtitle="discover drops, worlds, and studios"
      session={session}
      activeNav="townhall"
    >
      {/* ── hero quick links ── */}
      <section className="slice-panel">
        <div className="explore-quick-links">
          <Link href={routes.showroom()} className="explore-quick-link">
            <span className="explore-quick-icon">🎭</span>
            <span>showroom</span>
          </Link>
          <Link href={routes.worlds()} className="explore-quick-link">
            <span className="explore-quick-icon">🌐</span>
            <span>worlds</span>
          </Link>
          <Link href={routes.townhall()} className="explore-quick-link">
            <span className="explore-quick-icon">🏛️</span>
            <span>townhall</span>
          </Link>
          <Link href={routes.collect()} className="explore-quick-link">
            <span className="explore-quick-icon">💎</span>
            <span>collect</span>
          </Link>
        </div>
      </section>

      {/* ── recently released ── */}
      {recentDrops.length > 0 ? (
        <section className="slice-panel">
          <div className="slice-row">
            <p className="slice-label">recently released</p>
            <Link href={routes.showroom()} className="slice-button ghost">
              see all
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1rem"
            }}
            aria-label="recent drops"
          >
            {recentDrops.map((drop) => {
              const posterSrc = resolveDropPoster(drop);
              return (
                <div key={drop.id} className="slice-drop-card" style={{ position: "relative", overflow: "hidden" }}>
                  {posterSrc ? (
                    <div style={{ position: "relative", width: "100%", height: 160, marginBottom: "0.75rem" }}>
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
                      <div
                        style={{
                          position: "absolute",
                          bottom: "0.5rem",
                          left: "0.75rem",
                          right: "0.75rem"
                        }}
                      >
                        <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem" }}>{drop.title}</h3>
                        <p className="slice-meta" style={{ margin: "0.125rem 0 0", opacity: 0.85 }}>
                          {formatUsd(drop.priceUsd)} · @{drop.studioHandle}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="slice-title">{drop.title}</h3>
                      <p className="slice-meta">
                        {formatUsd(drop.priceUsd)} · @{drop.studioHandle}
                      </p>
                    </>
                  )}
                  <p className="slice-copy">{drop.synopsis}</p>
                  <div className="slice-button-row">
                    <Link href={routes.drop(drop.id)} className="slice-button ghost">open</Link>
                    <Link href={routes.collectDrop(drop.id)} className="slice-button">collect</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── browse by media ── */}
      {Object.keys(mediaGroups).length > 0 ? (
        <section className="slice-panel">
          <p className="slice-label">browse by media</p>
          <div className="explore-media-lanes" aria-label="media type lanes">
            {Object.entries(mediaGroups).map(([mediaKey, mediaDrops]) => (
              <div key={mediaKey} className="explore-media-lane">
                <div className="slice-row">
                  <p className="slice-meta" style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {MEDIA_LABELS[mediaKey] ?? mediaKey}
                  </p>
                  {MEDIA_ROUTES[mediaKey] ? (
                    <Link href={MEDIA_ROUTES[mediaKey]()} className="slice-button ghost" style={{ fontSize: "0.75rem" }}>
                      view all
                    </Link>
                  ) : null}
                </div>
                <div className="explore-media-strip">
                  {mediaDrops.slice(0, 4).map((drop) => {
                    const posterSrc = resolveDropPoster(drop);
                    return (
                      <Link
                        key={drop.id}
                        href={routes.drop(drop.id)}
                        className="explore-media-card"
                      >
                        {posterSrc ? (
                          <OptimizedImage
                            src={posterSrc}
                            alt={drop.title}
                            preset="thumbnail"
                            style={{
                              width: "100%",
                              height: 100,
                              objectFit: "cover",
                              borderRadius: "0.375rem"
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: 100,
                              borderRadius: "0.375rem",
                              background: "var(--surface-2, #1a2a3a)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.7rem",
                              color: "var(--text-muted, #8899aa)",
                              textTransform: "uppercase"
                            }}
                          >
                            {drop.title.substring(0, 3)}
                          </div>
                        )}
                        <p className="explore-media-card-title">{drop.title}</p>
                        <p className="slice-meta" style={{ fontSize: "0.7rem" }}>
                          {formatUsd(drop.priceUsd)}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── worlds ── */}
      {worlds.length > 0 ? (
        <section className="slice-panel">
          <div className="slice-row">
            <p className="slice-label">worlds to explore</p>
            <Link href={routes.worlds()} className="slice-button ghost">
              all worlds
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem"
            }}
            aria-label="worlds"
          >
            {worlds.map((world) => {
              const coverSrc = resolveWorldCover(world);
              return (
                <div key={world.id} className="slice-drop-card" style={{ position: "relative", overflow: "hidden", minHeight: 180 }}>
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
                  <p className="slice-meta" style={{ marginTop: "0.25rem" }}>
                    @{world.studioHandle}
                    {world.entryRule && world.entryRule !== "open" ? ` · ${world.entryRule}` : ""}
                  </p>
                  <div className="slice-button-row">
                    <Link href={routes.world(world.id)} className="slice-button ghost">enter world</Link>
                    <Link href={routes.worldDrops(world.id)} className="slice-button alt">drops</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── studios ── */}
      {studios.length > 0 ? (
        <section className="slice-panel">
          <p className="slice-label">studios</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "0.75rem"
            }}
            aria-label="studios"
          >
            {studios.map((s) => (
              <Link
                key={s.handle}
                href={routes.studio(s.handle)}
                className="slice-drop-card"
                style={{ textDecoration: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "var(--surface-2, #1a2a3a)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "var(--text-muted, #8899aa)",
                      flexShrink: 0
                    }}
                  >
                    {s.handle.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="slice-title" style={{ margin: 0, fontSize: "0.95rem" }}>@{s.handle}</p>
                    <p className="slice-meta" style={{ margin: "0.125rem 0 0" }}>
                      {s.dropCount} drop{s.dropCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
