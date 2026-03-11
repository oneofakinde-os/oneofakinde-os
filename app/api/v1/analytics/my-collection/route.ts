import { requireRequestSession } from "@/lib/bff/auth";
import { notFound, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const panel = await commerceBffService.getMyCollectionAnalyticsPanel(guard.session.accountId);
  if (!panel) {
    return notFound("my collection analytics panel not found");
  }

  return ok({ panel });
}
