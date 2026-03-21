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

type SentimentLevel = "cold" | "warm" | "hot" | "on_fire";

function resolveSentiment(score: number): SentimentLevel {
  if (score >= 76) return "on_fire";
  if (score >= 51) return "hot";
  if (score >= 26) return "warm";
  return "cold";
}

export async function GET(_request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  // Check that the drop exists via offers endpoint
  const offersData = await commerceBffService.getCollectDropOffers(dropId, null);
  if (!offersData) {
    return notFound("drop not found");
  }

  // Social signals
  const socialSnapshot = await commerceBffService.getTownhallSocialSnapshot(null, [dropId]);
  const social = socialSnapshot.byDropId[dropId];
  const likes = social?.likeCount ?? 0;
  const comments = social?.commentCount ?? 0;

  // Collect velocity: count of ownerships for this drop
  // We approximate via offer count from the listing
  const resaleOffers = offersData.offers.length;

  // Collection count - use the offer count as a proxy for market activity
  // The listing's offerCount tracks total offers which correlates with collection interest
  const collections = offersData.listing.offerCount;

  // Score computation:
  // likes (max 25 points), comments (max 25 points), collections (max 25 points), resale activity (max 25 points)
  const likeScore = Math.min(25, likes * 5);
  const commentScore = Math.min(25, comments * 5);
  const collectionScore = Math.min(25, collections * 10);
  const resaleScore = Math.min(25, resaleOffers * 8);
  const score = Math.min(100, likeScore + commentScore + collectionScore + resaleScore);

  const sentiment = resolveSentiment(score);

  return ok({
    dropId,
    sentiment,
    signals: {
      likes,
      comments,
      collections,
      resaleOffers
    },
    score
  });
}
