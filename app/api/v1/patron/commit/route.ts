import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type PatronCommitBody = {
  studioHandle?: string;
  worldId?: string | null;
};

function getOptionalBodyString(body: Record<string, unknown> | null, key: string): string | null {
  const value = body?.[key];
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("collector")) {
    return forbidden("collector role is required");
  }

  const body = (await safeJson<PatronCommitBody>(request)) as Record<string, unknown> | null;
  const studioHandle = getRequiredBodyString(body, "studioHandle");
  const worldId = getOptionalBodyString(body, "worldId");
  if (!studioHandle) {
    return badRequest("studioHandle is required");
  }

  const committed = await commerceBffService.commitPatron(
    guard.session.accountId,
    studioHandle,
    worldId
  );

  if (!committed.ok) {
    if (committed.reason === "not_found") {
      return badRequest("studio not found");
    }
    return forbidden("collector role is required");
  }

  return ok(
    {
      patron: committed.patron
    },
    201
  );
}
