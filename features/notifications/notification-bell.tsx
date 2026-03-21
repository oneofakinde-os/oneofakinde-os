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
      className="slice-link"
      data-testid="notification-bell"
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      notifications
      {unreadCount > 0 && (
        <span
          data-testid="notification-badge"
          style={{
            marginLeft: "0.25rem",
            backgroundColor: "rgb(80, 220, 180)",
            color: "#000",
            borderRadius: "999px",
            padding: "0 0.375rem",
            fontSize: "0.625rem",
            fontWeight: "bold",
            lineHeight: "1.25rem",
            minWidth: "1.25rem",
            textAlign: "center"
          }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
