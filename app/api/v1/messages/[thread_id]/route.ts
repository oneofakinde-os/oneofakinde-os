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
import type { MessageThreadMutationResult } from "@/lib/domain/contracts";

type MessageThreadRouteParams = {
  thread_id: string;
};

type MessageThreadActionBody = {
  action?: string;
  body?: string;
};

function mutationResponse(result: MessageThreadMutationResult, status = 200) {
  if (result.ok) {
    return ok({ thread: result.thread }, status);
  }
  if (result.reason === "not_found") {
    return notFound("message thread not found");
  }
  if (result.reason === "blocked") {
    return forbidden("blocked");
  }
  if (result.reason === "forbidden") {
    return forbidden("message thread is not available");
  }
  return badRequest("message action is invalid");
}

/**
 * GET /api/v1/messages/:thread_id
 *
 * Returns a single authenticated message thread.
 */
export async function GET(
  request: Request,
  context: RouteContext<MessageThreadRouteParams>
) {
  const threadId = await getRequiredRouteParam(context, "thread_id");
  if (!threadId) {
    return badRequest("thread_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const thread = await commerceBffService.getMessageThread(guard.session.accountId, threadId);
  if (!thread) {
    return notFound("message thread not found");
  }

  return ok({ thread });
}

/**
 * POST /api/v1/messages/:thread_id
 *
 * Sends a message or updates request/read state.
 */
export async function POST(
  request: Request,
  context: RouteContext<MessageThreadRouteParams>
) {
  const threadId = await getRequiredRouteParam(context, "thread_id");
  if (!threadId) {
    return badRequest("thread_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await safeJson<MessageThreadActionBody>(request);
  const payloadRecord = payload as Record<string, unknown> | null;
  const action = getOptionalBodyString(payloadRecord, "action");

  if (action === "accept" || action === "decline" || action === "mark_read") {
    const result = await commerceBffService.updateMessageThreadState(
      guard.session.accountId,
      threadId,
      action
    );
    return mutationResponse(result);
  }

  const body = getRequiredBodyString(payloadRecord, "body");
  if (!body) {
    return badRequest("body or action is required");
  }

  const result = await commerceBffService.sendMessage(guard.session.accountId, threadId, body);
  return mutationResponse(result, 201);
}
