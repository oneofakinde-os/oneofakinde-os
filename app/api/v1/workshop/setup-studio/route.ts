import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type SetupStudioBody = {
  studioTitle?: string;
  studioSynopsis?: string;
};

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (guard.session.roles.includes("creator")) {
    return forbidden("account is already a creator");
  }

  const body = (await safeJson<SetupStudioBody>(request)) as
    | Record<string, unknown>
    | null;

  const studioTitle = getRequiredBodyString(body, "studioTitle");
  if (!studioTitle || studioTitle.length > 80) {
    return badRequest("studioTitle is required (max 80 characters)");
  }

  const studioSynopsis = typeof body?.studioSynopsis === "string"
    ? body.studioSynopsis.trim()
    : "";

  if (studioSynopsis.length > 500) {
    return badRequest("studioSynopsis must be under 500 characters");
  }

  const result = await commerceBffService.setupCreatorStudio(
    guard.session.accountId,
    { studioTitle, studioSynopsis }
  );

  if (!result) {
    return badRequest("studio setup failed");
  }

  return ok({ studio: result.studio, session: result.session }, 201);
}
