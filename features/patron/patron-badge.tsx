import type { PatronStatus } from "@/lib/domain/contracts";

type PatronBadgeProps = {
  recognitionTier: "founding" | "active";
  status: PatronStatus;
  handle?: string;
  committedAt?: string;
  size?: "compact" | "full";
};

const TIER_LABEL: Record<"founding" | "active", string> = {
  founding: "founding patron",
  active: "patron"
};

const STATUS_LABEL: Record<PatronStatus, string> = {
  active: "active",
  lapsed: "lapsed"
};

function formatCommittedDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  });
}

export function PatronBadge({
  recognitionTier,
  status,
  handle,
  committedAt,
  size = "full"
}: PatronBadgeProps) {
  const isCompact = size === "compact";
  const isFounding = recognitionTier === "founding";
  const isLapsed = status === "lapsed";

  return (
    <article
      className={[
        "patron-badge",
        isCompact ? "patron-badge-compact" : "",
        isFounding ? "patron-badge-founding" : "",
        isLapsed ? "patron-badge-lapsed" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="patron-badge"
      aria-label={`${TIER_LABEL[recognitionTier]} · ${STATUS_LABEL[status]}`}
    >
      <div className="patron-badge-sigil" aria-hidden="true">
        <span className="patron-badge-sigil-glyph">
          {isFounding ? "★" : "◆"}
        </span>
      </div>
      <div className="patron-badge-content">
        <p className="patron-badge-tier">{TIER_LABEL[recognitionTier]}</p>
        <p className={`patron-badge-status ${isLapsed ? "patron-badge-status-lapsed" : ""}`}>
          {STATUS_LABEL[status]}
        </p>
        {handle ? (
          <p className="patron-badge-handle">@{handle}</p>
        ) : null}
        {committedAt ? (
          <p className="patron-badge-date">since {formatCommittedDate(committedAt)}</p>
        ) : null}
      </div>
    </article>
  );
}
