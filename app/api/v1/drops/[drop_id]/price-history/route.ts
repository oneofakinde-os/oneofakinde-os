import { commerceBffService } from "@/lib/bff/service";
import {
  badRequest,
  getRequiredRouteParam,
  notFound,
  ok,
  type RouteContext
} from "@/lib/bff/http";

type Params = {
  drop_id: string;
};

type PriceHistoryEvent = {
  timestamp: string;
  priceUsd: number;
  event: "listed" | "resale_listed" | "offer" | "settled";
};

function offerStateToEvent(state: string): PriceHistoryEvent["event"] {
  if (state === "settled") return "settled";
  if (state === "listed") return "resale_listed";
  return "offer";
}

export async function GET(_request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  const offersData = await commerceBffService.getCollectDropOffers(dropId, null);
  if (!offersData) {
    return notFound("drop not found");
  }

  const history: PriceHistoryEvent[] = [];

  // First entry: original listing price
  const drop = offersData.listing.drop;
  history.push({
    timestamp: drop.releaseDate
      ? `${drop.releaseDate}T00:00:00.000Z`
      : new Date().toISOString(),
    priceUsd: drop.priceUsd,
    event: "listed"
  });

  // Subsequent entries from offers
  for (const offer of offersData.offers) {
    history.push({
      timestamp: offer.updatedAt,
      priceUsd: offer.amountUsd,
      event: offerStateToEvent(offer.state)
    });
  }

  // Sort chronologically
  history.sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
  );

  return ok({ dropId, history });
}
