import { forbidden, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";

type SaveRouteParams = {
  drop_id: string;
};

export async function POST(request: Request, context: RouteContext<SaveRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return notFound("drop not found");
  }

  // Sprint 0.2 — block enforcement: studios that blocked the viewer do not
  // accept saves from them.
  if (await commerceBffService.isViewerBlockedByDropStudio(guard.session.accountId, dropId)) {
    return forbidden("blocked");
  }

  const social = await commerceBffService.toggleTownhallSavedDrop(guard.session.accountId, dropId);
  if (!social) {
    return notFound("drop not found");
  }

  return ok({ social });
}

