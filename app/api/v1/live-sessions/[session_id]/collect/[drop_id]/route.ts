import { requireRequestSession } from "@/lib/bff/auth";
import {
  badRequest,
  forbidden,
  getRequiredBodyString,
  getRequiredRouteParam,
  notFound,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import { emitOperationalEvent } from "@/lib/ops/observability";
import { NextResponse } from "next/server";

type LiveSessionCollectRouteParams = {
  session_id: string;
  drop_id: string;
};

type LiveSessionCollectBody = {
  joinToken?: string;
};

function gone(message: string): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status: 410 });
}

export async function POST(
  request: Request,
  context: RouteContext<LiveSessionCollectRouteParams>
) {
  const liveSessionId = await getRequiredRouteParam(context, "session_id");
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!liveSessionId || !dropId) {
    return badRequest("session_id and drop_id are required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("collector")) {
    return forbidden("collector role is required");
  }

  const payload = (await safeJson<LiveSessionCollectBody>(request)) as
    | Record<string, unknown>
    | null;
  const joinToken = getRequiredBodyString(payload, "joinToken");
  if (!joinToken) {
    return badRequest("joinToken is required");
  }

  const joined = await commerceBffService.consumeLiveSessionJoinToken({
    accountId: guard.session.accountId,
    liveSessionId,
    dropId,
    joinToken
  });

  if (!joined.granted) {
    emitOperationalEvent("live_session_collect_denied", {
      accountId: guard.session.accountId,
      liveSessionId,
      dropId,
      reason: joined.reason
    });

    if (joined.reason === "not_found") {
      return notFound("live session not found");
    }

    if (joined.reason === "window_closed") {
      return gone("exclusive window closed");
    }

    return forbidden("valid live session join token required");
  }

  const receipt = await commerceBffService.purchaseDropViaLiveSession(
    guard.session.accountId,
    dropId,
    liveSessionId
  );
  if (!receipt) {
    return notFound("drop not found");
  }

  emitOperationalEvent("live_session_collect_completed", {
    accountId: guard.session.accountId,
    liveSessionId,
    dropId,
    receiptId: receipt.id,
    receiptStatus: receipt.status
  });

  return ok({
    sessionId: liveSessionId,
    dropId,
    receipt
  });
}
