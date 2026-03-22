"use client";

import { useState } from "react";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { useEventStream } from "@/lib/hooks/use-event-stream";

type NotificationBellProps = {
  initialUnreadCount: number;
};

export function NotificationBell({ initialUnreadCount }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEventStream<{ unreadCount: number }>("/api/v1/notifications/stream", {
    onMessage: (data) => {
      if (typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    },
    fallbackPollMs: 30_000,
    fallbackFetchUrl: "/api/v1/notifications/unread-count",
  });

  return (
    <Link
      href={routes.notifications()}
      className="slice-link notif-bell"
      data-testid="notification-bell"
    >
      notifications
      {unreadCount > 0 && (
        <span className="notif-badge" data-testid="notification-badge">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
