import { requireRequestSession } from "@/lib/bff/auth";
import {
  badRequest,
  conflict,
  forbidden,
  getRequiredRouteParam,
  notFound,
  ok,
  type RouteContext
} from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import { emitOperationalEvent } from "@/lib/ops/observability";
import { NextResponse } from "next/server";

type LiveSessionJoinRouteParams = {
  session_id: string;
};

function gone(message: string): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status: 410 });
}

export async function POST(
  request: Request,
  context: RouteContext<LiveSessionJoinRouteParams>
) {
  const liveSessionId = await getRequiredRouteParam(context, "session_id");
  if (!liveSessionId) {
    return badRequest("session_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("collector")) {
    return forbidden("collector role is required");
  }

  const issued = await commerceBffService.issueLiveSessionJoinToken(
    guard.session.accountId,
    liveSessionId
  );

  if (!issued.ok) {
    emitOperationalEvent("live_session_join_denied", {
      accountId: guard.session.accountId,
      liveSessionId,
      reason: issued.reason
    });

    if (issued.reason === "not_found") {
      return notFound("live session not found");
    }

    if (issued.reason === "window_closed") {
      return gone("exclusive window closed");
    }

    if (issued.reason === "drop_unavailable") {
      return conflict("live session has no collectible drop");
    }

    if (issued.reason === "at_capacity") {
      return conflict("live session is at capacity");
    }

    return forbidden("live session eligibility required");
  }

  emitOperationalEvent("live_session_join_issued", {
    accountId: guard.session.accountId,
    liveSessionId,
    expiresAt: issued.result.expiresAt
  });

  return ok({
    sessionId: issued.result.sessionId,
    joinToken: issued.result.joinToken
  });
}
