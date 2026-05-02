/**
 * GET /api/v1/session/account/deletion-status
 *
 * Sprint 0.1 — query the authenticated account's deletion lifecycle state.
 * Used by the settings UI to render the right control set (request,
 * cancel, or "this account is anonymized").
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { ok, serviceUnavailable } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const status = await commerceBffService.getAccountDeletionStatus(guard.session.accountId);
  if (!status) {
    return serviceUnavailable("could not load account deletion status");
  }

  return ok({ status });
}
