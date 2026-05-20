/**
 * POST /api/v1/workshop/drops/:dropId/delete — soft-delete a drop with cascade
 *
 * Sprint 2A — AUTH-004: drop delete with cascade.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type DeleteDropRouteParams = { dropId: string };

export async function POST(request: Request, context: RouteContext<DeleteDropRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const dropId = await getRequiredRouteParam(context, "dropId");
  if (!dropId) return notFound("dropId is required");

  const result = await commerceBffService.deleteDrop(guard.session.accountId, dropId);
  if (!result) return notFound("drop not found or not owned by you");

  return ok(result);
}
