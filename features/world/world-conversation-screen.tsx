"use client";

import { AppShell } from "@/features/shell/app-shell";
import type {
  Session,
  World,
  WorldConversationMessage,
  WorldConversationThread
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { useCallback, useState } from "react";

type WorldConversationScreenProps = {
  world: World;
  session: Session;
  initialThread: WorldConversationThread;
};

const VISIBILITY_LABEL: Record<string, string> = {
  visible: "visible",
  hidden: "hidden by moderator",
  restricted: "restricted",
  deleted: "deleted"
};

function formatTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  const d = new Date(parsed);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}

function ConversationMessage({
  message,
  onReply,
  onModerate
}: {
  message: WorldConversationMessage;
  onReply: (messageId: string) => void;
  onModerate: (messageId: string, resolution: string) => void;
}) {
  const isHidden = message.visibility !== "visible";
  return (
    <li
      className="slice-drop-card"
      style={{ marginLeft: `${Math.min(message.depth, 4) * 1}rem` }}
      data-testid="conversation-message"
    >
      <p className="slice-label">@{message.authorHandle}</p>
      {isHidden ? (
        <p className="slice-meta">[{VISIBILITY_LABEL[message.visibility]}]</p>
      ) : (
        <p className="slice-copy">{message.body}</p>
      )}
      <p className="slice-meta">
        {formatTimestamp(message.createdAt)}
        {message.replyCount > 0 ? ` · ${message.replyCount} replies` : ""}
        {message.reportCount > 0 ? ` · ${message.reportCount} reports` : ""}
      </p>
      <div className="slice-button-row">
        {message.canReply ? (
          <button
            className="slice-button ghost"
            onClick={() => onReply(message.id)}
            type="button"
          >
            reply
          </button>
        ) : null}
        {message.canModerate ? (
          <button
            className="slice-button ghost"
            onClick={() => onModerate(message.id, "hide")}
            type="button"
          >
            moderate
          </button>
        ) : null}
        {message.canReport ? (
          <button
            className="slice-button ghost"
            onClick={() => onModerate(message.id, "report")}
            type="button"
          >
            report
          </button>
        ) : null}
        {message.appealRequested ? (
          <span className="slice-meta">appeal requested</span>
        ) : message.canAppeal ? (
          <button
            className="slice-button ghost"
            onClick={() => onModerate(message.id, "appeal")}
            type="button"
          >
            appeal
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function WorldConversationScreen({
  world,
  session,
  initialThread
}: WorldConversationScreenProps) {
  const [thread, setThread] = useState<WorldConversationThread>(initialThread);
  const [composerBody, setComposerBody] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const body = composerBody.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/worlds/${encodeURIComponent(world.id)}/conversation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body,
            ...(replyToId ? { parentMessageId: replyToId } : {})
          })
        }
      );
      if (res.ok) {
        const data = await res.json();
        setThread(data.thread);
        setComposerBody("");
        setReplyToId(null);
      }
    } finally {
      setSubmitting(false);
    }
  }, [composerBody, replyToId, submitting, world.id]);

  const handleReply = useCallback((messageId: string) => {
    setReplyToId(messageId);
  }, []);

  const handleModerate = useCallback(
    async (messageId: string, resolution: string) => {
      if (resolution === "report" || resolution === "appeal") return;
      const res = await fetch(
        `/api/v1/workshop/moderation/world-conversation/${encodeURIComponent(world.id)}/${encodeURIComponent(messageId)}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution })
        }
      );
      if (res.ok) {
        const refreshRes = await fetch(
          `/api/v1/worlds/${encodeURIComponent(world.id)}/conversation`
        );
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setThread(data.thread);
        }
      }
    },
    [world.id]
  );

  const replyTarget = replyToId
    ? thread.messages.find((m) => m.id === replyToId)
    : null;

  return (
    <AppShell
      title="world conversation"
      subtitle={`conversation thread for ${world.title}`}
      session={session}
      activeNav="worlds"
    >
      <section className="slice-panel">
        <p className="slice-label">
          <Link href={routes.world(world.id)} className="slice-link">
            ← {world.title}
          </Link>
        </p>
        <h2 className="slice-title">world conversation</h2>
        <p className="slice-copy">
          {thread.messages.length} messages in this thread.
        </p>
      </section>

      <section className="slice-panel" data-testid="conversation-composer">
        <p className="slice-label">
          {replyTarget
            ? `replying to @${replyTarget.authorHandle}`
            : "new message"}
        </p>
        {replyToId ? (
          <button
            className="slice-button ghost"
            onClick={() => setReplyToId(null)}
            type="button"
            style={{ marginBottom: "0.5rem" }}
          >
            cancel reply
          </button>
        ) : null}
        <textarea
          className="slice-textarea"
          placeholder="write a message..."
          value={composerBody}
          onChange={(e) => setComposerBody(e.target.value)}
          rows={3}
          data-testid="conversation-composer-input"
        />
        <div className="slice-button-row">
          <button
            className="slice-button"
            onClick={handleSubmit}
            disabled={!composerBody.trim() || submitting}
            type="button"
            data-testid="conversation-composer-submit"
          >
            {submitting ? "posting..." : "post message"}
          </button>
        </div>
      </section>

      <section className="slice-panel" data-testid="conversation-thread">
        <p className="slice-label">thread</p>
        {thread.messages.length === 0 ? (
          <p className="slice-meta">
            no messages yet. start the conversation.
          </p>
        ) : (
          <ul className="slice-grid" aria-label="conversation messages">
            {thread.messages.map((msg) => (
              <ConversationMessage
                key={msg.id}
                message={msg}
                onReply={handleReply}
                onModerate={handleModerate}
              />
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
