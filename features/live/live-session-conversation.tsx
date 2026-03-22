"use client";

import type { LiveSessionConversationThread } from "@/lib/domain/contracts";
import { useEventStream } from "@/lib/hooks/use-event-stream";
import { useCallback, useEffect, useRef, useState } from "react";
import "./live-chat.css";

type LiveSessionConversationProps = {
  liveSessionId: string;
  initialThread: LiveSessionConversationThread | null;
  canPost: boolean;
};

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

  const messages = thread?.messages ?? [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // SSE stream with polling fallback
  const encodedId = encodeURIComponent(liveSessionId);
  const { connectionState } = useEventStream<{ thread: LiveSessionConversationThread }>(
    `/api/v1/live-sessions/${encodedId}/conversation/stream`,
    {
      onMessage: (data) => {
        if (data.thread) {
          setThread(data.thread);
        }
      },
      fallbackPollMs: 5_000,
      fallbackFetchUrl: `/api/v1/live-sessions/${encodedId}/conversation`,
    }
  );

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
      <h3 className="slice-heading">
        live chat
        {connectionState === "open" ? (
          <span className="slice-meta" style={{ marginLeft: "0.5rem" }}>● live</span>
        ) : connectionState === "polling" ? (
          <span className="slice-meta" style={{ marginLeft: "0.5rem" }}>↻ polling</span>
        ) : null}
      </h3>
      <div className="live-chat-messages" data-testid="live-chat-messages">
        {messages.length === 0 ? (
          <p className="slice-copy live-chat-placeholder">
            {canPost ? "no messages yet — start the conversation" : "no messages yet"}
          </p>
        ) : (
          <ul className="live-chat-message-list">
            {messages.map((message) => (
              <li
                key={message.id}
                className="live-chat-message"
                data-testid="live-chat-message"
              >
                <p className="slice-label live-chat-author">
                  @{message.authorHandle}
                </p>
                <span className="slice-meta live-chat-time">
                  {formatTime(message.createdAt ?? "")}
                </span>
                <p className="slice-copy live-chat-body">
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div ref={messagesEndRef} />
      </div>

      {canPost ? (
        <div className="live-chat-composer" data-testid="live-chat-composer">
          <input
            type="text"
            className="slice-textarea live-chat-input"
            placeholder="type a message..."
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={submitting}
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
        <p className="slice-meta live-chat-signin">
          sign in to participate in live chat
        </p>
      )}
    </section>
  );
}
