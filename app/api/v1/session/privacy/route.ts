/**
 * GET  /api/v1/session/privacy — get privacy settings for the current account
 * PATCH /api/v1/session/privacy — update privacy settings
 *
 * Sprint 4 — PRV-003: privacy controls (DM restriction, online status, locked account).
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { DmRestriction, PrivacySettingsSnapshot } from "@/lib/domain/contracts";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const settings = await commerceBffService.getPrivacySettings(guard.session.accountId);

  return ok({ settings });
}

type UpdateBody = Partial<PrivacySettingsSnapshot>;

const VALID_DM_RESTRICTIONS: DmRestriction[] = ["anyone", "followers_only", "mutual_only", "no_one"];

export async function PATCH(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const payload = await safeJson<UpdateBody>(request);
  if (!payload) return badRequest("invalid body");

  if (payload.dmRestriction !== undefined && !VALID_DM_RESTRICTIONS.includes(payload.dmRestriction)) {
    return badRequest("dmRestriction must be anyone, followers_only, mutual_only, or no_one");
  }

  const settings = await commerceBffService.updatePrivacySettings(
    guard.session.accountId,
    payload
  );

  return ok({ settings });
}
