import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Drop, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import type { Route } from "next";
import Link from "next/link";

type CollectMarketplaceScreenProps = {
  session: Session;
  drops: Drop[];
  initialLane?: MarketLane;
};

type MarketListingType = "sale" | "auction" | "resale";
type MarketLane = "all" | MarketListingType;

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

const LANE_LABELS: Record<MarketLane, string> = {
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

function laneHref(lane: MarketLane): Route {
  if (lane === "all") {
    return routes.collect();
  }

  return (`${routes.collect()}?lane=${encodeURIComponent(lane)}` as Route);
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

export function CollectMarketplaceScreen({
  session,
  drops,
  initialLane = "all"
}: CollectMarketplaceScreenProps) {
  const listings: MarketplaceListing[] = drops.slice(0, 18).map((drop, index) => {
    const type = resolveListingType(index);
    return {
      drop,
      type,
      priceUsd: resolveMarketPrice(drop, type)
    };
  });

  const sales = listings.filter((listing) => listing.type === "sale");
  const auctions = listings.filter((listing) => listing.type === "auction");
  const resales = listings.filter((listing) => listing.type === "resale");

  const sections: Array<{ key: MarketListingType; items: MarketplaceListing[] }> = [
    { key: "sale", items: sales },
    { key: "auction", items: auctions },
    { key: "resale", items: resales }
  ];

  const visibleSections =
    initialLane === "all" ? sections : sections.filter((section) => section.key === initialLane);

  return (
    <AppShell
      title="collect"
      subtitle="marketplace for sale, auction, and resale drops"
      session={session}
      activeNav="collect"
    >
      <section className="slice-panel">
        <p className="slice-label">marketplace lanes</p>
        <p className="slice-copy">collect routes only to market inventory: for sale, auction, and resale.</p>

        <div className="slice-row">
          <p className="slice-total">
            {sales.length} sale · {auctions.length} auction · {resales.length} resale
          </p>
          <Link href={routes.myCollection()} className="slice-button ghost">
            my collection
          </Link>
        </div>

        <div className="slice-nav-grid" aria-label="collect lane filters">
          {(Object.keys(LANE_LABELS) as MarketLane[]).map((lane) => (
            <Link
              key={lane}
              href={laneHref(lane)}
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
