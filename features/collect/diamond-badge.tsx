import type { EconomicActivityIndicator } from "@/lib/collect/collect-lane";

type DiamondBadgeProps = {
  indicator?: EconomicActivityIndicator;
};

const INDICATOR_LABELS: Record<NonNullable<EconomicActivityIndicator>, string> = {
  hot_resale: "hot resale",
  capped_supply: "capped supply",
};

export function DiamondBadge({ indicator }: DiamondBadgeProps) {
  const label = indicator ? INDICATOR_LABELS[indicator] : "collectible";

  return (
    <span
      className={`diamond-badge ${indicator ? `diamond-badge-${indicator.replace("_", "-")}` : ""}`}
      aria-label={label}
      title={label}
    >
      <span className="diamond-badge-icon" aria-hidden>
        ◆
      </span>
      {indicator ? <span className="diamond-badge-label">{label}</span> : null}
    </span>
  );
}
