import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { checkRateLimit, RATE_LIMITS } from "@/lib/bff/rate-limit";
import { commerceBffService } from "@/lib/bff/service";

type Params = {
  drop_id: string;
};

export async function POST(request: Request, context: RouteContext<Params>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rate = checkRateLimit(request, RATE_LIMITS.mutation, "saves:drops:post", guard.session.accountId);
  if (!rate.ok) return rate.response;

  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) return badRequest("drop_id is required");

  const savedIntent = await commerceBffService.addSavedIntent(guard.session.accountId, dropId);
  if (!savedIntent) return notFound("drop not found");

  return ok({ savedIntent }, 201);
}

export async function DELETE(request: Request, context: RouteContext<Params>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rate = checkRateLimit(request, RATE_LIMITS.mutation, "saves:drops:delete", guard.session.accountId);
  if (!rate.ok) return rate.response;

  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) return badRequest("drop_id is required");

  await commerceBffService.removeSavedIntent(guard.session.accountId, dropId);
  return ok({ removed: true });
}
