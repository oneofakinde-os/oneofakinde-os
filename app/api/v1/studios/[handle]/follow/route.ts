import { requireRequestSession } from "@/lib/bff/auth";
import {
  badRequest,
  getRequiredBodyString,
  getRequiredRouteParam,
  notFound,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type FollowRouteParams = {
  handle: string;
};

type FollowActionBody = {
  action?: string;
};

export async function POST(
  request: Request,
  context: RouteContext<FollowRouteParams>
) {
  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return badRequest("handle is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await safeJson<FollowActionBody>(request);
  const payloadRecord = payload as Record<string, unknown> | null;
  const action = getRequiredBodyString(payloadRecord, "action");

  if (action !== "follow" && action !== "unfollow") {
    return badRequest("action must be 'follow' or 'unfollow'");
  }

  const result =
    action === "follow"
      ? await commerceBffService.followStudio(guard.session.accountId, handle)
      : await commerceBffService.unfollowStudio(guard.session.accountId, handle);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return notFound("studio not found");
    }
    return badRequest(
      result.reason === "already_following"
        ? "already following this studio"
        : "not following this studio"
    );
  }

  return ok({
    ok: true,
    following: result.following,
    followerCount: result.followerCount
  });
}
