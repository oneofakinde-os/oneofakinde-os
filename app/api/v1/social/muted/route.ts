/**
 * GET /api/v1/social/muted
 *
 * Returns the handles of accounts the authenticated user has muted, for
 * settings UI display.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const handles = await commerceBffService.getMutedHandles(guard.session.accountId);
  return ok({ muted: handles });
}
