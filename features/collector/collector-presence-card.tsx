import { PatronBadge } from "@/features/patron/patron-badge";
import type { PatronStatus } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";
import "./collector-presence.css";

type CollectorPresenceCardProps = {
  handle: string;
  displayName: string;
  avatarUrl?: string;
  collectionCount: number;
  badgeCount: number;
  patronWorlds: Array<{
    worldId: string;
    worldTitle: string;
    status: string;
    recognitionTier?: "founding" | "active";
  }>;
  layout?: "full" | "compact" | "inline";
};

export function CollectorPresenceCard({
  handle,
  displayName,
  avatarUrl,
  collectionCount,
  badgeCount,
  patronWorlds,
  layout = "full"
}: CollectorPresenceCardProps) {
  const isInline = layout === "inline";
  const isCompact = layout === "compact";
  const activePatronCount = patronWorlds.filter((w) => w.status === "active").length;

  if (isInline) {
    return (
      <span
        className="slice-meta collector-presence-inline"
        data-testid="collector-presence-inline"
      >
        <Link href={routes.collector(handle)} className="slice-link">
          @{handle}
        </Link>
        <span>{collectionCount} collected</span>
        {activePatronCount > 0 ? (
          <span className="collector-patron-accent">
            patron ×{activePatronCount}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <article
      className={isCompact ? "slice-list-row" : "slice-drop-card"}
      data-testid="collector-presence-card"
    >
      {!isCompact && avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`@${handle}`}
          className="slice-avatar"
          width={40}
          height={40}
        />
      ) : null}
      <div>
        <p className="slice-label">
          <Link href={routes.collector(handle)} className="slice-link">
            @{handle}
          </Link>
        </p>
        {!isCompact ? (
          <p className="slice-copy">{displayName}</p>
        ) : null}
        <p className="slice-meta">
          {collectionCount} collected · {badgeCount} badges
          {activePatronCount > 0 ? ` · patron ×${activePatronCount}` : ""}
        </p>
      </div>

      {!isCompact && patronWorlds.length > 0 ? (
        <div className="collector-badge-row">
          {patronWorlds
            .filter((w) => w.status === "active")
            .slice(0, 3)
            .map((w) => (
              <PatronBadge
                key={w.worldId}
                recognitionTier={w.recognitionTier ?? "active"}
                status={w.status as "active" | "lapsed"}
                size="compact"
              />
            ))}
        </div>
      ) : null}
    </article>
  );
}
