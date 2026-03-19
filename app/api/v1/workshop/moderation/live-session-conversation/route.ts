import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, getRequiredSearchParam, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const url = new URL(request.url);
  const liveSessionId = getRequiredSearchParam(url, "session_id");
  const queue = await commerceBffService.listLiveSessionConversationModerationQueue(
    guard.session.accountId,
    liveSessionId
  );

  return ok({ queue });
}
