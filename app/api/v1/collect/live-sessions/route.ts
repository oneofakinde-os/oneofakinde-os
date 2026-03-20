import { requireRequestSession } from "@/lib/bff/auth";
import type { CollectLiveSessionsResponse } from "@/lib/bff/contracts";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const allLiveSessions = await commerceBffService.listCollectLiveSessions(
    guard.session.accountId
  );
  const url = new URL(request.url);
  const worldId = url.searchParams.get("world_id");
  const liveSessions = worldId
    ? allLiveSessions.filter((entry) => entry.liveSession.worldId === worldId)
    : allLiveSessions;
  const eligibleSessions = liveSessions.filter((entry) => entry.eligibility.eligible).length;
  const openingSessions = liveSessions.filter((entry) => entry.liveSession.type === "opening");
  const eligibleOpeningSessions = openingSessions.filter((entry) => entry.eligibility.eligible).length;

  return ok<CollectLiveSessionsResponse>({
    liveSessions,
    opportunitySummary: {
      totalSessions: liveSessions.length,
      eligibleSessions,
      ineligibleSessions: Math.max(0, liveSessions.length - eligibleSessions)
    },
    worldScope: worldId
      ? {
          worldId,
          openingSessions: openingSessions.length,
          eligibleOpeningSessions,
          ineligibleOpeningSessions: Math.max(0, openingSessions.length - eligibleOpeningSessions)
        }
      : undefined
  });
}
