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

type WorldMembersRouteParams = {
  world_id: string;
};

type WorldMembershipActionBody = {
  action?: string;
};

export async function POST(
  request: Request,
  context: RouteContext<WorldMembersRouteParams>
) {
  const worldId = await getRequiredRouteParam(context, "world_id");
  if (!worldId) {
    return badRequest("world_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await safeJson<WorldMembershipActionBody>(request);
  const payloadRecord = payload as Record<string, unknown> | null;
  const action = getRequiredBodyString(payloadRecord, "action");

  if (action !== "join" && action !== "leave") {
    return badRequest("action must be 'join' or 'leave'");
  }

  const result = await commerceBffService.joinOrLeaveWorld(
    guard.session.accountId,
    worldId,
    action
  );

  if (!result.ok) {
    if (result.reason === "not_found") {
      return notFound("world not found");
    }
    return badRequest(
      result.reason === "already_member"
        ? "already a member of this world"
        : "not a member of this world"
    );
  }

  return ok({
    ok: true,
    membership: result.membership
  });
}
