import { requireRequestSession } from "@/lib/bff/auth";
import type { WorkshopLiveSessionResponse } from "@/lib/bff/contracts";
import {
  badRequest,
  forbidden,
  getRequiredBodyString,
  getRequiredRouteParam,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type WorkshopReleaseLiveSessionDropRouteParams = {
  session_id: string;
};

type ReleaseWorkshopLiveSessionDropBody = {
  dropId?: string;
  publicReleaseDelayMinutes?: number;
};

const MIN_PUBLIC_RELEASE_DELAY_MINUTES = 1440;

export async function POST(
  request: Request,
  context: RouteContext<WorkshopReleaseLiveSessionDropRouteParams>
) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const liveSessionId = await getRequiredRouteParam(context, "session_id");
  if (!liveSessionId) {
    return badRequest("session_id is required");
  }

  const body = (await safeJson<ReleaseWorkshopLiveSessionDropBody>(request)) as
    | Record<string, unknown>
    | null;
  const dropId = getRequiredBodyString(body, "dropId");
  if (!dropId) {
    return badRequest("dropId is required");
  }

  const delayRaw = body?.publicReleaseDelayMinutes;
  const publicReleaseDelayMinutes =
    typeof delayRaw === "number" && Number.isFinite(delayRaw)
      ? Math.floor(delayRaw)
      : undefined;
  if (
    publicReleaseDelayMinutes !== undefined &&
    publicReleaseDelayMinutes < MIN_PUBLIC_RELEASE_DELAY_MINUTES
  ) {
    return badRequest("publicReleaseDelayMinutes must be at least 1440");
  }

  const liveSession = await commerceBffService.releaseWorkshopLiveSessionDrop(
    guard.session.accountId,
    liveSessionId,
    {
      dropId,
      publicReleaseDelayMinutes
    }
  );
  if (!liveSession) {
    return badRequest("workshop live session drop could not be released");
  }

  return ok<WorkshopLiveSessionResponse>({
    liveSession
  });
}
