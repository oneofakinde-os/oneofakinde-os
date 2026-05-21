/**
 * POST /api/v1/session/account/handle — request a handle change.
 *
 * Sprint 4 — AID-012: handle change with 180-day redirect.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type HandleChangeBody = {
  newHandle?: string;
};

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const payload = await safeJson<HandleChangeBody>(request);
  const newHandle = getRequiredBodyString(payload as Record<string, unknown> | null, "newHandle");
  if (!newHandle) return badRequest("newHandle is required");

  const result = await commerceBffService.requestHandleChange(
    guard.session.accountId,
    newHandle
  );
  if (!result) return badRequest("handle change failed — handle may be taken or invalid");

  return ok({ request: result });
}
