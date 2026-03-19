import { getRequestSession } from "@/lib/bff/auth";
import type { CatalogWorldDropsResponse } from "@/lib/bff/contracts";
import { commerceBffService } from "@/lib/bff/service";
import { badRequest, getRequiredRouteParam, ok, type RouteContext } from "@/lib/bff/http";

type Params = {
  world_id: string;
};

export async function GET(request: Request, context: RouteContext<Params>) {
  const worldId = await getRequiredRouteParam(context, "world_id");
  if (!worldId) {
    return badRequest("world_id is required");
  }

  const session = await getRequestSession(request);
  const drops = await commerceBffService.listDropsByWorldId(worldId, session?.accountId ?? null);
  return ok<CatalogWorldDropsResponse>({ drops });
}
