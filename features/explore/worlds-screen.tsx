import { OptimizedImage } from "@/features/media/optimized-image";
import { AppShell } from "@/features/shell/app-shell";
import type { Session, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type WorldsScreenProps = {
  session: Session | null;
  worlds: World[];
};

const ENTRY_RULE_LABELS: Record<string, string> = {
  open: "open entry",
  membership: "membership required",
  patron: "patron required"
};

export function WorldsScreen({ session, worlds }: WorldsScreenProps) {
  return (
    <AppShell
      title="worlds"
      subtitle={`${worlds.length} worlds`}
      session={session}
      activeNav="worlds"
    >
      <section className="slice-panel">
        {worlds.length === 0 ? (
          <p className="slice-copy">no worlds available yet.</p>
        ) : (
          <ul className="slice-world-grid" aria-label="worlds index list">
            {worlds.map((world) => {
              const coverSrc = world.visualIdentity?.coverImageSrc ?? null;
              const entryLabel = world.entryRule
                ? ENTRY_RULE_LABELS[world.entryRule] ?? world.entryRule
                : null;
              return (
                <li key={world.id} className="slice-world-card">
                  {coverSrc ? (
                    <div style={{ position: "relative", borderRadius: "0.5rem", overflow: "hidden", marginBottom: 12 }}>
                      <OptimizedImage
                        src={coverSrc}
                        alt={`${world.title} cover`}
                        preset="dropPosterCard"
                        style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)"
                        }}
                      />
                      <h2
                        className="slice-title"
                        style={{ position: "absolute", bottom: 8, left: 12, color: "#fff", margin: 0, fontSize: "1rem" }}
                      >
                        {world.title}
                      </h2>
                    </div>
                  ) : (
                    <h2 className="slice-title">{world.title}</h2>
                  )}
                  <p className="slice-meta">
                    <Link href={routes.studio(world.studioHandle)} className="slice-link">
                      @{world.studioHandle}
                    </Link>
                    {entryLabel ? ` · ${entryLabel}` : ""}
                  </p>
                  <p className="slice-copy">{world.synopsis}</p>
                  <div className="slice-button-row" style={{ marginTop: 8 }}>
                    <Link href={routes.world(world.id)} className="slice-button ghost">
                      open world
                    </Link>
                    <Link href={routes.worldDrops(world.id)} className="slice-button alt">
                      drops
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
