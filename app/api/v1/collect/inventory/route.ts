import { requireRequestSession } from "@/lib/bff/auth";
import type { CollectInventoryResponse } from "@/lib/bff/contracts";
import { ok } from "@/lib/bff/http";
import { parseCollectMarketLane } from "@/lib/collect/market-lanes";
import { commerceBffService } from "@/lib/bff/service";
import { isFeatureEnabled } from "@/lib/ops/feature-flags";

const COLLECT_MARKET_AVAILABLE_LANES = ["all", "sale", "auction", "resale"] as const;
const COLLECT_MARKET_AVAILABLE_LANES_WITHOUT_RESALE = ["all", "sale", "auction"] as const;

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const requestedLane = url.searchParams.get("lane");
  const lane = parseCollectMarketLane(requestedLane);
  const resaleEnabled = isFeatureEnabled("ff_resale_marketplace");

  if (!resaleEnabled && lane === "resale") {
    return ok<CollectInventoryResponse>({
      lane,
      laneMetadata: {
        requestedLane,
        resolvedLane: lane,
        availableLanes: [...COLLECT_MARKET_AVAILABLE_LANES_WITHOUT_RESALE],
        totalListings: 0,
        generatedAt: new Date().toISOString()
      },
      listings: []
    });
  }

  const inventory = await commerceBffService.getCollectInventory(guard.session.accountId, lane);
  const listings = resaleEnabled
    ? inventory.listings
    : inventory.listings.filter((listing) => listing.listingType !== "resale");

  return ok<CollectInventoryResponse>({
    lane: inventory.lane,
    laneMetadata: {
      requestedLane,
      resolvedLane: inventory.lane,
      availableLanes: [
        ...(resaleEnabled ? COLLECT_MARKET_AVAILABLE_LANES : COLLECT_MARKET_AVAILABLE_LANES_WITHOUT_RESALE)
      ],
      totalListings: listings.length,
      generatedAt: new Date().toISOString()
    },
    listings
  });
}
