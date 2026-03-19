import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type LiveSessionConversationMessageRouteParams = {
  session_id: string;
  message_id: string;
};

export async function POST(
  request: Request,
  context: RouteContext<LiveSessionConversationMessageRouteParams>
) {
  const liveSessionId = await getRequiredRouteParam(context, "session_id");
  const messageId = await getRequiredRouteParam(context, "message_id");
  if (!liveSessionId || !messageId) {
    return notFound("message not found");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const thread = await commerceBffService.appealLiveSessionConversationMessage(
    guard.session.accountId,
    liveSessionId,
    messageId
  );
  if (!thread.ok) {
    return thread.reason === "not_found"
      ? notFound("message not found")
      : forbidden("not allowed to appeal this message");
  }

  return ok({ thread: thread.thread }, 201);
}
