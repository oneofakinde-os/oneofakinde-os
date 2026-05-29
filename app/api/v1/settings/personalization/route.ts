import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const preferences = await commerceBffService.getPersonalizationPreferences(guard.session.accountId);
  return ok({ preferences });
}

export async function PATCH(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const body = await safeJson<{ disableTasteGraph?: boolean }>(request);
  if (!body) return badRequest("request body is required");

  const preferences = await commerceBffService.updatePersonalizationPreferences(
    guard.session.accountId,
    { disableTasteGraph: body.disableTasteGraph }
  );
  if (!preferences) return badRequest("could not update preferences");
  return ok({ preferences });
}
