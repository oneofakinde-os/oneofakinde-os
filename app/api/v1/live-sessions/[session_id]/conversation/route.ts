import { requireRequestSession } from "@/lib/bff/auth";
import {
  badRequest,
  forbidden,
  getOptionalBodyString,
  getRequiredBodyString,
  getRequiredRouteParam,
  notFound,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type LiveSessionConversationRouteParams = {
  session_id: string;
};

type CreateLiveSessionConversationMessageBody = {
  body?: string;
  parentMessageId?: string;
};

export async function GET(
  request: Request,
  context: RouteContext<LiveSessionConversationRouteParams>
) {
  const liveSessionId = await getRequiredRouteParam(context, "session_id");
  if (!liveSessionId) {
    return badRequest("session_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const thread = await commerceBffService.getLiveSessionConversationThread(
    guard.session.accountId,
    liveSessionId
  );
  if (!thread.ok) {
    return thread.reason === "not_found"
      ? notFound("live session not found")
      : forbidden("live session thread requires eligibility and an active session");
  }

  return ok({
    thread: thread.thread
  });
}

export async function POST(
  request: Request,
  context: RouteContext<LiveSessionConversationRouteParams>
) {
  const liveSessionId = await getRequiredRouteParam(context, "session_id");
  if (!liveSessionId) {
    return badRequest("session_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await safeJson<CreateLiveSessionConversationMessageBody>(request);
  const payloadRecord = payload as Record<string, unknown> | null;
  const body = getRequiredBodyString(payloadRecord, "body");
  if (!body) {
    return badRequest("message body is required");
  }
  const parentMessageId = getOptionalBodyString(payloadRecord, "parentMessageId");

  const thread = await commerceBffService.addLiveSessionConversationMessage(
    guard.session.accountId,
    liveSessionId,
    body,
    parentMessageId
  );
  if (!thread.ok) {
    if (thread.reason === "not_found") {
      return notFound("live session not found");
    }
    if (thread.reason === "invalid") {
      return badRequest("message body or parentMessageId is invalid");
    }
    return forbidden("live session thread requires eligibility and an active session");
  }

  return ok(
    {
      thread: thread.thread
    },
    201
  );
}
