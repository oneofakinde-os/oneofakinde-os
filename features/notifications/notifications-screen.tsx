"use client";

import { useState } from "react";
import { AppShell } from "@/features/shell/app-shell";
import type {
  NotificationEntry,
  NotificationFeed,
  Session
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type NotificationsScreenProps = {
  session: Session;
  initialFeed: NotificationFeed;
};

const TYPE_ICON: Record<string, string> = {
  drop_collected: "collected",
  receipt_confirmed: "receipt",
  comment_reply: "reply",
  comment_mention: "mention",
  world_update: "world",
  membership_change: "membership",
  patron_renewal: "patron",
  live_session_starting: "live",
  campaign_alert: "campaign",
  weekly_digest: "digest"
};

function formatTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  const date = new Date(parsed);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toISOString().slice(0, 10);
}

export function NotificationsScreen({
  session,
  initialFeed
}: NotificationsScreenProps) {
  const [entries, setEntries] = useState<NotificationEntry[]>(initialFeed.entries);
  const [unreadCount, setUnreadCount] = useState(initialFeed.unreadCount);

  async function markAsRead(notificationId: string) {
    try {
      await fetch(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: "POST"
      });
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === notificationId ? { ...entry, read: true } : entry
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // fail silently — optimistic state is fine for read markers
    }
  }

  async function markAllAsRead() {
    try {
      await fetch("/api/v1/notifications/read-all", { method: "POST" });
      setEntries((prev) => prev.map((entry) => ({ ...entry, read: true })));
      setUnreadCount(0);
    } catch {
      // fail silently
    }
  }

  return (
    <AppShell
      title="notifications"
      subtitle={`${unreadCount} unread`}
      session={session}
    >
      <section className="slice-panel">
        <div
          className="slice-row"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <p className="slice-label" data-testid="notification-unread-count">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
          {unreadCount > 0 && (
            <button
              className="slice-button ghost"
              onClick={markAllAsRead}
              type="button"
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
              data-testid="mark-all-read-button"
            >
              mark all as read
            </button>
          )}
        </div>
      </section>

      <section className="slice-panel" data-testid="notification-feed">
        {entries.length === 0 ? (
          <p className="slice-copy">no notifications yet.</p>
        ) : (
          <ul className="slice-list" aria-label="notifications">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="slice-list-row"
                data-testid="notification-entry"
                style={{
                  opacity: entry.read ? 0.65 : 1,
                  borderLeft: entry.read
                    ? "3px solid transparent"
                    : "3px solid rgb(80, 220, 180)"
                }}
              >
                <div style={{ flex: 1 }}>
                  <p className="slice-label">
                    {TYPE_ICON[entry.type] ?? entry.type} · {formatTimestamp(entry.createdAt)}
                  </p>
                  <p className="slice-copy" style={{ fontWeight: entry.read ? "normal" : "bold" }}>
                    {entry.title}
                  </p>
                  <p className="slice-meta">{entry.body}</p>
                </div>
                <div
                  className="slice-button-row"
                  style={{ flexShrink: 0, gap: "0.25rem" }}
                >
                  {entry.href && (
                    <a
                      href={entry.href}
                      className="slice-button ghost"
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                    >
                      open
                    </a>
                  )}
                  {!entry.read && (
                    <button
                      className="slice-button ghost"
                      onClick={() => markAsRead(entry.id)}
                      type="button"
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                      data-testid="mark-read-button"
                    >
                      mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="slice-button-row" style={{ marginTop: "1rem" }}>
        <Link href={routes.settingsNotifications()} className="slice-button alt">
          notification preferences
        </Link>
      </div>
    </AppShell>
  );
}
