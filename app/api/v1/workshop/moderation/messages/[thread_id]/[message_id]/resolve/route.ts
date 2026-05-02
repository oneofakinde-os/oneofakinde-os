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
import type { MessageModerationResolution } from "@/lib/domain/contracts";

type MessageModerationResolveRouteParams = {
  thread_id: string;
  message_id: string;
};

type MessageModerationResolveBody = {
  resolution?: string;
};

const VALID_RESOLUTIONS = new Set<MessageModerationResolution>([
  "hide",
  "restrict",
  "delete",
  "restore",
  "dismiss"
]);

export async function POST(
  request: Request,
  context: RouteContext<MessageModerationResolveRouteParams>
) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const threadId = await getRequiredRouteParam(context, "thread_id");
  const messageId = await getRequiredRouteParam(context, "message_id");
  if (!threadId || !messageId) {
    return notFound("moderation case not found");
  }

  const payload = await safeJson<MessageModerationResolveBody>(request);
  const resolutionInput = getRequiredBodyString(payload as Record<string, unknown> | null, "resolution");
  if (!resolutionInput || !VALID_RESOLUTIONS.has(resolutionInput as MessageModerationResolution)) {
    return badRequest("resolution must be one of: hide, restrict, delete, restore, dismiss");
  }

  const result = await commerceBffService.resolveMessageModerationCase(
    guard.session.accountId,
    threadId,
    messageId,
    resolutionInput as MessageModerationResolution
  );

  if (!result.ok) {
    return result.reason === "forbidden"
      ? forbidden("not allowed to resolve this moderation case")
      : notFound("moderation case not found");
  }

  return ok(result);
}
