import { requireRequestSession } from "@/lib/bff/auth";
import type { WorkshopProProfileResponse } from "@/lib/bff/contracts";
import { badRequest, forbidden, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { WorkshopProState } from "@/lib/domain/contracts";

type PostWorkshopProStateBody = {
  nextState?: string;
};

const WORKSHOP_PRO_STATES = new Set<WorkshopProState>(["active", "past_due", "grace", "locked"]);

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const profile = await commerceBffService.getWorkshopProProfile(guard.session.accountId);
  if (!profile) {
    return badRequest("workshop pro profile could not be loaded");
  }

  return ok<WorkshopProProfileResponse>({
    profile
  });
}

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const body = (await safeJson<PostWorkshopProStateBody>(request)) as Record<string, unknown> | null;
  const nextStateRaw = getRequiredBodyString(body, "nextState");
  if (!nextStateRaw || !WORKSHOP_PRO_STATES.has(nextStateRaw as WorkshopProState)) {
    return badRequest("nextState must be one of: active, past_due, grace, locked");
  }

  const profile = await commerceBffService.transitionWorkshopProState(
    guard.session.accountId,
    nextStateRaw as WorkshopProState
  );
  if (!profile) {
    return badRequest("workshop pro state transition could not be applied");
  }

  return ok<WorkshopProProfileResponse>({
    profile
  });
}
