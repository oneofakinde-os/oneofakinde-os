import Link from "next/link";
import type { Route } from "next";
import { OptimizedImage } from "@/features/media/optimized-image";
import { formatUsd } from "@/features/shared/format";
import type { Drop, Session, Studio, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";

type SearchPayload = {
  query?: string;
  drops?: any[];
  worlds?: any[];
  studios?: any[];
  users?: any[];
};

type TownhallSearchScreenProps = {
  query?: string;
  session: Session | null;
  drops?: Drop[];
  worlds?: World[];
  studios?: Studio[];
  search?: SearchPayload;
  basePath?: Route;
};

function textValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "result";
}

export function TownhallSearchScreen({
  query,
  session,
  drops,
  worlds,
  studios,
  search,
  basePath,
}: TownhallSearchScreenProps) {
  void session;
  const resolvedQuery = search?.query ?? query ?? "";
  const resolvedDrops = search?.drops ?? drops ?? [];
  const resolvedWorlds = search?.worlds ?? worlds ?? [];
  const resolvedStudios = search?.studios ?? search?.users ?? studios ?? [];
  const resolvedBasePath = basePath ?? routes.townhallSearch();

  const totalResults = resolvedDrops.length + resolvedWorlds.length + resolvedStudios.length;

  return (
    <main className="townhall-search-screen">
      <section className="townhall-search-shell">
        <p className="townhall-search-label">search</p>
        <h1 className="townhall-search-title">{resolvedQuery || "discover"}</h1>
        <p className="townhall-search-copy">
          {totalResults} result{totalResults !== 1 ? "s" : ""}
        </p>

        <div className="townhall-search-actions">
          <Link href={resolvedBasePath} className="townhall-search-link">
            reset
          </Link>
          <Link href={routes.showroom()} className="townhall-search-link">
            showroom
          </Link>
        </div>

        {/* ── drop results ── */}
        {resolvedDrops.length > 0 ? (
          <div style={{ marginTop: "1.5rem" }}>
            <p className="slice-label">drops · {resolvedDrops.length}</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "0.75rem",
                marginTop: "0.5rem"
              }}
            >
              {resolvedDrops.map((drop: any) => {
                const posterSrc = drop.posterSrc ?? null;
                return (
                  <div key={`drop-${drop.id ?? drop.slug ?? Math.random()}`} className="slice-drop-card">
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
                          {textValue(drop.title, drop.name).substring(0, 2)}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link
                          href={routes.drop(String(drop.id ?? drop.slug ?? ""))}
                          style={{ fontWeight: 600, textDecoration: "none" }}
                        >
                          {textValue(drop.title, drop.name, drop.slug)}
                        </Link>
                        <p className="slice-meta" style={{ margin: "0.25rem 0 0" }}>
                          {drop.priceUsd != null ? formatUsd(drop.priceUsd) : ""}
                          {drop.studioHandle ? ` · @${drop.studioHandle}` : ""}
                        </p>
                      </div>
                    </div>
                    {drop.synopsis ? (
                      <p
                        className="slice-copy"
                        style={{
                          marginTop: "0.5rem",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}
                      >
                        {drop.synopsis}
                      </p>
                    ) : null}
                    <div className="slice-button-row" style={{ marginTop: "0.5rem" }}>
                      <Link href={routes.drop(String(drop.id ?? drop.slug ?? ""))} className="slice-button ghost">
                        open
                      </Link>
                      <Link href={routes.collectDrop(String(drop.id ?? drop.slug ?? ""))} className="slice-button">
                        collect
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ── world results ── */}
        {resolvedWorlds.length > 0 ? (
          <div style={{ marginTop: "1.5rem" }}>
            <p className="slice-label">worlds · {resolvedWorlds.length}</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "0.75rem",
                marginTop: "0.5rem"
              }}
            >
              {resolvedWorlds.map((world: any) => {
                const coverSrc = world.coverImageSrc ?? null;
                return (
                  <div key={`world-${world.id ?? world.slug ?? Math.random()}`} className="slice-drop-card" style={{ overflow: "hidden" }}>
                    {coverSrc ? (
                      <div style={{ position: "relative", width: "100%", height: 100, marginBottom: "0.5rem" }}>
                        <OptimizedImage
                          src={coverSrc}
                          alt={`${textValue(world.title)} cover`}
                          preset="dropPosterCard"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "0.375rem"
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)",
                            borderRadius: "0.375rem"
                          }}
                        />
                        <span style={{ position: "absolute", bottom: "0.375rem", left: "0.5rem", fontWeight: 700 }}>
                          {textValue(world.title, world.name, world.slug)}
                        </span>
                      </div>
                    ) : (
                      <Link href={routes.world(String(world.id ?? world.slug ?? ""))} style={{ fontWeight: 600, textDecoration: "none" }}>
                        {textValue(world.title, world.name, world.slug)}
                      </Link>
                    )}
                    {world.synopsis ? (
                      <p
                        className="slice-copy"
                        style={{
                          marginTop: coverSrc ? 0 : "0.5rem",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}
                      >
                        {world.synopsis}
                      </p>
                    ) : null}
                    {world.studioHandle ? (
                      <p className="slice-meta" style={{ marginTop: "0.25rem" }}>
                        <Link href={routes.studio(world.studioHandle)}>@{world.studioHandle}</Link>
                      </p>
                    ) : null}
                    <div className="slice-button-row" style={{ marginTop: "0.5rem" }}>
                      <Link href={routes.world(String(world.id ?? world.slug ?? ""))} className="slice-button ghost">
                        open world
                      </Link>
                      <Link href={routes.worldDrops(String(world.id ?? world.slug ?? ""))} className="slice-button alt">
                        drops
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ── studio/user results ── */}
        {resolvedStudios.length > 0 ? (
          <div style={{ marginTop: "1.5rem" }}>
            <p className="slice-label">studios · {resolvedStudios.length}</p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "0.75rem",
                marginTop: "0.5rem"
              }}
            >
              {resolvedStudios.map((studio: any) => {
                const handle = studio.handle ?? studio.id ?? "";
                return (
                  <div key={`studio-${handle || Math.random()}`} className="slice-drop-card">
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: "var(--surface-2, #1a2a3a)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: "var(--text-muted, #8899aa)",
                          flexShrink: 0
                        }}
                      >
                        {String(handle).charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link
                          href={routes.studio(String(handle))}
                          style={{ fontWeight: 600, textDecoration: "none" }}
                        >
                          {textValue(studio.name, studio.title, handle)}
                        </Link>
                        <p className="slice-meta" style={{ margin: "0.25rem 0 0" }}>@{handle}</p>
                      </div>
                    </div>
                    {studio.synopsis ? (
                      <p
                        className="slice-copy"
                        style={{
                          marginTop: "0.5rem",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}
                      >
                        {studio.synopsis}
                      </p>
                    ) : null}
                    <div className="slice-button-row" style={{ marginTop: "0.5rem" }}>
                      <Link href={routes.studio(String(handle))} className="slice-button ghost">
                        open studio
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {totalResults === 0 && resolvedQuery ? (
          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <p className="slice-copy">no results found for &ldquo;{resolvedQuery}&rdquo;</p>
            <p className="slice-meta" style={{ marginTop: "0.5rem" }}>
              try a different search term or browse the{" "}
              <Link href={routes.showroom()}>showroom</Link>
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
