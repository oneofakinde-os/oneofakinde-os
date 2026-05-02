/**
 * POST /api/v1/session/account/delete/cancel
 *
 * Sprint 0.1 — cancel a pending deletion. Only valid during the grace
 * period; once the account is anonymized this is a no-op (the cascade has
 * already irreversibly destroyed UGC linkage and the client should be
 * informed of the terminal state instead of attempting to cancel).
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { ok, serviceUnavailable } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const status = await commerceBffService.cancelAccountDeletion(guard.session.accountId);
  if (!status) {
    return serviceUnavailable("could not cancel account deletion");
  }

  return ok({ status });
}
