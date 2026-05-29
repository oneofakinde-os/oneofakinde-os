import { requireRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { checkRateLimit, RATE_LIMITS } from "@/lib/bff/rate-limit";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rate = checkRateLimit(request, RATE_LIMITS.dispatch, "studio:dispatches:received:get", guard.session.accountId);
  if (!rate.ok) return rate.response;

  const dispatches = await commerceBffService.listReceivedDispatches(guard.session.accountId);
  return ok({ dispatches });
}
