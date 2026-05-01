/**
 * POST /api/v1/social/mute/:handle
 *
 * Toggles a mute on the target handle. Mute is visibility-only: the muted
 * account can still interact with the muter's drops/comments — those
 * actions just aren't visible to the muter's view.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type MuteRouteParams = { handle: string };

export async function POST(request: Request, context: RouteContext<MuteRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return notFound("handle is required");
  }

  if (handle === guard.session.handle) {
    return badRequest("cannot mute your own account");
  }

  const result = await commerceBffService.toggleMute(guard.session.accountId, handle);
  if (!result) {
    return notFound("account not found");
  }

  return ok({ muted: result.muted });
}
