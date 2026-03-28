import { getRequestSession } from "@/lib/bff/auth";
import { getRequiredRouteParam, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type Params = { handle: string };

/**
 * GET /api/v1/studios/:handle/patron-indicator
 *
 * Returns the viewer's patron indicator for the given studio, or null
 * if the viewer is not a patron.
 */
export async function GET(request: Request, context: RouteContext<Params>) {
  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return ok({ indicator: null });
  }

  const session = await getRequestSession(request);
  if (!session) {
    return ok({ indicator: null });
  }

  const indicator = await commerceBffService.getViewerPatronIndicator(
    session.accountId,
    handle
  );
  return ok({ indicator });
}
