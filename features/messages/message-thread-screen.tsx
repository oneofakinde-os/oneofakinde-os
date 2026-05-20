import { AppShell } from "@/features/shell/app-shell";
import type { MessageThread, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type FormAction = (formData: FormData) => void | Promise<void>;

type MessageThreadScreenProps = {
  session: Session;
  thread: MessageThread;
  sendAction: FormAction;
  stateAction: FormAction;
  reportAction: FormAction;
  statusMessage?: string | null;
};

function formatTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  const date = new Date(parsed);
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`;
}

export function MessageThreadScreen({
  session,
  thread,
  sendAction,
  stateAction,
  reportAction,
  statusMessage
}: MessageThreadScreenProps) {
  return (
    <AppShell
      title="messages"
      subtitle={thread.title}
      session={session}
      activeNav="messages"
    >
      <section className="slice-panel">
        <p className="slice-label">
          <Link href={routes.messages()} className="slice-link">
            back to messages
          </Link>
        </p>
        <div className="slice-row">
          <div>
            <p className="slice-label">{thread.kind === "group" ? "group thread" : "direct thread"}</p>
            <h2 className="slice-title">{thread.title}</h2>
          </div>
          {thread.unreadCount > 0 ? (
            <form action={stateAction}>
              <input type="hidden" name="threadId" value={thread.id} />
              <input type="hidden" name="action" value="mark_read" />
              <button className="slice-button ghost sm" type="submit">
                mark read
              </button>
            </form>
          ) : null}
        </div>
        <p className="slice-meta">
          {thread.participants
            .map((participant) => `@${participant.handle} (${participant.status})`)
            .join(", ")}
        </p>
      </section>

      {statusMessage ? (
        <section className="slice-panel" data-testid="message-thread-status">
          <p className="slice-meta">{statusMessage}</p>
        </section>
      ) : null}

      {thread.requestState === "requested" ? (
        <section className="slice-panel" data-testid="message-request-panel">
          <p className="slice-label">message request</p>
          <p className="slice-copy">
            Accept this request to keep replying, or decline to hide it from your inbox.
          </p>
          <div className="slice-button-row">
            <form action={stateAction}>
              <input type="hidden" name="threadId" value={thread.id} />
              <input type="hidden" name="action" value="accept" />
              <button className="slice-button" type="submit">
                accept
              </button>
            </form>
            <form action={stateAction}>
              <input type="hidden" name="threadId" value={thread.id} />
              <input type="hidden" name="action" value="decline" />
              <button className="slice-button ghost" type="submit">
                decline
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <section className="slice-panel" data-testid="message-thread">
        <p className="slice-label">thread</p>
        {thread.messages.length === 0 ? (
          <p className="slice-copy">no messages yet.</p>
        ) : (
          <ul className="slice-list" aria-label="private messages">
            {thread.messages.map((message) => (
              <li
                key={message.id}
                className="slice-drop-card"
                data-testid="message-entry"
                data-author={message.authorHandle}
              >
                <div className="slice-row">
                  <p className="slice-label">@{message.authorHandle}</p>
                  <p className="slice-meta">{formatTimestamp(message.createdAt)}</p>
                </div>
                <p className="slice-copy">{message.body}</p>
                {message.readBy.length > 0 ? (
                  <p className="slice-meta">
                    read by {message.readBy.map((handle) => `@${handle}`).join(", ")}
                  </p>
                ) : null}
                {message.reportCount > 0 ? (
                  <p className="slice-meta">reported {message.reportCount} time{message.reportCount === 1 ? "" : "s"}</p>
                ) : null}
                {message.canReport ? (
                  <form action={reportAction} className="slice-button-row">
                    <input type="hidden" name="threadId" value={thread.id} />
                    <input type="hidden" name="messageId" value={message.id} />
                    <button className="slice-button ghost sm" type="submit">
                      report message
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {thread.typingIndicators.length > 0 ? (
        <section className="slice-panel">
          <p className="slice-meta" aria-live="polite">
            {thread.typingIndicators.map((ti) => `@${ti.handle}`).join(", ")}{" "}
            {thread.typingIndicators.length === 1 ? "is" : "are"} typing...
          </p>
        </section>
      ) : null}

      {thread.requestState !== "declined" ? (
        <section className="slice-panel">
          <p className="slice-label">reply</p>
          <form action={sendAction} className="slice-form" data-testid="message-send-form">
            <input type="hidden" name="threadId" value={thread.id} />
            <label className="slice-field">
              message
              <textarea
                className="slice-textarea"
                name="body"
                placeholder="write a reply"
                rows={4}
                maxLength={1200}
                required
              />
            </label>
            <div className="slice-button-row">
              <button className="slice-button" type="submit">
                send reply
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </AppShell>
  );
}
