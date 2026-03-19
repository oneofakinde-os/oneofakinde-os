import { requireRequestSession } from "@/lib/bff/auth";
import type { CollectInventoryResponse } from "@/lib/bff/contracts";
import { ok } from "@/lib/bff/http";
import { parseCollectMarketLane } from "@/lib/collect/market-lanes";
import { commerceBffService } from "@/lib/bff/service";

const COLLECT_MARKET_AVAILABLE_LANES = ["all", "sale", "auction", "resale"] as const;

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const requestedLane = url.searchParams.get("lane");
  const lane = parseCollectMarketLane(requestedLane);
  const inventory = await commerceBffService.getCollectInventory(guard.session.accountId, lane);

  return ok<CollectInventoryResponse>({
    lane: inventory.lane,
    laneMetadata: {
      requestedLane,
      resolvedLane: inventory.lane,
      availableLanes: [...COLLECT_MARKET_AVAILABLE_LANES],
      totalListings: inventory.listings.length,
      generatedAt: new Date().toISOString()
    },
    listings: inventory.listings
  });
}
