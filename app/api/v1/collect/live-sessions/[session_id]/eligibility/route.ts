import type { CollectLiveSessionEligibilityResponse } from "@/lib/bff/contracts";
import { getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";

type CollectLiveSessionEligibilityRouteParams = {
  session_id: string;
};

export async function GET(
  request: Request,
  context: RouteContext<CollectLiveSessionEligibilityRouteParams>
) {
  const sessionId = await getRequiredRouteParam(context, "session_id");
  if (!sessionId) {
    return notFound("live session not found");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const eligibility = await commerceBffService.getCollectLiveSessionEligibility(
    guard.session.accountId,
    sessionId
  );

  if (!eligibility) {
    return notFound("live session not found");
  }

  return ok<CollectLiveSessionEligibilityResponse>({
    eligibility
  });
}
