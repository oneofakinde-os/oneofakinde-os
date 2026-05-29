import { requireRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const dispatches = await commerceBffService.listReceivedDispatches(guard.session.accountId);
  return ok({ dispatches });
}
