import { OptimizedImage } from "@/features/media/optimized-image";
import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import { sortDropsForWorldSurface } from "@/lib/catalog/drop-curation";
import type { Drop, Session, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type WorldDropsScreenProps = {
  world: World;
  drops: Drop[];
  session: Session | null;
};

export function WorldDropsScreen({ world, drops, session }: WorldDropsScreenProps) {
  const orderedDrops = sortDropsForWorldSurface(drops);

  return (
    <AppShell
      title="drops"
      subtitle={`${world.title} · ${drops.length} drops`}
      session={session}
      activeNav="worlds"
    >
      <section className="slice-panel">
        <div className="slice-row">
          <p className="slice-label">{world.title}</p>
          <Link href={routes.world(world.id)} className="slice-button ghost">
            back to world
          </Link>
        </div>

        {drops.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p className="slice-copy">no drops available in this world yet.</p>
            <p className="slice-meta" style={{ marginTop: 8 }}>check back soon for new releases.</p>
          </div>
        ) : (
          <ul className="slice-grid" aria-label="drops in this world list">
            {orderedDrops.map((drop) => {
              const posterSrc = drop.previewMedia?.watch?.posterSrc
                ?? drop.previewMedia?.photos?.src
                ?? null;
              return (
                <li key={drop.id} className="slice-drop-card">
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {posterSrc ? (
                      <OptimizedImage
                        src={posterSrc}
                        alt={drop.title}
                        width={48}
                        height={72}
                        preset="thumbnail"
                        style={{ borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <span
                        className="slice-avatar-placeholder"
                        style={{ width: 48, height: 72, borderRadius: 4, fontSize: 16 }}
                        aria-hidden
                      >
                        {drop.title.charAt(0)}
                      </span>
                    )}
                    <div style={{ flex: 1 }}>
                      <p className="slice-label">
                        {drop.worldOrderIndex ? `#${drop.worldOrderIndex}` : drop.seasonLabel}
                      </p>
                      <h2 className="slice-title" style={{ fontSize: "0.95rem" }}>{drop.title}</h2>
                      <p className="slice-meta">
                        {formatUsd(drop.priceUsd)}
                        {drop.studioHandle ? (
                          <>
                            {" · "}
                            <Link href={routes.studio(drop.studioHandle)} className="slice-link">
                              @{drop.studioHandle}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <p className="slice-copy" style={{ marginTop: 8 }}>{drop.synopsis}</p>
                  <div className="slice-button-row" style={{ marginTop: 8 }}>
                    <Link href={routes.drop(drop.id)} className="slice-button ghost">
                      open
                    </Link>
                    <Link href={routes.dropPreview(drop.id)} className="slice-button alt">
                      preview
                    </Link>
                    <Link href={routes.collectDrop(drop.id)} className="slice-button">
                      collect
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
