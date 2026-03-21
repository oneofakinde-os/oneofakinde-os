import { getRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

/**
 * GET /api/v1/notifications
 *
 * Returns the full notification feed for the current session.
 */
export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return ok({ entries: [], unreadCount: 0 });
  }

  const feed = await commerceBffService.getNotificationFeed(session.accountId);
  return ok(feed);
}
