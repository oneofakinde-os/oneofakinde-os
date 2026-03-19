import { getRequestSession } from "@/lib/bff/auth";
import type { CatalogStudioDropsResponse } from "@/lib/bff/contracts";
import { commerceBffService } from "@/lib/bff/service";
import { badRequest, getRequiredRouteParam, ok, type RouteContext } from "@/lib/bff/http";

type Params = {
  handle: string;
};

export async function GET(request: Request, context: RouteContext<Params>) {
  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return badRequest("handle is required");
  }

  const session = await getRequestSession(request);
  const drops = await commerceBffService.listDropsByStudioHandle(handle, session?.accountId ?? null);
  return ok<CatalogStudioDropsResponse>({ drops });
}
