import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredRouteParam, notFound, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { RouteContext } from "@/lib/bff/http";

type DispatchRouteParams = { dispatch_id: string };

export async function PATCH(
  request: Request,
  context: RouteContext<DispatchRouteParams>
) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const dispatchId = await getRequiredRouteParam(context, "dispatch_id");
  if (!dispatchId) return notFound("dispatch not found");

  const body = await safeJson<{ action?: string }>(request);
  if (!body?.action) return badRequest("action is required (publish or archive)");

  if (body.action === "publish") {
    const dispatch = await commerceBffService.publishStudioDispatch(
      guard.session.accountId,
      dispatchId
    );
    if (!dispatch) return notFound("dispatch not found or not in draft status");
    return ok({ dispatch });
  }

  if (body.action === "archive") {
    const dispatch = await commerceBffService.archiveStudioDispatch(
      guard.session.accountId,
      dispatchId
    );
    if (!dispatch) return notFound("dispatch not found");
    return ok({ dispatch });
  }

  return badRequest(`unknown action '${body.action}'`);
}
