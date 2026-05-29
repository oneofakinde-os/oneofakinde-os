import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, notFound, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const studioHandle = url.searchParams.get("studio") ?? guard.session.handle;
  if (!studioHandle) return badRequest("studio param is required");

  const intelligence = await commerceBffService.getCreatorMarketIntelligence(
    guard.session.accountId,
    studioHandle
  );
  if (!intelligence) return notFound();
  return ok({ intelligence });
}
