"use client";

import type { LiveSessionConversationThread } from "@/lib/domain/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

type LiveSessionConversationProps = {
  liveSessionId: string;
  initialThread: LiveSessionConversationThread | null;
  canPost: boolean;
};

const POLL_INTERVAL_MS = 5000;

function formatTime(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "";
  return new Date(parsed).toISOString().slice(11, 16);
}

export function LiveSessionConversation({
  liveSessionId,
  initialThread,
  canPost
}: LiveSessionConversationProps) {
  const [thread, setThread] = useState(initialThread);
  const [messageBody, setMessageBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messages = thread?.messages ?? [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Poll for new messages
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(
          `/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/conversation`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.thread) {
            setThread(data.thread);
          }
        }
      } catch {
        // Silently ignore polling failures
      }
    }

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [liveSessionId]);

  const handleSend = useCallback(async () => {
    const body = messageBody.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/live-sessions/${encodeURIComponent(liveSessionId)}/conversation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body })
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.thread) {
          setThread(data.thread);
        }
        setMessageBody("");
      }
    } finally {
      setSubmitting(false);
    }
  }, [messageBody, submitting, liveSessionId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <section className="slice-panel" data-testid="live-session-conversation">
      <h3 className="slice-heading">live chat</h3>
      <div
        style={{
          maxHeight: "20rem",
          overflowY: "auto",
          padding: "0.5rem 0"
        }}
        data-testid="live-chat-messages"
      >
        {messages.length === 0 ? (
          <p className="slice-copy" style={{ opacity: 0.5 }}>
            {canPost ? "no messages yet — start the conversation" : "no messages yet"}
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {messages.map((message) => (
              <li
                key={message.id}
                style={{
                  padding: "0.375rem 0",
                  borderBottom: "1px solid rgba(255,255,255,0.06)"
                }}
                data-testid="live-chat-message"
              >
                <p className="slice-label" style={{ fontWeight: 600, display: "inline" }}>
                  @{message.authorHandle}
                </p>
                <span className="slice-meta" style={{ marginLeft: "0.5rem" }}>
                  {formatTime(message.createdAt ?? "")}
                </span>
                <p className="slice-copy" style={{ margin: "0.125rem 0 0" }}>
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div ref={messagesEndRef} />
      </div>

      {canPost ? (
        <div
          style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}
          data-testid="live-chat-composer"
        >
          <input
            type="text"
            className="slice-textarea"
            placeholder="type a message..."
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={submitting}
            style={{ flex: 1, padding: "0.5rem" }}
            data-testid="live-chat-input"
          />
          <button
            className="slice-button"
            onClick={handleSend}
            disabled={!messageBody.trim() || submitting}
            type="button"
            data-testid="live-chat-send"
          >
            {submitting ? "..." : "send"}
          </button>
        </div>
      ) : (
        <p className="slice-meta" style={{ marginTop: "0.5rem" }}>
          sign in to participate in live chat
        </p>
      )}
    </section>
  );
}
