import { NotificationBell } from "@/features/notifications/notification-bell";
import { gateway } from "@/lib/gateway";

type NotificationBellServerProps = {
  accountId: string;
};

export async function NotificationBellServer({ accountId }: NotificationBellServerProps) {
  let unreadCount = 0;
  try {
    unreadCount = await gateway.getNotificationUnreadCount(accountId);
  } catch {
    // non-critical — bell will poll on the client
  }

  return <NotificationBell initialUnreadCount={unreadCount} accountId={accountId} />;
}
