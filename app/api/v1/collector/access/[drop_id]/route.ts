import { requireRequestSession } from "@/lib/bff/auth";
import { getRequiredRouteParam, notFound, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { RouteContext } from "@/lib/bff/http";

type AccessRouteParams = { drop_id: string };

export async function GET(
  request: Request,
  context: RouteContext<AccessRouteParams>
) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) return notFound("drop not found");

  const canAccess = await commerceBffService.canAccessCollectorOnlyContent(
    guard.session.accountId,
    dropId
  );
  return ok({ canAccess, dropId });
}
