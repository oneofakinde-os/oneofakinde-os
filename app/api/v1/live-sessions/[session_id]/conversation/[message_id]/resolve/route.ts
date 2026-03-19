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
import type { LiveSessionConversationModerationResolution } from "@/lib/domain/contracts";
import { commerceBffService } from "@/lib/bff/service";

type LiveSessionConversationMessageRouteParams = {
  session_id: string;
  message_id: string;
};

type ResolveLiveSessionConversationBody = {
  resolution?: string;
};

const VALID_RESOLUTIONS = new Set<LiveSessionConversationModerationResolution>([
  "hide",
  "restrict",
  "delete",
  "restore",
  "dismiss"
]);

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

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const payload = await safeJson<ResolveLiveSessionConversationBody>(request);
  const resolution = getRequiredBodyString(payload as Record<string, unknown> | null, "resolution");
  if (
    !resolution ||
    !VALID_RESOLUTIONS.has(resolution as LiveSessionConversationModerationResolution)
  ) {
    return badRequest("resolution must be one of: hide, restrict, delete, restore, dismiss");
  }

  const thread = await commerceBffService.resolveLiveSessionConversationModeration(
    guard.session.accountId,
    liveSessionId,
    messageId,
    resolution as LiveSessionConversationModerationResolution
  );
  if (!thread.ok) {
    if (thread.reason === "not_found") {
      return notFound("message not found");
    }
    if (thread.reason === "invalid") {
      return badRequest("invalid moderation resolution");
    }
    return forbidden("not allowed to resolve this live session conversation message");
  }

  return ok({ thread: thread.thread });
}
