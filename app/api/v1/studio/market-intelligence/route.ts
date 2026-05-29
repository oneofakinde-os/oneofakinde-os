import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, notFound, ok } from "@/lib/bff/http";
import { checkRateLimit, RATE_LIMITS } from "@/lib/bff/rate-limit";
import { commerceBffService } from "@/lib/bff/service";
import { schemas, validate } from "@/lib/bff/validate";
import { z } from "zod";

const querySchema = z.object({
  studio: schemas.handle.optional(),
});

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rate = checkRateLimit(request, RATE_LIMITS.authenticated, "studio:market-intelligence:get", guard.session.accountId);
  if (!rate.ok) return rate.response;

  const url = new URL(request.url);
  const query = validate(querySchema, Object.fromEntries(url.searchParams));
  if (!query.ok) return query.response;

  const studioHandle = query.data.studio ?? guard.session.handle;
  if (!studioHandle) return badRequest("studio param is required");

  const intelligence = await commerceBffService.getCreatorMarketIntelligence(
    guard.session.accountId,
    studioHandle
  );
  if (!intelligence) return notFound();
  return ok({ intelligence });
}
