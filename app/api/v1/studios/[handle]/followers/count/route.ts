import { getRequiredRouteParam, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type Params = { handle: string };

/**
 * GET /api/v1/studios/:handle/followers/count
 *
 * Returns the follower count for the given studio. Public endpoint.
 */
export async function GET(_request: Request, context: RouteContext<Params>) {
  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return ok({ count: 0 });
  }

  const count = await commerceBffService.getStudioFollowerCount(handle);
  return ok({ count });
}
