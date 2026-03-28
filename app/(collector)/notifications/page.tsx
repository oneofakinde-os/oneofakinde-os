import { NotificationsScreen } from "@/features/notifications/notifications-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";

export default async function NotificationsPage() {
  const session = await requireSession("/notifications");
  const feed = await gateway.getNotificationFeed(session.accountId);

  return <NotificationsScreen session={session} initialFeed={feed} />;
}
