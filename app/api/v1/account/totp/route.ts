import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

/**
 * GET /api/v1/account/totp
 *
 * Returns the current TOTP enrollment status for the authenticated user.
 */
export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const enrollment = await commerceBffService.getTotpEnrollment(guard.session.accountId);
  return ok({ enrollment });
}

type TotpActionBody = {
  action: "enroll" | "verify" | "disable";
  code?: string;
};

/**
 * POST /api/v1/account/totp
 *
 * Manages TOTP enrollment: enroll, verify, or disable.
 */
export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const body = await safeJson<TotpActionBody>(request);
  if (!body || !body.action) {
    return badRequest("JSON body with action (enroll | verify | disable) is required");
  }

  const { accountId } = guard.session;

  if (body.action === "enroll") {
    const enrollment = await commerceBffService.createTotpEnrollment(accountId);
    if (!enrollment) {
      return badRequest("could not create enrollment — 2fa may already be active");
    }
    return ok({ enrollment });
  }

  if (body.action === "verify") {
    if (typeof body.code !== "string" || body.code.length !== 6) {
      return badRequest("code must be a 6-digit string");
    }
    const enrollment = await commerceBffService.verifyTotpEnrollment(accountId, body.code);
    if (!enrollment) {
      return badRequest("verification failed — code may be invalid or expired");
    }
    return ok({ enrollment });
  }

  if (body.action === "disable") {
    const disabled = await commerceBffService.disableTotpEnrollment(accountId);
    if (!disabled) {
      return badRequest("could not disable 2fa — no active enrollment found");
    }
    return ok({ disabled: true });
  }

  return badRequest("unknown action");
}
