import type { CatalogWorldResponse } from "@/lib/bff/contracts";
import { commerceBffService } from "@/lib/bff/service";
import { badRequest, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";

type Params = {
  world_id: string;
};

export async function GET(_request: Request, context: RouteContext<Params>) {
  const worldId = await getRequiredRouteParam(context, "world_id");
  if (!worldId) {
    return badRequest("world_id is required");
  }

  const world = await commerceBffService.getWorldById(worldId);
  if (!world) {
    return notFound("world not found");
  }

  return ok<CatalogWorldResponse>({ world });
}
