/**
 * POST /api/v1/session/account/delete
 *
 * Sprint 0.1 — request account deletion. Sets `deletionRequestedAt` to now,
 * starts the 30-day grace clock. Idempotent: a second call during grace
 * returns `{status: "deletion_requested"}` without resetting the clock.
 *
 * Authenticated. The session's account is the one being deleted —
 * cross-account deletion requests are not supported by this route.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { ok, serviceUnavailable } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const status = await commerceBffService.requestAccountDeletion(guard.session.accountId);
  if (!status) {
    return serviceUnavailable("could not start account deletion");
  }

  return ok({ status });
}
