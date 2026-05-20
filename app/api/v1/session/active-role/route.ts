/**
 * PUT /api/v1/session/active-role — toggle active role between collector and creator
 *
 * Sprint 2A — AID-012: role toggle.
 * Body: `{ role: "collector" | "creator" }`
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { AccountRole } from "@/lib/domain/contracts";

const VALID_ROLES: ReadonlySet<AccountRole> = new Set(["collector", "creator"]);

export async function PUT(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const body = (await request.json()) as Record<string, unknown>;
  const role = typeof body.role === "string" ? body.role : "";

  if (!VALID_ROLES.has(role as AccountRole)) {
    return badRequest("role must be 'collector' or 'creator'");
  }

  const result = await commerceBffService.toggleActiveRole(
    guard.session.accountId,
    role as AccountRole
  );

  if (!result) {
    return badRequest("you do not have that role");
  }

  return ok({ activeRole: result.activeRole });
}
