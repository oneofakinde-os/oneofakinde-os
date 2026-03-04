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

type WorldConversationRouteParams = {
  world_id: string;
};

type CreateWorldConversationMessageBody = {
  body?: string;
};

export async function GET(
  request: Request,
  context: RouteContext<WorldConversationRouteParams>
) {
  const worldId = await getRequiredRouteParam(context, "world_id");
  if (!worldId) {
    return badRequest("world_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const thread = await commerceBffService.getWorldConversationThread(
    guard.session.accountId,
    worldId
  );
  if (!thread.ok) {
    return thread.reason === "not_found"
      ? notFound("world not found")
      : forbidden("world membership or collect entitlement is required");
  }

  return ok({
    thread: thread.thread
  });
}

export async function POST(
  request: Request,
  context: RouteContext<WorldConversationRouteParams>
) {
  const worldId = await getRequiredRouteParam(context, "world_id");
  if (!worldId) {
    return badRequest("world_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await safeJson<CreateWorldConversationMessageBody>(request);
  const body = getRequiredBodyString(payload as Record<string, unknown> | null, "body");
  if (!body) {
    return badRequest("message body is required");
  }

  const thread = await commerceBffService.addWorldConversationMessage(
    guard.session.accountId,
    worldId,
    body
  );
  if (!thread.ok) {
    if (thread.reason === "not_found") {
      return notFound("world not found");
    }
    if (thread.reason === "invalid") {
      return badRequest("message body is required");
    }
    return forbidden("world membership or collect entitlement is required");
  }

  return ok({
    thread: thread.thread
  }, 201);
}

