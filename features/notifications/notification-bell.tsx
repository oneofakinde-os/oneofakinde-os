"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { useEventStream } from "@/lib/hooks/use-event-stream";
import { useSupabaseRealtime } from "@/lib/hooks/use-supabase-realtime";

type NotificationBellProps = {
  initialUnreadCount: number;
  accountId?: string;
};

export function NotificationBell({ initialUnreadCount, accountId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  // --- Supabase Realtime: instant push when notification rows change ---
  const refetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      }
    } catch {
      // Non-critical — SSE fallback will catch up
    }
  }, []);

  const { state: realtimeState } = useSupabaseRealtime({
    table: "bff_notification_entries",
    events: ["INSERT", "UPDATE"],
    filter: accountId ? `account_id=eq.${accountId}` : undefined,
    onChange: refetchCount,
    enabled: Boolean(accountId)
  });

  // --- SSE fallback: used when Supabase Realtime is unavailable ---
  const sseEnabled = realtimeState === "unavailable" || !accountId;

  useEventStream<{ unreadCount: number }>("/api/v1/notifications/stream", {
    onMessage: (data) => {
      if (typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    },
    fallbackPollMs: 30_000,
    fallbackFetchUrl: "/api/v1/notifications/unread-count",
    enabled: sseEnabled
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
