import { badRequest, forbidden, getRequiredBodyString, getRequiredRouteParam, notFound, ok, safeJson, type RouteContext } from "@/lib/bff/http";
import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallShareChannel } from "@/lib/domain/contracts";

type ShareRouteParams = {
  drop_id: string;
};

type ShareBody = {
  channel?: string;
};

function isShareChannel(value: string): value is TownhallShareChannel {
  return value === "sms" || value === "internal_dm" || value === "whatsapp" || value === "telegram";
}

export async function POST(request: Request, context: RouteContext<ShareRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return notFound("drop not found");
  }

  const payload = await safeJson<ShareBody>(request);
  const requestedChannel = getRequiredBodyString(payload as Record<string, unknown> | null, "channel");
  const channel = requestedChannel ?? "internal_dm";
  if (!isShareChannel(channel)) {
    return badRequest("channel must be sms, internal_dm, whatsapp, or telegram");
  }

  // Sprint 0.2 — block enforcement: blocked viewers cannot share blocker's drops.
  if (await commerceBffService.isViewerBlockedByDropStudio(guard.session.accountId, dropId)) {
    return forbidden("blocked");
  }

  const social = await commerceBffService.recordTownhallShare(
    guard.session.accountId,
    dropId,
    channel
  );
  if (!social) {
    return notFound("drop not found");
  }

  return ok({ social }, 201);
}
