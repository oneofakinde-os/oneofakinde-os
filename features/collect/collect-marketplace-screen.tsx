import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type {
  CollectLiveSessionSnapshot,
  CollectMarketLane,
  Drop,
  MembershipEntitlement,
  Session
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import type { Route } from "next";
import Link from "next/link";

type CollectMarketplaceScreenProps = {
  session: Session;
  drops: Drop[];
  memberships?: MembershipEntitlement[];
  liveSessions?: CollectLiveSessionSnapshot[];
  initialLane?: CollectMarketLane;
  focusDropId?: string | null;
};

type MarketListingType = Exclude<CollectMarketLane, "all">;

type MarketplaceListing = {
  drop: Drop;
  type: MarketListingType;
  priceUsd: number;
};

const LISTING_COPY: Record<
  MarketListingType,
  {
    label: string;
    ctaLabel: string;
  }
> = {
  sale: {
    label: "for sale",
    ctaLabel: "collect"
  },
  auction: {
    label: "auction",
    ctaLabel: "collect"
  },
  resale: {
    label: "resale",
    ctaLabel: "collect"
  }
};

const LANE_LABELS: Record<CollectMarketLane, string> = {
  all: "all",
  sale: "sale",
  auction: "auction",
  resale: "resale"
};

function resolveListingType(index: number): MarketListingType {
  const cycle: MarketListingType[] = ["sale", "auction", "resale"];
  return cycle[index % cycle.length] ?? "sale";
}

function resolveMarketPrice(drop: Drop, type: MarketListingType): number {
  if (type === "auction") return Number((drop.priceUsd * 1.08).toFixed(2));
  if (type === "resale") return Number((drop.priceUsd * 1.15).toFixed(2));
  return drop.priceUsd;
}

function resolvePrimaryHref(type: MarketListingType, dropId: string): Route {
  if (type === "auction") {
    return (`${routes.collect()}?lane=auction&drop=${encodeURIComponent(dropId)}` as Route);
  }

  if (type === "resale") {
    return (`${routes.collect()}?lane=resale&drop=${encodeURIComponent(dropId)}` as Route);
  }

  return routes.collectDrop(dropId);
}

function laneHref(lane: CollectMarketLane, focusDropId: string | null): Route {
  const params = new URLSearchParams();
  if (lane !== "all") {
    params.set("lane", lane);
  }
  if (focusDropId) {
    params.set("drop", focusDropId);
  }
  const query = params.toString();
  return query.length > 0 ? (`${routes.collect()}?${query}` as Route) : routes.collect();
}

function sectionTitle(type: MarketListingType): string {
  if (type === "sale") return "for sale";
  if (type === "auction") return "auctions";
  return "resale";
}

function sectionPriceLabel(type: MarketListingType, priceUsd: number): string {
  if (type === "auction") return `current bid ${formatUsd(priceUsd)}`;
  if (type === "resale") return `ask ${formatUsd(priceUsd)}`;
  return formatUsd(priceUsd);
}

function prioritizeFocusListing(
  listings: MarketplaceListing[],
  focusDropId: string | null
): MarketplaceListing[] {
  if (!focusDropId) {
    return listings;
  }
  const focusIndex = listings.findIndex((listing) => listing.drop.id === focusDropId);
  if (focusIndex <= 0) {
    return listings;
  }
  const prioritized = [...listings];
  const [focused] = prioritized.splice(focusIndex, 1);
  if (!focused) {
    return listings;
  }
  prioritized.unshift(focused);
  return prioritized;
}

function resolveMembershipHref(entitlement: MembershipEntitlement): Route {
  if (entitlement.worldId) {
    return routes.world(entitlement.worldId);
  }
  return routes.studio(entitlement.studioHandle);
}

function resolveLiveOpportunityHref(snapshot: CollectLiveSessionSnapshot): Route {
  if (snapshot.liveSession.dropId) {
    return routes.drop(snapshot.liveSession.dropId);
  }
  if (snapshot.liveSession.worldId) {
    return routes.world(snapshot.liveSession.worldId);
  }
  return routes.collect();
}

function eligibilityLabel(entry: CollectLiveSessionSnapshot): string {
  if (entry.eligibility.eligible) {
    return "eligible now";
  }
  return entry.eligibility.reason.replace(/_/g, " ");
}

export function CollectMarketplaceScreen({
  session,
  drops,
  memberships = [],
  liveSessions = [],
  initialLane = "all",
  focusDropId = null
}: CollectMarketplaceScreenProps) {
  const listings = prioritizeFocusListing(
    drops.slice(0, 18).map((drop, index) => {
      const type = resolveListingType(index);
      return {
        drop,
        type,
        priceUsd: resolveMarketPrice(drop, type)
      };
    }),
    focusDropId
  );

  const sales = listings.filter((listing) => listing.type === "sale");
  const auctions = listings.filter((listing) => listing.type === "auction");
  const resales = listings.filter((listing) => listing.type === "resale");
  const focusedListing = focusDropId ? listings.find((listing) => listing.drop.id === focusDropId) ?? null : null;

  const sections: Array<{ key: MarketListingType; items: MarketplaceListing[] }> = [
    { key: "sale", items: sales },
    { key: "auction", items: auctions },
    { key: "resale", items: resales }
  ];

  const visibleSections =
    initialLane === "all" ? sections : sections.filter((section) => section.key === initialLane);

  const activeMemberships = memberships.filter((entry) => entry.isActive).slice(0, 4);
  const preferredLiveOpportunities = liveSessions.filter((entry) => entry.eligibility.eligible);
  const visibleLiveOpportunities =
    (preferredLiveOpportunities.length > 0 ? preferredLiveOpportunities : liveSessions).slice(0, 4);

  return (
    <AppShell
      title="collect"
      subtitle="marketplace for sale, auction, resale, membership, and live-linked opportunities"
      session={session}
      activeNav="collect"
    >
      <section className="slice-panel" data-testid="collect-opportunity-panel">
        <p className="slice-label">membership + live opportunities</p>
        <p className="slice-copy">
          collect market now includes membership and live-linked opportunities alongside sale, auction, and resale
          lanes.
        </p>
        <p className="slice-total">
          {activeMemberships.length} active memberships · {preferredLiveOpportunities.length} eligible live sessions
        </p>

        <div className="slice-grid">
          <article className="slice-drop-card" data-testid="collect-membership-opportunities">
            <p className="slice-label">membership opportunities</p>
            <h2 className="slice-title">active access</h2>
            {activeMemberships.length === 0 ? (
              <p className="slice-copy">no active memberships found for this account.</p>
            ) : (
              <ul className="slice-list">
                {activeMemberships.map((entry) => (
                  <li key={entry.id}>
                    <Link href={resolveMembershipHref(entry)} className="slice-link">
                      {entry.worldId ? `world ${entry.worldId}` : `studio ${entry.studioHandle}`}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="slice-drop-card" data-testid="collect-live-opportunities">
            <p className="slice-label">live-linked opportunities</p>
            <h2 className="slice-title">session windows</h2>
            {visibleLiveOpportunities.length === 0 ? (
              <p className="slice-copy">no live session opportunities are available right now.</p>
            ) : (
              <ul className="slice-list">
                {visibleLiveOpportunities.map((entry) => (
                  <li key={entry.liveSession.id}>
                    <Link href={resolveLiveOpportunityHref(entry)} className="slice-link">
                      {entry.liveSession.title}
                    </Link>
                    <span className="slice-meta"> · {eligibilityLabel(entry)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">marketplace lanes</p>
        <p className="slice-copy">collect routes only to market inventory: for sale, auction, and resale.</p>

        <div className="slice-row">
          <p className="slice-total">
            {sales.length} sale · {auctions.length} auction · {resales.length} resale
          </p>
          <Link href={routes.collectListings()} className="slice-button ghost">
            my listings
          </Link>
          <Link href={routes.myCollection()} className="slice-button ghost">
            my collection
          </Link>
        </div>

        {focusedListing ? (
          <p className="slice-meta" data-testid="collect-focus-drop">
            focused drop · {focusedListing.drop.title}
          </p>
        ) : null}

        <div className="slice-nav-grid" aria-label="collect lane filters">
          {(Object.keys(LANE_LABELS) as CollectMarketLane[]).map((lane) => (
            <Link
              key={lane}
              href={laneHref(lane, focusDropId)}
              className={`slice-link ${initialLane === lane ? "active" : ""}`}
              aria-label={`${LANE_LABELS[lane]} lane`}
            >
              {LANE_LABELS[lane]}
            </Link>
          ))}
        </div>
      </section>

      {visibleSections.map((section) => (
        <section key={section.key} className="slice-panel">
          <p className="slice-label">{sectionTitle(section.key)}</p>
          <ul className="slice-grid" aria-label={`${section.key} listings`}>
            {section.items.map((listing) => (
              <li key={`${section.key}-${listing.drop.id}`} className="slice-drop-card">
                <p className="slice-label">{listing.drop.worldLabel}</p>
                <h2 className="slice-title">{listing.drop.title}</h2>
                <p className="slice-copy">{LISTING_COPY[listing.type].label}</p>
                <p className="slice-meta">{sectionPriceLabel(listing.type, listing.priceUsd)}</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(listing.drop.id)} className="slice-button ghost">
                    open drop
                  </Link>
                  <Link href={resolvePrimaryHref(listing.type, listing.drop.id)} className="slice-button alt">
                    {LISTING_COPY[listing.type].ctaLabel}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </AppShell>
  );
}
