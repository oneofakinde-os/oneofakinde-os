import { getRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

/**
 * GET /api/v1/notifications/unread-count
 *
 * Returns the unread notification count for the notification bell.
 */
export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return ok({ unreadCount: 0 });
  }

  const unreadCount = await commerceBffService.getNotificationUnreadCount(session.accountId);
  return ok({ unreadCount });
}
