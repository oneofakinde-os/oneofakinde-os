import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredRouteParam, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type Params = { world_id: string };

export async function GET(request: Request, context: RouteContext<Params>) {
  const worldId = await getRequiredRouteParam(context, "world_id");
  if (!worldId) return badRequest("world_id is required");

  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const active = await commerceBffService.hasActiveMembership(guard.session.accountId, worldId);
  return ok({ active });
}
