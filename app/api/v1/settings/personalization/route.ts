import { requireRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { checkRateLimit, RATE_LIMITS } from "@/lib/bff/rate-limit";
import { commerceBffService } from "@/lib/bff/service";
import { validateBody, z } from "@/lib/bff/validate";

const patchSchema = z.object({
  disableTasteGraph: z.boolean().optional(),
});

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rate = checkRateLimit(request, RATE_LIMITS.authenticated, "settings:personalization:get", guard.session.accountId);
  if (!rate.ok) return rate.response;

  const preferences = await commerceBffService.getPersonalizationPreferences(guard.session.accountId);
  return ok({ preferences });
}

export async function PATCH(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rate = checkRateLimit(request, RATE_LIMITS.mutation, "settings:personalization:patch", guard.session.accountId);
  if (!rate.ok) return rate.response;

  const body = await validateBody(request, patchSchema);
  if (!body.ok) return body.response;

  const preferences = await commerceBffService.updatePersonalizationPreferences(
    guard.session.accountId,
    { disableTasteGraph: body.data.disableTasteGraph }
  );
  return ok({ preferences });
}
