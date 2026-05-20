/**
 * POST /api/v1/social/restrict/:handle
 *
 * Sprint 1 — SOC-019: toggles shadow-restrict on the target handle.
 * Returns `{ restricted: boolean }`.
 *
 * 404 — target handle not found
 * 400 — self-restrict attempt
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type RestrictRouteParams = { handle: string };

export async function POST(request: Request, context: RouteContext<RestrictRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return notFound("handle is required");
  }

  if (handle === guard.session.handle) {
    return badRequest("cannot restrict your own account");
  }

  const result = await commerceBffService.toggleRestriction(guard.session.accountId, handle);
  if (!result) {
    return notFound("account not found");
  }

  return ok({ restricted: result.restricted });
}
