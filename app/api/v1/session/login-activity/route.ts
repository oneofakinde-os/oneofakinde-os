/**
 * GET /api/v1/session/login-activity — recent login activity for the current account.
 *
 * PRV-011: login activity transparency.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const entries = await commerceBffService.getLoginActivity(guard.session.accountId);

  return ok({ entries });
}
