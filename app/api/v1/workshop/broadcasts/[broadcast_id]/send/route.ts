/**
 * POST /api/v1/workshop/broadcasts/[broadcast_id]/send — deliver a broadcast.
 *
 * Sprint 6 — resolves the audience and emits in-app notifications.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type SendRouteParams = {
  broadcast_id: string;
};

export async function POST(request: Request, context: RouteContext<SendRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const broadcastId = await getRequiredRouteParam(context, "broadcast_id");
  if (!broadcastId) return notFound("broadcast not found");

  const broadcast = await commerceBffService.sendBroadcast(guard.session.accountId, broadcastId);
  if (!broadcast) return notFound("broadcast not found");

  if (broadcast.status === "failed") {
    return badRequest("broadcast rate limit reached — try again later");
  }

  return ok({ broadcast });
}
