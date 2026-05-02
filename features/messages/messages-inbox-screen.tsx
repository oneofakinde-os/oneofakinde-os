import { AppShell } from "@/features/shell/app-shell";
import type { MessageInbox, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type FormAction = (formData: FormData) => void | Promise<void>;

type MessagesInboxScreenProps = {
  session: Session;
  inbox: MessageInbox;
  createAction: FormAction;
  statusMessage?: string | null;
};

function formatTimestamp(value: string | null): string {
  if (!value) return "no messages yet";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  const date = new Date(parsed);
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`;
}

export function MessagesInboxScreen({
  session,
  inbox,
  createAction,
  statusMessage
}: MessagesInboxScreenProps) {
  return (
    <AppShell
      title="messages"
      subtitle={`${inbox.unreadCount} unread - ${inbox.requestCount} requests`}
      session={session}
      activeNav="messages"
    >
      {statusMessage ? (
        <section className="slice-panel" data-testid="message-status">
          <p className="slice-meta">{statusMessage}</p>
        </section>
      ) : null}

      <section className="slice-panel">
        <p className="slice-label">new thread</p>
        <form action={createAction} className="slice-form" data-testid="message-create-form">
          <label className="slice-field">
            to
            <input
              className="slice-input"
              name="recipients"
              placeholder="handles separated by commas"
              required
            />
          </label>
          <label className="slice-field">
            title
            <input
              className="slice-input"
              name="title"
              placeholder="optional for group messages"
            />
          </label>
          <label className="slice-field">
            message
            <textarea
              className="slice-textarea"
              name="body"
              placeholder="write a private message"
              rows={4}
              maxLength={1200}
              required
            />
          </label>
          <div className="slice-button-row">
            <button className="slice-button" type="submit">
              send message
            </button>
          </div>
        </form>
      </section>

      <section className="slice-panel" data-testid="message-inbox">
        <div className="slice-row">
          <p className="slice-label">threads</p>
          <p className="slice-meta">{inbox.threads.length} total</p>
        </div>

        {inbox.threads.length === 0 ? (
          <p className="slice-copy">no messages yet. start a direct or group thread.</p>
        ) : (
          <ul className="slice-list" aria-label="message threads">
            {inbox.threads.map((thread) => (
              <li
                key={thread.id}
                className="slice-drop-card"
                data-testid="message-thread-summary"
                data-requested={thread.requestState === "requested" ? "true" : undefined}
              >
                <div className="slice-row">
                  <p className="slice-label">{thread.kind === "group" ? "group" : "direct"}</p>
                  <p className="slice-meta">{formatTimestamp(thread.lastMessageAt)}</p>
                </div>
                <h2 className="slice-title">{thread.title}</h2>
                <p className="slice-meta">
                  {thread.participantHandles.map((handle) => `@${handle}`).join(", ")}
                </p>
                {thread.lastMessagePreview ? (
                  <p className="slice-copy">{thread.lastMessagePreview}</p>
                ) : (
                  <p className="slice-copy">no messages yet.</p>
                )}
                <div className="slice-button-row">
                  {thread.unreadCount > 0 ? (
                    <span className="slice-meta">{thread.unreadCount} unread</span>
                  ) : null}
                  {thread.requestState === "requested" ? (
                    <span className="slice-meta">request</span>
                  ) : null}
                  <Link href={routes.messageThread(thread.id)} className="slice-button ghost">
                    open thread
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
