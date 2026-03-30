"use client";

import { formatUsd } from "@/features/shared/format";
import { WithdrawListingButton } from "@/features/collect/withdraw-listing-button";
import { previewResalePayout } from "@/lib/collect/resale-economics";
import type { CollectorListingSnapshot, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { useState } from "react";

type CollectorListingsScreenProps = {
  session: Session;
  listings: CollectorListingSnapshot[];
  statusMessage: string | null;
};

type FilterTab = "active" | "settled" | "all";

const OFFER_STATE_LABEL: Record<string, string> = {
  listed: "listed",
  offer_submitted: "offer pending",
  countered: "countered",
  accepted: "accepted",
  settled: "settled",
  expired: "expired",
  withdrawn: "withdrawn"
};

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function isActiveListing(listing: CollectorListingSnapshot): boolean {
  return (
    listing.offer.state !== "settled" &&
    listing.offer.state !== "expired" &&
    listing.offer.state !== "withdrawn"
  );
}

function isWithdrawable(listing: CollectorListingSnapshot): boolean {
  return (
    listing.offer.state === "listed" ||
    listing.offer.state === "offer_submitted" ||
    listing.offer.state === "countered"
  );
}

export function CollectorListingsScreen({
  session,
  listings,
  statusMessage
}: CollectorListingsScreenProps) {
  const [filter, setFilter] = useState<FilterTab>("active");

  const activeListings = listings.filter(isActiveListing);
  const settledListings = listings.filter((l) => l.offer.state === "settled");

  const filtered =
    filter === "active"
      ? activeListings
      : filter === "settled"
        ? settledListings
        : listings;

  return (
    <>
      {/* ── Summary ── */}
      <section className="slice-panel" data-testid="listings-summary">
        <p className="slice-label">your listings</p>
        <div className="ops-kpi-grid">
          <article className="ops-kpi">
            <h3>{activeListings.length}</h3>
            <p>active</p>
          </article>
          <article className="ops-kpi">
            <h3>{settledListings.length}</h3>
            <p>settled</p>
          </article>
          <article className="ops-kpi">
            <h3>{listings.length}</h3>
            <p>total</p>
          </article>
        </div>
        {statusMessage && <p className="slice-meta">{statusMessage}</p>}
      </section>

      {/* ── Filter tabs ── */}
      <nav className="slice-nav" data-testid="listings-filter">
        {(["active", "settled", "all"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`slice-nav-item${filter === tab ? " active" : ""}`}
            onClick={() => setFilter(tab)}
            aria-current={filter === tab ? "page" : undefined}
          >
            {tab} ({tab === "active" ? activeListings.length : tab === "settled" ? settledListings.length : listings.length})
          </button>
        ))}
      </nav>

      {/* ── Listings ── */}
      <section className="slice-panel" data-testid="listings-grid">
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p className="slice-copy">
              {filter === "active"
                ? "no active listings. list a drop for resale from your collection."
                : filter === "settled"
                  ? "no settled listings yet."
                  : "no listings found."}
            </p>
            <div className="slice-button-row" style={{ marginTop: 16, justifyContent: "center" }}>
              <Link href={routes.myCollection()} className="slice-button">
                go to my collection
              </Link>
              <Link href={routes.collect()} className="slice-button ghost">
                browse marketplace
              </Link>
            </div>
          </div>
        ) : (
          <ul className="slice-grid" aria-label="your listings">
            {filtered.map((listing) => (
              <li
                key={listing.offer.id}
                className="slice-drop-card"
                data-testid="collector-listing-entry"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p className="slice-label">
                      {listing.offer.listingType} ·{" "}
                      {OFFER_STATE_LABEL[listing.offer.state] ?? listing.offer.state}
                    </p>
                    <h3 className="slice-title" style={{ fontSize: "1rem" }}>
                      {listing.dropTitle}
                    </h3>
                    <p className="slice-meta">
                      by{" "}
                      <Link href={routes.studio(listing.studioHandle)} className="slice-link">
                        @{listing.studioHandle}
                      </Link>
                    </p>
                  </div>
                  <p className="slice-copy" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                    {formatUsd(listing.offer.amountUsd)}
                  </p>
                </div>

                <dl className="slice-dl" style={{ marginTop: 8 }}>
                  <dt>original price</dt>
                  <dd>{formatUsd(listing.originalPriceUsd)}</dd>
                  <dt>listed</dt>
                  <dd>{formatDate(listing.offer.createdAt)}</dd>
                  <dt>last updated</dt>
                  <dd>{formatDate(listing.offer.updatedAt)}</dd>
                  {listing.offer.expiresAt && (
                    <>
                      <dt>expires</dt>
                      <dd>{formatDate(listing.offer.expiresAt)}</dd>
                    </>
                  )}
                  {listing.offer.executionPriceUsd !== null && (() => {
                    const payout = previewResalePayout(listing.offer.executionPriceUsd);
                    return (
                      <>
                        <dt>final price</dt>
                        <dd>{formatUsd(listing.offer.executionPriceUsd)}</dd>
                        <dt>creator royalty ({payout.royaltyRatePercent}%)</dt>
                        <dd>{formatUsd(payout.creatorRoyaltyUsd)}</dd>
                        <dt>platform fee ({payout.commissionRatePercent}%)</dt>
                        <dd>{formatUsd(payout.platformCommissionUsd)}</dd>
                        <dt><strong>your payout</strong></dt>
                        <dd><strong>{formatUsd(payout.sellerPayoutUsd)}</strong></dd>
                      </>
                    );
                  })()}
                </dl>

                <div className="slice-button-row" style={{ marginTop: 10 }}>
                  <Link href={routes.drop(listing.dropId)} className="slice-button ghost">
                    view drop
                  </Link>
                  <Link href={routes.dropOffers(listing.dropId)} className="slice-button ghost">
                    offer details
                  </Link>
                  {isWithdrawable(listing) && (
                    <WithdrawListingButton
                      dropId={listing.dropId}
                      offerId={listing.offer.id}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
