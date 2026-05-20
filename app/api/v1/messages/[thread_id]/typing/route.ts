/**
 * POST /api/v1/messages/:thread_id/typing — send a typing indicator
 *
 * Sprint 2B — MSG-014: typing indicators in DMs.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type TypingRouteParams = { thread_id: string };

export async function POST(request: Request, context: RouteContext<TypingRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const threadId = await getRequiredRouteParam(context, "thread_id");
  if (!threadId) return notFound("thread_id is required");

  const sent = await commerceBffService.sendTypingIndicator(
    guard.session.accountId,
    threadId
  );
  if (!sent) return notFound("thread not found or you are not a participant");

  return ok({ sent: true });
}
