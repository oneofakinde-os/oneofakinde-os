import { PatronBadge } from "@/features/patron/patron-badge";
import { AppShell } from "@/features/shell/app-shell";
import type { Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type PatronWorldEntry = {
  worldId: string;
  worldTitle: string;
  status: string;
  recognitionTier?: "founding" | "active";
};

type CollectorPublicScreenProps = {
  handle: string;
  displayName: string;
  roles: string[];
  collectionCount: number;
  badgeCount: number;
  patronWorlds: PatronWorldEntry[];
  session: Session | null;
};

export function CollectorPublicScreen({
  handle,
  displayName,
  roles,
  collectionCount,
  badgeCount,
  patronWorlds,
  session
}: CollectorPublicScreenProps) {
  return (
    <AppShell
      title="collector"
      subtitle="collector public profile"
      session={session}
      activeNav="collect"
    >
      <section className="slice-panel">
        <p className="slice-label">@{handle}</p>
        <h2 className="slice-title">{displayName}</h2>
        <p className="slice-meta">roles · {roles.join(", ")}</p>
      </section>

      <section className="slice-panel" data-testid="collector-stats">
        <p className="slice-label">collection</p>
        <dl className="slice-metadata-grid">
          <div>
            <dt className="slice-meta">drops collected</dt>
            <dd className="slice-copy">{collectionCount}</dd>
          </div>
          <div>
            <dt className="slice-meta">badges earned</dt>
            <dd className="slice-copy">{badgeCount}</dd>
          </div>
        </dl>
        <div className="slice-button-row">
          <Link href={routes.myCollection()} className="slice-button ghost">
            view collection
          </Link>
        </div>
      </section>

      <section className="slice-panel" data-testid="collector-patron-worlds">
        <p className="slice-label">patron worlds</p>
        {patronWorlds.length === 0 ? (
          <p className="slice-meta">not a patron of any world yet.</p>
        ) : (
          <ul className="slice-list" aria-label="patron worlds">
            {patronWorlds.map((entry) => (
              <li key={entry.worldId} className="slice-list-row">
                <PatronBadge
                  recognitionTier={entry.recognitionTier ?? "active"}
                  status={entry.status as "active" | "lapsed"}
                  size="compact"
                />
                <Link href={routes.world(entry.worldId)} className="slice-link">
                  {entry.worldTitle}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
