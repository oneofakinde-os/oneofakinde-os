import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import {
  badRequest,
  forbidden,
  getRequiredRouteParam,
  ok,
  type RouteContext
} from "@/lib/bff/http";
import { emitOperationalEvent } from "@/lib/ops/observability";

type Params = {
  id: string;
};

export async function POST(request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const watchSession = await commerceBffService.startWatchSession(
    guard.session.accountId,
    dropId
  );
  if (!watchSession) {
    emitOperationalEvent("watch_session_start_denied", {
      accountId: guard.session.accountId,
      dropId
    });
    return forbidden("watch entitlement required");
  }

  emitOperationalEvent("watch_session_started", {
    accountId: guard.session.accountId,
    dropId,
    watchSessionId: watchSession.id
  });

  return ok({ watchSession }, 201);
}
