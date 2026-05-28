import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import { ok } from "@/lib/bff/http";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const savedIntents = await commerceBffService.getSavedIntents(guard.session.accountId);
  return ok({ savedIntents });
}
