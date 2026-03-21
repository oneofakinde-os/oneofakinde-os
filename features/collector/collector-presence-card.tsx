import { PatronBadge } from "@/features/patron/patron-badge";
import type { PatronStatus } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type CollectorPresenceCardProps = {
  handle: string;
  displayName: string;
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
        className="slice-meta"
        data-testid="collector-presence-inline"
        style={{ display: "inline-flex", gap: "0.375rem", alignItems: "center" }}
      >
        <Link href={routes.collector(handle)} className="slice-link">
          @{handle}
        </Link>
        <span>{collectionCount} collected</span>
        {activePatronCount > 0 ? (
          <span style={{ color: "rgb(80, 220, 180)" }}>
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
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginTop: "0.375rem" }}>
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
