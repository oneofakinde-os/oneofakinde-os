/**
 * POST /api/v1/broadcasts/unsubscribe — recipient opt-out of broadcasts.
 *
 * Sprint 6 — scope "global" silences all creators; "per_creator" silences
 * a single studio (studioHandle required).
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type UnsubscribeBody = {
  scope?: string;
  studioHandle?: string | null;
};

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const payload = await safeJson<UnsubscribeBody>(request);
  const scope = payload?.scope === "global" ? "global" : payload?.scope === "per_creator" ? "per_creator" : null;
  if (!scope) return badRequest("scope must be global or per_creator");

  const studioHandle =
    scope === "per_creator" && typeof payload?.studioHandle === "string" ? payload.studioHandle : null;
  if (scope === "per_creator" && !studioHandle) {
    return badRequest("studioHandle is required for per_creator scope");
  }

  const done = await commerceBffService.setBroadcastUnsubscribe(
    guard.session.accountId,
    scope,
    studioHandle
  );
  if (!done) return badRequest("could not update broadcast preferences");

  return ok({ unsubscribed: true });
}
