import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, ok } from "@/lib/bff/http";
import { isModeratorAccountId } from "@/lib/bff/moderation";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  // Sprint 0.6b: the message-moderation queue exposes reported private-DM content +
  // participant PII, so it is moderator-only — never any creator.
  if (!isModeratorAccountId(guard.session.accountId)) {
    return forbidden("moderator role required");
  }

  const queue = await commerceBffService.listMessageModerationQueue(guard.session.accountId);
  return ok({ queue });
}
