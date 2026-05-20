/**
 * DELETE /api/v1/workshop/drafts/:draftId — delete a draft
 *
 * Sprint 2A — AUTH-001: durable drop drafts.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type DraftRouteParams = { draftId: string };

export async function DELETE(request: Request, context: RouteContext<DraftRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const draftId = await getRequiredRouteParam(context, "draftId");
  if (!draftId) return notFound("draftId is required");

  const deleted = await commerceBffService.deleteDraft(guard.session.accountId, draftId);
  if (!deleted) return notFound("draft not found");

  return ok({ deleted: true });
}
