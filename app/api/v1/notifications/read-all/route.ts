import { getRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

/**
 * POST /api/v1/notifications/read-all
 *
 * Marks all notifications as read for the current session.
 */
export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return ok({ success: false });
  }

  await commerceBffService.markAllNotificationsRead(session.accountId);
  return ok({ success: true });
}
