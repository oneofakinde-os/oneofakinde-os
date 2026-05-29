import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { checkRateLimit, RATE_LIMITS } from "@/lib/bff/rate-limit";
import { commerceBffService } from "@/lib/bff/service";
import { validateBody } from "@/lib/bff/validate";
import { z } from "zod";

type Params = { drop_id: string };

const termsSchema = z.object({
  commercialUse: z.boolean(),
  derivativesAllowed: z.boolean(),
  attributionRequired: z.boolean(),
  royaltyPct: z.number().min(0).max(1).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  termsVersion: z.string().optional(),
});

export async function POST(request: Request, context: RouteContext<Params>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rl = checkRateLimit(request, RATE_LIMITS.mutation, "drop-terms-post", guard.session.accountId);
  if (!rl.ok) return rl.response;

  const params = await context.params;
  const dropId = params.drop_id?.trim();
  if (!dropId) return notFound();

  const validation = await validateBody(request, termsSchema);
  if (!validation.ok) return validation.response;

  const { commercialUse, derivativesAllowed, attributionRequired, royaltyPct, notes, termsVersion } =
    validation.data;

  const terms = await commerceBffService.upsertCreatorTerms(
    guard.session.accountId,
    dropId,
    { commercialUse, derivativesAllowed, attributionRequired, royaltyPct, notes, termsVersion }
  );

  if (!terms) return notFound();
  return ok({ terms }, 201);
}

export async function GET(request: Request, context: RouteContext<Params>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rl = checkRateLimit(request, RATE_LIMITS.authenticated, "drop-terms-get", guard.session.accountId);
  if (!rl.ok) return rl.response;

  const params = await context.params;
  const dropId = params.drop_id?.trim();
  if (!dropId) return notFound();

  const terms = await commerceBffService.getCreatorTerms(dropId);
  if (!terms) return notFound();
  return ok({ terms });
}
