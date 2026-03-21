import { formatUsd } from "@/features/shared/format";
import { AppShell } from "@/features/shell/app-shell";
import type {
  CollectInventoryListing,
  CollectOffer,
  Drop,
  Session
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type ListingDetailScreenProps = {
  session: Session | null;
  listing: CollectInventoryListing;
  offers: CollectOffer[];
};

const OFFER_STATE_LABEL: Record<string, string> = {
  listed: "listed",
  offer_submitted: "offer pending",
  countered: "countered",
  accepted: "accepted",
  settled: "settled",
  expired: "expired",
  withdrawn: "withdrawn"
};

const LISTING_TYPE_LABEL: Record<string, string> = {
  sale: "primary sale",
  auction: "auction",
  resale: "resale"
};

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 10);
}

export function ListingDetailScreen({
  session,
  listing,
  offers
}: ListingDetailScreenProps) {
  const drop = listing.drop;
  const activeOffers = offers.filter(
    (o) => o.state !== "expired" && o.state !== "withdrawn" && o.state !== "settled"
  );
  const settledOffers = offers.filter((o) => o.state === "settled");

  return (
    <AppShell
      title="listing detail"
      subtitle={`${LISTING_TYPE_LABEL[listing.listingType] ?? listing.listingType} listing`}
      session={session}
      activeNav="collect"
    >
      <section className="slice-panel" data-testid="listing-detail-header">
        <p className="slice-label">
          {LISTING_TYPE_LABEL[listing.listingType] ?? listing.listingType} listing
        </p>
        <h2 className="slice-title">{drop.title}</h2>
        <p className="slice-copy">{drop.synopsis}</p>
        <p className="slice-meta">
          asking price: {formatUsd(listing.priceUsd)} · offers:{" "}
          {listing.offerCount}
          {listing.highestOfferUsd !== null
            ? ` · highest: ${formatUsd(listing.highestOfferUsd)}`
            : ""}
        </p>
        <p className="slice-meta">
          latest state: {OFFER_STATE_LABEL[listing.latestOfferState] ?? listing.latestOfferState}
        </p>
        <div className="slice-button-row">
          <Link href={routes.drop(drop.id)} className="slice-button">
            view drop
          </Link>
          <Link href={routes.dropOffers(drop.id)} className="slice-button alt">
            manage offers
          </Link>
          <Link href={routes.collectListings()} className="slice-button ghost">
            ← all listings
          </Link>
        </div>
      </section>

      <section className="slice-panel" data-testid="listing-active-offers">
        <p className="slice-label">active offers ({activeOffers.length})</p>
        {activeOffers.length === 0 ? (
          <p className="slice-meta">no active offers on this listing.</p>
        ) : (
          <ul className="slice-grid" aria-label="active offers">
            {activeOffers.map((offer) => (
              <li
                key={offer.id}
                className="slice-drop-card"
                data-testid="listing-offer-entry"
              >
                <p className="slice-label">
                  {offer.listingType} · {OFFER_STATE_LABEL[offer.state] ?? offer.state}
                </p>
                <p className="slice-copy">
                  @{offer.actorHandle} · {formatUsd(offer.amountUsd)}
                </p>
                <p className="slice-meta">
                  submitted: {formatDate(offer.createdAt)} · updated:{" "}
                  {formatDate(offer.updatedAt)}
                </p>
                {offer.expiresAt ? (
                  <p className="slice-meta">expires: {formatDate(offer.expiresAt)}</p>
                ) : null}
                {offer.executionPriceUsd !== null ? (
                  <p className="slice-meta">
                    execution price: {formatUsd(offer.executionPriceUsd)} (
                    {offer.executionVisibility})
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {settledOffers.length > 0 ? (
        <section className="slice-panel" data-testid="listing-settled-offers">
          <p className="slice-label">settled offers ({settledOffers.length})</p>
          <ul className="slice-grid" aria-label="settled offers">
            {settledOffers.map((offer) => (
              <li
                key={offer.id}
                className="slice-drop-card"
                data-testid="listing-settled-entry"
              >
                <p className="slice-label">settled</p>
                <p className="slice-copy">
                  @{offer.actorHandle} · {formatUsd(offer.amountUsd)}
                </p>
                <p className="slice-meta">
                  settled: {formatDate(offer.updatedAt)}
                  {offer.executionPriceUsd !== null
                    ? ` · final price: ${formatUsd(offer.executionPriceUsd)}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
