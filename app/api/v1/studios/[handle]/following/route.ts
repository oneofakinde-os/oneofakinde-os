import { getRequestSession } from "@/lib/bff/auth";
import { getRequiredRouteParam, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type Params = { handle: string };

/**
 * GET /api/v1/studios/:handle/following
 *
 * Returns whether the current session user follows the given studio.
 */
export async function GET(request: Request, context: RouteContext<Params>) {
  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return ok({ following: false });
  }

  const session = await getRequestSession(request);
  if (!session) {
    return ok({ following: false });
  }

  const following = await commerceBffService.isFollowingStudio(session.accountId, handle);
  return ok({ following });
}
