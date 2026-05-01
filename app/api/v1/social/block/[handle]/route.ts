/**
 * POST /api/v1/social/block/:handle
 *
 * Toggles a block on the target handle. The body is empty — the route is
 * purely action-on-resource. Returns `{ blocked: boolean }` so the caller
 * can update its UI state without a separate read.
 *
 * 404 — target handle not found
 * 400 — self-block attempt
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type BlockRouteParams = { handle: string };

export async function POST(request: Request, context: RouteContext<BlockRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return notFound("handle is required");
  }

  if (handle === guard.session.handle) {
    return badRequest("cannot block your own account");
  }

  const result = await commerceBffService.toggleBlock(guard.session.accountId, handle);
  if (!result) {
    return notFound("account not found");
  }

  return ok({ blocked: result.blocked });
}
