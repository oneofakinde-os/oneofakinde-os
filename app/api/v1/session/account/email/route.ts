/**
 * POST /api/v1/session/account/email — request an email change (starts verification).
 *
 * Sprint 4 — AID-013: email change request.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type EmailChangeBody = {
  newEmail?: string;
};

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const payload = await safeJson<EmailChangeBody>(request);
  const newEmail = getRequiredBodyString(payload as Record<string, unknown> | null, "newEmail");
  if (!newEmail) return badRequest("newEmail is required");

  const result = await commerceBffService.requestEmailChange(
    guard.session.accountId,
    newEmail
  );
  if (!result) return badRequest("email change failed — email may be taken or invalid");

  return ok({ status: result.status });
}
