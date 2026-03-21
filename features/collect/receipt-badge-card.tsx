import type { ReceiptBadge } from "@/lib/domain/contracts";

type ReceiptBadgeCardProps = {
  badge: ReceiptBadge;
  size?: "compact" | "full";
};

function formatBadgeDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  });
}

export function ReceiptBadgeCard({ badge, size = "full" }: ReceiptBadgeCardProps) {
  const isCompact = size === "compact";

  return (
    <article
      className={`receipt-badge-card ${isCompact ? "receipt-badge-card-compact" : ""}`}
      data-testid={`receipt-badge-${badge.id}`}
      aria-label={`collect badge for ${badge.dropTitle}`}
    >
      <div className="receipt-badge-sigil" aria-hidden="true">
        <span className="receipt-badge-sigil-glyph">◆</span>
      </div>
      <div className="receipt-badge-content">
        <p className="receipt-badge-title">{badge.dropTitle}</p>
        {badge.worldTitle ? (
          <p className="receipt-badge-world">{badge.worldTitle}</p>
        ) : null}
        <p className="receipt-badge-collector">
          collected by <strong>@{badge.collectorHandle}</strong>
        </p>
        <p className="receipt-badge-date">{formatBadgeDate(badge.collectDate)}</p>
        {badge.editionPosition ? (
          <p className="receipt-badge-edition">edition {badge.editionPosition}</p>
        ) : null}
      </div>
      <div className="receipt-badge-proof" aria-label="proof identifier">
        <span className="receipt-badge-proof-id">{badge.id.slice(0, 12)}...</span>
      </div>
    </article>
  );
}
