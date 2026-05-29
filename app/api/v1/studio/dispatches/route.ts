import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { StudioDispatchAudienceScope } from "@/lib/domain/contracts";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const studioHandle = url.searchParams.get("studio") ?? guard.session.handle;

  const dispatches = await commerceBffService.listStudioDispatches(
    guard.session.accountId,
    studioHandle
  );
  return ok({ dispatches });
}

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const body = await safeJson<{
    audienceScope?: string;
    title?: string;
    body?: string;
    relatedDropId?: string | null;
    relatedWorldId?: string | null;
  }>(request);
  if (!body) return badRequest("request body is required");
  if (!body.audienceScope) return badRequest("audienceScope is required");
  if (!body.title) return badRequest("title is required");
  if (!body.body) return badRequest("body is required");

  const VALID_SCOPES = new Set<string>([
    "followers",
    "holders",
    "all_collectors",
    "active_patrons",
    "world_members",
  ]);
  if (!VALID_SCOPES.has(body.audienceScope)) {
    return badRequest(`audienceScope '${body.audienceScope}' is not valid`);
  }

  const dispatch = await commerceBffService.createStudioDispatch(guard.session.accountId, {
    audienceScope: body.audienceScope as StudioDispatchAudienceScope,
    title: body.title,
    body: body.body,
    relatedDropId: body.relatedDropId ?? null,
    relatedWorldId: body.relatedWorldId ?? null,
  });

  if (!dispatch) return badRequest("could not create dispatch");
  return ok({ dispatch }, 201);
}
