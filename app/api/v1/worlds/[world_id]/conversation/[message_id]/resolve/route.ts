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
import type { WorldConversationModerationResolution } from "@/lib/domain/contracts";
import { commerceBffService } from "@/lib/bff/service";

type WorldConversationMessageRouteParams = {
  world_id: string;
  message_id: string;
};

type ResolveWorldConversationBody = {
  resolution?: string;
};

const VALID_RESOLUTIONS = new Set<WorldConversationModerationResolution>([
  "hide",
  "restrict",
  "delete",
  "restore",
  "dismiss"
]);

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

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const payload = await safeJson<ResolveWorldConversationBody>(request);
  const resolution = getRequiredBodyString(payload as Record<string, unknown> | null, "resolution");
  if (!resolution || !VALID_RESOLUTIONS.has(resolution as WorldConversationModerationResolution)) {
    return badRequest("resolution must be one of: hide, restrict, delete, restore, dismiss");
  }

  const thread = await commerceBffService.resolveWorldConversationModeration(
    guard.session.accountId,
    worldId,
    messageId,
    resolution as WorldConversationModerationResolution
  );
  if (!thread.ok) {
    if (thread.reason === "not_found") {
      return notFound("message not found");
    }
    if (thread.reason === "invalid") {
      return badRequest("invalid moderation resolution");
    }
    return forbidden("not allowed to resolve this world conversation message");
  }

  return ok({ thread: thread.thread });
}

