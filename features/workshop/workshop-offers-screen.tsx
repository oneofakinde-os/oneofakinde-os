"use client";

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
import { useState } from "react";

type DropWithOffers = {
  drop: Drop;
  listing: CollectInventoryListing | null;
  offers: CollectOffer[];
};

type WorkshopOffersScreenProps = {
  session: Session;
  dropsWithOffers: DropWithOffers[];
  notice: string | null;
  acceptOfferAction: (formData: FormData) => Promise<void>;
  settleOfferAction: (formData: FormData) => Promise<void>;
};

const OFFER_STATE_LABEL: Record<string, string> = {
  listed: "listed",
  offer_submitted: "pending",
  countered: "countered",
  accepted: "accepted",
  settled: "settled",
  expired: "expired",
  withdrawn: "withdrawn"
};

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleDateString();
}

function OfferCard({
  offer,
  dropId,
  acceptOfferAction,
  settleOfferAction
}: {
  offer: CollectOffer;
  dropId: string;
  acceptOfferAction: (formData: FormData) => Promise<void>;
  settleOfferAction: (formData: FormData) => Promise<void>;
}) {
  const [settling, setSettling] = useState(false);
  const canAccept = offer.state === "offer_submitted" || offer.state === "countered";
  const canSettle = offer.state === "accepted";

  return (
    <li className="slice-drop-card" data-testid="workshop-offer-card">
      <p className="slice-label">{offer.actorHandle}</p>
      <h3 className="slice-title">{formatUsd(offer.amountUsd)}</h3>
      <p className="slice-copy">
        state: {OFFER_STATE_LABEL[offer.state] ?? offer.state}
      </p>
      <p className="slice-meta">
        {offer.executionPriceUsd !== null
          ? `execution: ${formatUsd(offer.executionPriceUsd)} · `
          : ""}
        updated {formatDate(offer.updatedAt)}
      </p>

      {canAccept && (
        <form action={acceptOfferAction} className="slice-button-row">
          <input type="hidden" name="dropId" value={dropId} />
          <input type="hidden" name="offerId" value={offer.id} />
          <button type="submit" className="slice-button alt">
            accept offer
          </button>
        </form>
      )}

      {canSettle && (
        <form
          action={async (formData) => {
            setSettling(true);
            await settleOfferAction(formData);
          }}
          className="slice-button-row"
        >
          <input type="hidden" name="dropId" value={dropId} />
          <input type="hidden" name="offerId" value={offer.id} />
          <input type="hidden" name="executionPriceUsd" value={String(offer.amountUsd)} />
          <button type="submit" className="slice-button" disabled={settling}>
            {settling ? "settling..." : "settle & transfer"}
          </button>
        </form>
      )}
    </li>
  );
}

function DropOffersPanel({
  entry,
  acceptOfferAction,
  settleOfferAction
}: {
  entry: DropWithOffers;
  acceptOfferAction: (formData: FormData) => Promise<void>;
  settleOfferAction: (formData: FormData) => Promise<void>;
}) {
  const { drop, listing, offers } = entry;
  const activeOffers = offers.filter(
    (o) => o.state !== "expired" && o.state !== "withdrawn" && o.state !== "settled"
  );
  const settledOffers = offers.filter((o) => o.state === "settled");

  return (
    <section className="slice-panel" data-testid="workshop-drop-offers-panel">
      <div className="slice-button-row" style={{ justifyContent: "space-between" }}>
        <div>
          <p className="slice-label">{drop.worldLabel}</p>
          <h3 className="slice-title">{drop.title}</h3>
        </div>
        <Link href={routes.dropOffers(drop.id)} className="slice-button ghost">
          full timeline
        </Link>
      </div>

      {listing && (
        <p className="slice-meta">
          {listing.listingType} · asking {formatUsd(listing.priceUsd)}
          {listing.highestOfferUsd !== null
            ? ` · highest: ${formatUsd(listing.highestOfferUsd)}`
            : ""}
          {" · "}{listing.offerCount} offer{listing.offerCount !== 1 ? "s" : ""}
        </p>
      )}

      {activeOffers.length > 0 && (
        <>
          <p className="slice-label">active offers ({activeOffers.length})</p>
          <ul className="slice-grid" aria-label="active offers">
            {activeOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                dropId={drop.id}
                acceptOfferAction={acceptOfferAction}
                settleOfferAction={settleOfferAction}
              />
            ))}
          </ul>
        </>
      )}

      {settledOffers.length > 0 && (
        <>
          <p className="slice-label">settled ({settledOffers.length})</p>
          <ul className="slice-grid" aria-label="settled offers">
            {settledOffers.map((offer) => (
              <li key={offer.id} className="slice-drop-card">
                <p className="slice-label">{offer.actorHandle}</p>
                <h3 className="slice-title">{formatUsd(offer.amountUsd)}</h3>
                <p className="slice-copy">settled</p>
                {offer.executionPriceUsd !== null && (
                  <p className="slice-meta">
                    execution: {formatUsd(offer.executionPriceUsd)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {activeOffers.length === 0 && settledOffers.length === 0 && (
        <p className="slice-copy">no offers on this drop yet.</p>
      )}
    </section>
  );
}

export function WorkshopOffersScreen({
  session,
  dropsWithOffers,
  notice,
  acceptOfferAction,
  settleOfferAction
}: WorkshopOffersScreenProps) {
  const dropsWithActivity = dropsWithOffers.filter(
    (entry) => entry.offers.length > 0
  );
  const totalActiveOffers = dropsWithOffers.reduce(
    (sum, entry) =>
      sum +
      entry.offers.filter(
        (o) => o.state !== "expired" && o.state !== "withdrawn" && o.state !== "settled"
      ).length,
    0
  );

  return (
    <AppShell
      title="offer management"
      subtitle={`${totalActiveOffers} active offer${totalActiveOffers !== 1 ? "s" : ""} across ${dropsWithActivity.length} drop${dropsWithActivity.length !== 1 ? "s" : ""}`}
      session={session}
      activeNav="workshop"
    >
      {notice && (
        <section className="slice-panel" role="status">
          <p className="slice-copy">{notice}</p>
        </section>
      )}

      <section className="slice-panel">
        <div className="slice-button-row">
          <Link href={routes.workshop()} className="slice-button ghost">
            back to workshop
          </Link>
          <Link href={routes.collect()} className="slice-button ghost">
            marketplace
          </Link>
        </div>
      </section>

      {dropsWithActivity.length === 0 ? (
        <section className="slice-panel">
          <p className="slice-copy">
            no incoming offers on your drops yet. offers will appear here when
            collectors submit bids on your resale and auction listings.
          </p>
        </section>
      ) : (
        dropsWithActivity.map((entry) => (
          <DropOffersPanel
            key={entry.drop.id}
            entry={entry}
            acceptOfferAction={acceptOfferAction}
            settleOfferAction={settleOfferAction}
          />
        ))
      )}
    </AppShell>
  );
}
