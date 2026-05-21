/**
 * POST /api/v1/session/account/email/confirm — confirm email change via token.
 *
 * Sprint 4 — AID-013: email change confirmation.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type ConfirmBody = {
  token?: string;
};

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const payload = await safeJson<ConfirmBody>(request);
  const token = getRequiredBodyString(payload as Record<string, unknown> | null, "token");
  if (!token) return badRequest("token is required");

  const confirmed = await commerceBffService.confirmEmailChange(
    guard.session.accountId,
    token
  );
  if (!confirmed) return badRequest("confirmation failed — invalid or expired token");

  return ok({ confirmed: true });
}
