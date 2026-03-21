import { getRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/v1/notifications/:id/read
 *
 * Marks a single notification as read.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getRequestSession(request);
  if (!session) {
    return ok({ success: false });
  }

  await commerceBffService.markNotificationRead(session.accountId, id);
  return ok({ success: true });
}
