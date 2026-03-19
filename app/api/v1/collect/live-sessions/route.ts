import { requireRequestSession } from "@/lib/bff/auth";
import type { CollectLiveSessionsResponse } from "@/lib/bff/contracts";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const liveSessions = await commerceBffService.listCollectLiveSessions(
    guard.session.accountId
  );
  const eligibleSessions = liveSessions.filter((entry) => entry.eligibility.eligible).length;

  return ok<CollectLiveSessionsResponse>({
    liveSessions,
    opportunitySummary: {
      totalSessions: liveSessions.length,
      eligibleSessions,
      ineligibleSessions: Math.max(0, liveSessions.length - eligibleSessions)
    }
  });
}
