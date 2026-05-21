import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, getRequiredRouteParam, notFound, ok, safeJson, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import { isReportCategory } from "@/lib/domain/social-engagement";

type MessageReportRouteParams = {
  thread_id: string;
  message_id: string;
};

type MessageReportBody = {
  category?: string;
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

  const payload = await safeJson<MessageReportBody>(request);
  const category = isReportCategory(payload?.category) ? payload.category : undefined;

  const result = await commerceBffService.reportMessage(
    guard.session.accountId,
    threadId,
    messageId,
    category
  );
  if (!result.ok) {
    return result.reason === "not_found"
      ? notFound("message not found")
      : forbidden("not allowed to report this message");
  }

  return ok({ thread: result.thread }, 201);
}
