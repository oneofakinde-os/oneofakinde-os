import { commerceBffService } from "@/lib/bff/service";
import { badRequest, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";

type Params = {
  badge_id: string;
};

export async function GET(_request: Request, context: RouteContext<Params>) {
  const badgeId = await getRequiredRouteParam(context, "badge_id");
  if (!badgeId) {
    return badRequest("badge_id is required");
  }

  const badge = await commerceBffService.getReceiptBadgeById(badgeId);
  if (!badge) {
    return notFound("badge not found");
  }

  return ok({ badge });
}
