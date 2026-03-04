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

type WorldConversationModerationResolveRouteParams = {
  world_id: string;
  message_id: string;
};

type WorldConversationModerationResolveBody = {
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
  context: RouteContext<WorldConversationModerationResolveRouteParams>
) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const worldId = await getRequiredRouteParam(context, "world_id");
  const messageId = await getRequiredRouteParam(context, "message_id");
  if (!worldId || !messageId) {
    return notFound("moderation case not found");
  }

  const payload = await safeJson<WorldConversationModerationResolveBody>(request);
  const resolutionInput = getRequiredBodyString(payload as Record<string, unknown> | null, "resolution");
  if (!resolutionInput || !VALID_RESOLUTIONS.has(resolutionInput as WorldConversationModerationResolution)) {
    return badRequest("resolution must be one of: hide, restrict, delete, restore, dismiss");
  }

  const result = await commerceBffService.resolveWorldConversationModerationCase(
    guard.session.accountId,
    worldId,
    messageId,
    resolutionInput as WorldConversationModerationResolution
  );

  if (!result.ok) {
    return result.reason === "forbidden"
      ? forbidden("not allowed to resolve this moderation case")
      : notFound("moderation case not found");
  }

  return ok(result);
}
