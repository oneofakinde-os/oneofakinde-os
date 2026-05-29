import { requireRequestSession } from "@/lib/bff/auth";
import { notFound, ok, type RouteContext } from "@/lib/bff/http";
import { checkRateLimit, RATE_LIMITS } from "@/lib/bff/rate-limit";
import { commerceBffService } from "@/lib/bff/service";

type Params = { drop_id: string };

export async function POST(request: Request, context: RouteContext<Params>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rl = checkRateLimit(request, RATE_LIMITS.mutation, "drop-preview-post", guard.session.accountId);
  if (!rl.ok) return rl.response;

  const params = await context.params;
  const dropId = params.drop_id?.trim();
  if (!dropId) return notFound();

  const preview = await commerceBffService.recordCertificatePreview(
    guard.session.accountId,
    dropId
  );

  if (!preview) return notFound();
  return ok({ preview }, 201);
}
