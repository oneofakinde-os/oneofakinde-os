import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { checkRateLimit, RATE_LIMITS } from "@/lib/bff/rate-limit";
import { commerceBffService } from "@/lib/bff/service";

type Params = { drop_id: string };

export async function POST(request: Request, context: RouteContext<Params>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rl = checkRateLimit(request, RATE_LIMITS.mutation, "drop-publish-post", guard.session.accountId);
  if (!rl.ok) return rl.response;

  const params = await context.params;
  const dropId = params.drop_id?.trim();
  if (!dropId) return notFound();

  const result = await commerceBffService.publishDrop(guard.session.accountId, dropId);

  if (!result.ok) {
    if (result.reason === "not_found" || result.reason === "not_creator") return notFound();
    if (result.reason === "missing_rights")
      return badRequest("rights metadata must be set before publishing");
    if (result.reason === "missing_creator_terms")
      return badRequest("creator terms must be set before publishing");
    return badRequest("cannot publish drop");
  }

  return ok({ drop: result.drop });
}
