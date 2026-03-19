import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredRouteParam, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type CollectWorldBundlesRouteParams = {
  world_id: string;
};

export async function GET(
  request: Request,
  context: RouteContext<CollectWorldBundlesRouteParams>
) {
  const worldId = await getRequiredRouteParam(context, "world_id");
  if (!worldId) {
    return badRequest("world_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const snapshot = await commerceBffService.getCollectWorldBundlesForWorld(
    guard.session.accountId,
    worldId
  );

  if (!snapshot) {
    return badRequest("world collect bundles not found");
  }

  return ok({
    snapshot
  });
}
