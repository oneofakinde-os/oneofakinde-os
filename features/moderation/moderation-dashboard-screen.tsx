"use client";

import { AppShell } from "@/features/shell/app-shell";
import type {
  LiveSessionConversationModerationQueueItem,
  Session,
  TownhallModerationQueueItem,
  WorldConversationModerationQueueItem
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { useCallback, useState } from "react";

type ModerationDashboardScreenProps = {
  session: Session;
  initialWorldConversationQueue: WorldConversationModerationQueueItem[];
  initialTownhallQueue: TownhallModerationQueueItem[];
  initialLiveSessionQueue: LiveSessionConversationModerationQueueItem[];
};

type ModerationLane = "all" | "world_conversation" | "townhall_comments" | "live_session";
type Resolution = "hide" | "restrict" | "delete" | "restore" | "dismiss";

const LANE_LABEL: Record<ModerationLane, string> = {
  all: "all queues",
  world_conversation: "world conversations",
  townhall_comments: "townhall comments",
  live_session: "live sessions"
};

const RESOLUTION_OPTIONS: Resolution[] = ["hide", "restrict", "delete", "restore", "dismiss"];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 10);
}

function WorldConversationItem({
  item,
  onResolve
}: {
  item: WorldConversationModerationQueueItem;
  onResolve: (worldId: string, messageId: string, resolution: Resolution) => void;
}) {
  return (
    <li className="slice-drop-card" data-testid="moderation-queue-item">
      <p className="slice-label">world conversation · {item.worldTitle}</p>
      <p className="slice-copy">@{item.authorHandle}: {item.body}</p>
      <p className="slice-meta">
        visibility: {item.visibility} · reports: {item.reportCount}
        {item.appealRequested ? " · appeal requested" : ""}
      </p>
      <p className="slice-meta">
        reported: {formatDate(item.reportedAt)} · created: {formatDate(item.createdAt)}
      </p>
      <div className="slice-button-row">
        {RESOLUTION_OPTIONS.map((r) => (
          <button
            key={r}
            className="slice-button ghost"
            onClick={() => onResolve(item.worldId, item.messageId, r)}
            type="button"
          >
            {r}
          </button>
        ))}
      </div>
    </li>
  );
}

function TownhallItem({
  item,
  onResolve
}: {
  item: TownhallModerationQueueItem;
  onResolve: (dropId: string, commentId: string, resolution: Resolution) => void;
}) {
  return (
    <li className="slice-drop-card" data-testid="moderation-queue-item">
      <p className="slice-label">townhall comment · {item.dropTitle}</p>
      <p className="slice-copy">@{item.authorHandle}: {item.body}</p>
      <p className="slice-meta">
        visibility: {item.visibility} · reports: {item.reportCount}
        {item.appealRequested ? " · appeal requested" : ""}
      </p>
      <p className="slice-meta">
        reported: {formatDate(item.reportedAt)} · created: {formatDate(item.createdAt)}
      </p>
      <div className="slice-button-row">
        {RESOLUTION_OPTIONS.map((r) => (
          <button
            key={r}
            className="slice-button ghost"
            onClick={() => onResolve(item.dropId, item.commentId, r)}
            type="button"
          >
            {r}
          </button>
        ))}
      </div>
    </li>
  );
}

function LiveSessionItem({
  item,
  onResolve
}: {
  item: LiveSessionConversationModerationQueueItem;
  onResolve: (sessionId: string, messageId: string, resolution: Resolution) => void;
}) {
  return (
    <li className="slice-drop-card" data-testid="moderation-queue-item">
      <p className="slice-label">live session · {item.liveSessionTitle}</p>
      <p className="slice-copy">@{item.authorHandle}: {item.body}</p>
      <p className="slice-meta">
        visibility: {item.visibility} · reports: {item.reportCount}
        {item.appealRequested ? " · appeal requested" : ""}
      </p>
      <p className="slice-meta">
        reported: {formatDate(item.reportedAt)} · created: {formatDate(item.createdAt)}
      </p>
      <div className="slice-button-row">
        {RESOLUTION_OPTIONS.map((r) => (
          <button
            key={r}
            className="slice-button ghost"
            onClick={() => onResolve(item.liveSessionId, item.messageId, r)}
            type="button"
          >
            {r}
          </button>
        ))}
      </div>
    </li>
  );
}

export function ModerationDashboardScreen({
  session,
  initialWorldConversationQueue,
  initialTownhallQueue,
  initialLiveSessionQueue
}: ModerationDashboardScreenProps) {
  const [worldQueue, setWorldQueue] = useState(initialWorldConversationQueue);
  const [townhallQueue, setTownhallQueue] = useState(initialTownhallQueue);
  const [liveQueue, setLiveQueue] = useState(initialLiveSessionQueue);
  const [activeLane, setActiveLane] = useState<ModerationLane>("all");

  const totalItems = worldQueue.length + townhallQueue.length + liveQueue.length;

  const resolveWorldConversation = useCallback(
    async (worldId: string, messageId: string, resolution: Resolution) => {
      const res = await fetch(
        `/api/v1/workshop/moderation/world-conversation/${encodeURIComponent(worldId)}/${encodeURIComponent(messageId)}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution })
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.queue) setWorldQueue(data.queue);
      }
    },
    []
  );

  const resolveTownhall = useCallback(
    async (dropId: string, commentId: string, resolution: Resolution) => {
      const res = await fetch(
        `/api/v1/workshop/moderation/comments/${encodeURIComponent(dropId)}/${encodeURIComponent(commentId)}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution })
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.queue) setTownhallQueue(data.queue);
      }
    },
    []
  );

  const resolveLiveSession = useCallback(
    async (sessionId: string, messageId: string, resolution: Resolution) => {
      const res = await fetch(
        `/api/v1/workshop/moderation/live-session-conversation/${encodeURIComponent(sessionId)}/${encodeURIComponent(messageId)}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution })
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.queue) setLiveQueue(data.queue);
      }
    },
    []
  );

  const showWorld = activeLane === "all" || activeLane === "world_conversation";
  const showTownhall = activeLane === "all" || activeLane === "townhall_comments";
  const showLive = activeLane === "all" || activeLane === "live_session";

  return (
    <AppShell
      title="moderation"
      subtitle="unified moderation dashboard for creators"
      session={session}
      activeNav="workshop"
    >
      <section className="slice-panel">
        <h2 className="slice-title">moderation dashboard</h2>
        <p className="slice-copy">
          {totalItems} items across all queues.
        </p>
        <div className="slice-button-row">
          {(Object.keys(LANE_LABEL) as ModerationLane[]).map((lane) => (
            <button
              key={lane}
              className={`slice-button ${activeLane === lane ? "" : "ghost"}`}
              onClick={() => setActiveLane(lane)}
              type="button"
            >
              {LANE_LABEL[lane]}
              {lane === "world_conversation" ? ` (${worldQueue.length})` : ""}
              {lane === "townhall_comments" ? ` (${townhallQueue.length})` : ""}
              {lane === "live_session" ? ` (${liveQueue.length})` : ""}
            </button>
          ))}
        </div>
        <div className="slice-button-row">
          <Link href={routes.workshop()} className="slice-button alt">
            ← back to workshop
          </Link>
        </div>
      </section>

      {showWorld ? (
        <section className="slice-panel" data-testid="moderation-world-conversation-queue">
          <p className="slice-label">world conversation queue ({worldQueue.length})</p>
          {worldQueue.length === 0 ? (
            <p className="slice-meta">no world conversation items in queue.</p>
          ) : (
            <ul className="slice-grid" aria-label="world conversation moderation queue">
              {worldQueue.map((item) => (
                <WorldConversationItem
                  key={`${item.worldId}-${item.messageId}`}
                  item={item}
                  onResolve={resolveWorldConversation}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showTownhall ? (
        <section className="slice-panel" data-testid="moderation-townhall-queue">
          <p className="slice-label">townhall comments queue ({townhallQueue.length})</p>
          {townhallQueue.length === 0 ? (
            <p className="slice-meta">no townhall comment items in queue.</p>
          ) : (
            <ul className="slice-grid" aria-label="townhall comments moderation queue">
              {townhallQueue.map((item) => (
                <TownhallItem
                  key={`${item.dropId}-${item.commentId}`}
                  item={item}
                  onResolve={resolveTownhall}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showLive ? (
        <section className="slice-panel" data-testid="moderation-live-session-queue">
          <p className="slice-label">live session queue ({liveQueue.length})</p>
          {liveQueue.length === 0 ? (
            <p className="slice-meta">no live session items in queue.</p>
          ) : (
            <ul className="slice-grid" aria-label="live session moderation queue">
              {liveQueue.map((item) => (
                <LiveSessionItem
                  key={`${item.liveSessionId}-${item.messageId}`}
                  item={item}
                  onResolve={resolveLiveSession}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </AppShell>
  );
}
