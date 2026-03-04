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
  const worldId = getRequiredSearchParam(url, "world_id");
  const queue = await commerceBffService.listWorldConversationModerationQueue(
    guard.session.accountId,
    worldId
  );

  return ok({ queue });
}
