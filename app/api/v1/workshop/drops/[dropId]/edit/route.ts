/**
 * PUT /api/v1/workshop/drops/:dropId/edit — edit a published drop
 *
 * Sprint 2A — AUTH-003: drop edit after publish with version history.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { EditDropInput } from "@/lib/domain/contracts";

type EditDropRouteParams = { dropId: string };

export async function PUT(request: Request, context: RouteContext<EditDropRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const dropId = await getRequiredRouteParam(context, "dropId");
  if (!dropId) return notFound("dropId is required");

  const body = (await request.json()) as EditDropInput;
  const result = await commerceBffService.editDrop(guard.session.accountId, dropId, body);
  if (!result) return notFound("drop not found or not owned by you");

  return ok(result);
}
