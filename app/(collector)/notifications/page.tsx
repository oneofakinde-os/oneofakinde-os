import { NotificationsScreen } from "@/features/notifications/notifications-screen";
import { commerceBffService } from "@/lib/bff/service";
import { requireSession } from "@/lib/server/session";

export default async function NotificationsPage() {
  const session = await requireSession("/notifications");
  const feed = await commerceBffService.getNotificationFeed(session.accountId);

  return <NotificationsScreen session={session} initialFeed={feed} />;
}
