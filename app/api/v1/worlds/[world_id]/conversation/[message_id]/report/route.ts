import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type WorldConversationMessageRouteParams = {
  world_id: string;
  message_id: string;
};

export async function POST(
  request: Request,
  context: RouteContext<WorldConversationMessageRouteParams>
) {
  const worldId = await getRequiredRouteParam(context, "world_id");
  const messageId = await getRequiredRouteParam(context, "message_id");
  if (!worldId || !messageId) {
    return notFound("message not found");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const thread = await commerceBffService.reportWorldConversationMessage(
    guard.session.accountId,
    worldId,
    messageId
  );
  if (!thread.ok) {
    return thread.reason === "not_found"
      ? notFound("message not found")
      : forbidden("not allowed to report this message");
  }

  return ok({ thread: thread.thread }, 201);
}

