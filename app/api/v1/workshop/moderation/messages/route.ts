import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const queue = await commerceBffService.listMessageModerationQueue(guard.session.accountId);
  return ok({ queue });
}
