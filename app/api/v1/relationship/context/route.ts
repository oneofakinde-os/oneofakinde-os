import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const studioHandle = url.searchParams.get("studio");
  if (!studioHandle) return badRequest("studio query parameter is required");

  const context = await commerceBffService.getRelationshipContext(
    guard.session.accountId,
    studioHandle
  );
  return ok({ context });
}
