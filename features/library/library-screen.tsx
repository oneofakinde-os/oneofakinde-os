import { OptimizedImage } from "@/features/media/optimized-image";
import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import { resolveDropPoster } from "@/features/shared/resolve-poster";
import type { LibrarySnapshot, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type LibraryScreenProps = {
  session: Session;
  library: LibrarySnapshot;
};

function formatProgressState(value: string): string {
  if (value === "in_progress") return "in progress";
  if (value === "completed") return "completed";
  return "pending";
}

function formatActivityTimestamp(value: string | null): string {
  if (!value) {
    return "none";
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return "none";
  }

  return new Date(parsed).toLocaleString();
}

export function LibraryScreen({ session, library }: LibraryScreenProps) {
  const readInProgressCount = library.readQueue.filter(
    (entry) => entry.resume.progressState === "in_progress"
  ).length;
  const listenInProgressCount = library.listenQueue.filter(
    (entry) => entry.resume.progressState === "in_progress"
  ).length;

  return (
    <AppShell
      title="library"
      subtitle="saved drop queueing + gated recall"
      session={session}
      activeNav="library"
    >
      <section className="slice-panel">
        <div className="slice-row">
          <p className="slice-label">{library.savedDrops.length} saved drops</p>
          <p className="slice-meta">
            read in progress {readInProgressCount} · listen in progress {listenInProgressCount}
          </p>
          <Link href={routes.townhall()} className="slice-button ghost">
            open townhall
          </Link>
        </div>
      </section>

      <section className="slice-panel" data-testid="library-read-queue">
        <p className="slice-label">read queue</p>
        <p className="slice-meta">explicit ordering + resume metadata for read continuation.</p>
        {library.readQueue.length === 0 ? (
          <p className="slice-copy">no read queue items yet.</p>
        ) : (
          <ul className="slice-grid" aria-label="library read queue">
            {library.readQueue.map((item) => {
              const posterSrc = resolveDropPoster(item.drop);
              return (
                <li key={`read:${item.drop.id}:${item.savedAt}`} className="slice-drop-card">
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    {posterSrc ? (
                      <OptimizedImage
                        src={posterSrc}
                        alt={item.drop.title}
                        preset="thumbnail"
                        style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <span className="slice-avatar-placeholder" aria-hidden style={{ width: 56, height: 56, borderRadius: 8 }}>
                        {item.drop.title.charAt(0)}
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="slice-label">#{item.queuePosition} · {formatProgressState(item.resume.progressState)}</p>
                      <h2 className="slice-title">{item.drop.title}</h2>
                      <p className="slice-meta">{item.resume.progressLabel} · {item.resume.resumeLabel}</p>
                    </div>
                  </div>
                  <p className="slice-copy">{item.drop.synopsis}</p>
                  <p className="slice-meta">
                    eligibility · {item.eligibility.state} · delta {item.eligibility.delta}
                  </p>
                  <div className="slice-button-row">
                    <Link href={routes.dropRead(item.drop.id)} className="slice-button ghost">
                      open read
                    </Link>
                    <Link href={routes.drop(item.drop.id)} className="slice-button alt">
                      open drop
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="slice-panel" data-testid="library-listen-queue">
        <p className="slice-label">listen queue</p>
        <p className="slice-meta">explicit ordering + resume metadata for listen continuation.</p>
        {library.listenQueue.length === 0 ? (
          <p className="slice-copy">no listen queue items yet.</p>
        ) : (
          <ul className="slice-grid" aria-label="library listen queue">
            {library.listenQueue.map((item) => {
              const posterSrc = resolveDropPoster(item.drop);
              return (
                <li key={`listen:${item.drop.id}:${item.savedAt}`} className="slice-drop-card">
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    {posterSrc ? (
                      <OptimizedImage
                        src={posterSrc}
                        alt={item.drop.title}
                        preset="thumbnail"
                        style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <span className="slice-avatar-placeholder" aria-hidden style={{ width: 56, height: 56, borderRadius: 8 }}>
                        {item.drop.title.charAt(0)}
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="slice-label">#{item.queuePosition} · {formatProgressState(item.resume.progressState)}</p>
                      <h2 className="slice-title">{item.drop.title}</h2>
                      <p className="slice-meta">
                        {item.resume.progressLabel} · {Math.floor(item.resume.consumedSeconds)}s listened
                      </p>
                    </div>
                  </div>
                  <p className="slice-copy">{item.drop.synopsis}</p>
                  <p className="slice-meta">
                    eligibility · {item.eligibility.state} · delta {item.eligibility.delta}
                  </p>
                  <div className="slice-button-row">
                    <Link href={routes.dropListen(item.drop.id)} className="slice-button ghost">
                      open listen
                    </Link>
                    <Link href={routes.drop(item.drop.id)} className="slice-button alt">
                      open drop
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="slice-panel" data-testid="library-saved-drops">
        <p className="slice-label">saved drops</p>
        {library.savedDrops.length === 0 ? (
          <p className="slice-copy">your library is empty. save drops from townhall to populate it.</p>
        ) : (
          <ul className="slice-grid" aria-label="library drop list">
            {library.savedDrops.map((item) => {
              const posterSrc = resolveDropPoster(item.drop);
              return (
                <li key={`${item.drop.id}:${item.savedAt}`} className="slice-drop-card">
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    {posterSrc ? (
                      <OptimizedImage
                        src={posterSrc}
                        alt={item.drop.title}
                        preset="thumbnail"
                        style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <span className="slice-avatar-placeholder" aria-hidden style={{ width: 56, height: 56, borderRadius: 8 }}>
                        {item.drop.title.charAt(0)}
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="slice-label">saved {item.savedAt.slice(0, 10)}</p>
                      <h2 className="slice-title">{item.drop.title}</h2>
                      <p className="slice-meta">
                        {formatUsd(item.drop.priceUsd)} ·{" "}
                        <Link href={routes.studio(item.drop.studioHandle)} className="slice-link">
                          @{item.drop.studioHandle}
                        </Link>
                      </p>
                    </div>
                  </div>
                  <p className="slice-copy">{item.drop.synopsis}</p>
                  <p className="slice-meta">
                    eligibility · {item.eligibility.state} · delta {item.eligibility.delta}
                  </p>
                  <div className="slice-button-row">
                    <Link href={routes.drop(item.drop.id)} className="slice-button ghost">
                      open drop
                    </Link>
                    <Link href={routes.world(item.drop.worldId)} className="slice-button alt">
                      open world
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
