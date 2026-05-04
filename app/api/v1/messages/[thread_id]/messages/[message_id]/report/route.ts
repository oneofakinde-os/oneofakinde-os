import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type MessageReportRouteParams = {
  thread_id: string;
  message_id: string;
};

export async function POST(
  request: Request,
  context: RouteContext<MessageReportRouteParams>
) {
  const threadId = await getRequiredRouteParam(context, "thread_id");
  const messageId = await getRequiredRouteParam(context, "message_id");
  if (!threadId || !messageId) {
    return notFound("message not found");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const result = await commerceBffService.reportMessage(
    guard.session.accountId,
    threadId,
    messageId
  );
  if (!result.ok) {
    return result.reason === "not_found"
      ? notFound("message not found")
      : forbidden("not allowed to report this message");
  }

  return ok({ thread: result.thread }, 201);
}
