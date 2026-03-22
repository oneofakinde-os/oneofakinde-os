"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { routes } from "@/lib/routes";

type NotificationBellProps = {
  initialUnreadCount: number;
};

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell({ initialUnreadCount }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const response = await fetch("/api/v1/notifications/unread-count");
        if (response.ok) {
          const data = await response.json();
          if (active && typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        }
      } catch {
        // polling failure is non-critical
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

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
