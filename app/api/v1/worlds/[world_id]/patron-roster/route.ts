import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, getRequiredRouteParam, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type WorldPatronRosterRouteParams = {
  world_id: string;
};

export async function GET(
  request: Request,
  context: RouteContext<WorldPatronRosterRouteParams>
) {
  const worldId = await getRequiredRouteParam(context, "world_id");
  if (!worldId) {
    return badRequest("world_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const roster = await commerceBffService.listWorldPatronRoster(guard.session.accountId, worldId);
  if (!roster.ok) {
    if (roster.reason === "not_found") {
      return badRequest("world not found");
    }
    return forbidden(
      "world membership, collect entitlement, creator access, or active patron support is required"
    );
  }

  return ok({
    snapshot: roster.snapshot
  });
}
