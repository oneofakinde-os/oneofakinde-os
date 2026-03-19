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

type LiveSessionConversationModerationResolveRouteParams = {
  session_id: string;
  message_id: string;
};

type LiveSessionConversationModerationResolveBody = {
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
  context: RouteContext<LiveSessionConversationModerationResolveRouteParams>
) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const liveSessionId = await getRequiredRouteParam(context, "session_id");
  const messageId = await getRequiredRouteParam(context, "message_id");
  if (!liveSessionId || !messageId) {
    return notFound("moderation case not found");
  }

  const payload = await safeJson<LiveSessionConversationModerationResolveBody>(request);
  const resolutionInput = getRequiredBodyString(payload as Record<string, unknown> | null, "resolution");
  if (
    !resolutionInput ||
    !VALID_RESOLUTIONS.has(resolutionInput as LiveSessionConversationModerationResolution)
  ) {
    return badRequest("resolution must be one of: hide, restrict, delete, restore, dismiss");
  }

  const result = await commerceBffService.resolveLiveSessionConversationModerationCase(
    guard.session.accountId,
    liveSessionId,
    messageId,
    resolutionInput as LiveSessionConversationModerationResolution
  );

  if (!result.ok) {
    return result.reason === "forbidden"
      ? forbidden("not allowed to resolve this moderation case")
      : notFound("moderation case not found");
  }

  return ok(result);
}
