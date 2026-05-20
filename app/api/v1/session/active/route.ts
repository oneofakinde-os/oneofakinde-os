/**
 * GET  /api/v1/session/active — list active sessions for the current account
 * POST /api/v1/session/active — revoke a session by its short ID
 *
 * AID-015 + AID-016: session management + remote revoke.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const sessions = await commerceBffService.listActiveSessions(
    guard.session.accountId,
    guard.session.sessionToken
  );

  return ok({ sessions });
}

type RevokeBody = {
  sessionId?: string;
};

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const payload = await safeJson<RevokeBody>(request);
  const sessionId = getRequiredBodyString(payload as Record<string, unknown> | null, "sessionId");
  if (!sessionId) return badRequest("sessionId is required");

  const revoked = await commerceBffService.revokeSession(
    guard.session.accountId,
    sessionId,
    guard.session.sessionToken
  );

  if (!revoked) return badRequest("session not found or cannot revoke current session");

  return ok({ revoked: true });
}
