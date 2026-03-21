import { formatUsd } from "@/features/shared/format";
import type {
  CollectOffer,
  DropOwnershipHistory,
  OwnershipHistoryEntry
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type MarketActivityCardProps = {
  dropId: string;
  dropTitle: string;
  ownershipHistory: DropOwnershipHistory | null;
  recentOffers: CollectOffer[];
  layout?: "full" | "compact";
};

const EVENT_KIND_LABEL: Record<string, string> = {
  collect: "collected",
  refund: "refunded"
};

const OFFER_STATE_LABEL: Record<string, string> = {
  listed: "listed",
  offer_submitted: "offer submitted",
  countered: "countered",
  accepted: "accepted",
  settled: "settled",
  expired: "expired",
  withdrawn: "withdrawn"
};

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 10);
}

function HistoryEntry({ entry }: { entry: OwnershipHistoryEntry }) {
  return (
    <li className="slice-list-row" data-testid="market-activity-history-entry">
      <span className="slice-meta">
        {EVENT_KIND_LABEL[entry.kind] ?? entry.kind} · @{entry.actorHandle}
      </span>
      <span className="slice-meta">
        {entry.publicAmountUsd !== null ? formatUsd(entry.publicAmountUsd) : "—"}
        {" · "}
        {formatDate(entry.occurredAt)}
      </span>
    </li>
  );
}

function OfferEntry({ offer }: { offer: CollectOffer }) {
  return (
    <li className="slice-list-row" data-testid="market-activity-offer-entry">
      <span className="slice-meta">
        {offer.listingType} · {OFFER_STATE_LABEL[offer.state] ?? offer.state} · @
        {offer.actorHandle}
      </span>
      <span className="slice-meta">
        {formatUsd(offer.amountUsd)}
        {offer.executionPriceUsd !== null
          ? ` → settled ${formatUsd(offer.executionPriceUsd)}`
          : ""}
        {" · "}
        {formatDate(offer.updatedAt)}
      </span>
    </li>
  );
}

export function MarketActivityCard({
  dropId,
  dropTitle,
  ownershipHistory,
  recentOffers,
  layout = "full"
}: MarketActivityCardProps) {
  const historyEntries = ownershipHistory?.entries ?? [];
  const isCompact = layout === "compact";
  const maxItems = isCompact ? 3 : 10;

  return (
    <article className="slice-panel" data-testid="market-activity-card">
      <p className="slice-label">market activity</p>
      {!isCompact ? (
        <h2 className="slice-title">{dropTitle}</h2>
      ) : (
        <p className="slice-copy">{dropTitle}</p>
      )}

      {historyEntries.length > 0 ? (
        <>
          <p className="slice-label">ownership history</p>
          <ul className="slice-list" aria-label="ownership history">
            {historyEntries.slice(0, maxItems).map((entry) => (
              <HistoryEntry key={entry.id} entry={entry} />
            ))}
          </ul>
          {historyEntries.length > maxItems ? (
            <p className="slice-meta">
              + {historyEntries.length - maxItems} more events
            </p>
          ) : null}
        </>
      ) : (
        <p className="slice-meta">no ownership events recorded yet.</p>
      )}

      {recentOffers.length > 0 ? (
        <>
          <p className="slice-label">recent offers</p>
          <ul className="slice-list" aria-label="recent offers">
            {recentOffers.slice(0, maxItems).map((offer) => (
              <OfferEntry key={offer.id} offer={offer} />
            ))}
          </ul>
          {recentOffers.length > maxItems ? (
            <p className="slice-meta">
              + {recentOffers.length - maxItems} more offers
            </p>
          ) : null}
        </>
      ) : (
        <p className="slice-meta">no offers yet.</p>
      )}

      <div className="slice-button-row">
        <Link href={routes.dropActivity(dropId)} className="slice-button ghost">
          full history
        </Link>
        <Link href={routes.dropOffers(dropId)} className="slice-button alt">
          view offers
        </Link>
      </div>
    </article>
  );
}
