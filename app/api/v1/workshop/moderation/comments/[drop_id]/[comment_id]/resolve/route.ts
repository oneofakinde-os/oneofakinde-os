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
import type { TownhallModerationCaseResolution } from "@/lib/domain/contracts";
import { commerceBffService } from "@/lib/bff/service";

type ModerationResolveRouteParams = {
  drop_id: string;
  comment_id: string;
};

type ModerationResolveBody = {
  resolution?: string;
};

const VALID_RESOLUTIONS = new Set<TownhallModerationCaseResolution>([
  "hide",
  "restrict",
  "delete",
  "restore",
  "dismiss"
]);

export async function POST(
  request: Request,
  context: RouteContext<ModerationResolveRouteParams>
) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const dropId = await getRequiredRouteParam(context, "drop_id");
  const commentId = await getRequiredRouteParam(context, "comment_id");
  if (!dropId || !commentId) {
    return notFound("moderation case not found");
  }

  const payload = await safeJson<ModerationResolveBody>(request);
  const resolutionInput = getRequiredBodyString(payload as Record<string, unknown> | null, "resolution");
  if (!resolutionInput || !VALID_RESOLUTIONS.has(resolutionInput as TownhallModerationCaseResolution)) {
    return badRequest("resolution must be one of: hide, restrict, delete, restore, dismiss");
  }

  const result = await commerceBffService.resolveTownhallModerationCase(
    guard.session.accountId,
    dropId,
    commentId,
    resolutionInput as TownhallModerationCaseResolution
  );

  if (!result.ok) {
    return result.reason === "forbidden"
      ? forbidden("not allowed to resolve this moderation case")
      : notFound("moderation case not found");
  }

  return ok(result);
}
