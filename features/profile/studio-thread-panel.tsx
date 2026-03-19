"use client";

import type { TownhallPost } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";
import type { Route } from "next";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

type StudioThreadPanelProps = {
  studioHandle: string;
  canInteract: boolean;
  canModerate: boolean;
  signInHref: Route;
  dropContextOptions: Array<{
    id: string;
    title: string;
  }>;
};

type StudioConversationThread = {
  studioHandle: string;
  studioTitle: string;
  posts: TownhallPost[];
};

type StudioConversationPayload = {
  thread?: StudioConversationThread;
};

type StudioConversationAction =
  | "report"
  | "appeal"
  | "hide"
  | "restrict"
  | "delete"
  | "restore"
  | "dismiss";

const DEFAULT_CONTEXT_KEY = "studio";

function createEmptyThread(studioHandle: string): StudioConversationThread {
  return {
    studioHandle,
    studioTitle: `@${studioHandle}`,
    posts: []
  };
}

function formatTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return "just now";
  }

  return new Date(parsed).toLocaleString();
}

function bodyForVisibility(post: TownhallPost): string {
  if (post.visibility === "hidden") return "post hidden by moderation.";
  if (post.visibility === "restricted") return "post restricted by moderation.";
  if (post.visibility === "deleted") return "post deleted by moderation.";
  return post.body;
}

function moderationActionsForPost(post: TownhallPost): StudioConversationAction[] {
  if (post.visibility === "visible") {
    const actions: StudioConversationAction[] = ["hide", "restrict", "delete"];
    if (post.reportCount > 0 || post.appealRequested) {
      actions.push("dismiss");
    }
    return actions;
  }

  const actions: StudioConversationAction[] = ["restore"];
  if (post.reportCount > 0 || post.appealRequested) {
    actions.push("dismiss");
  }
  return actions;
}

function labelForModerationAction(action: StudioConversationAction): string {
  if (action === "dismiss") {
    return "dismiss reports";
  }
  return action;
}

export function StudioThreadPanel({
  studioHandle,
  canInteract,
  canModerate,
  signInHref,
  dropContextOptions
}: StudioThreadPanelProps) {
  const [thread, setThread] = useState<StudioConversationThread>(() => createEmptyThread(studioHandle));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [contextSelection, setContextSelection] = useState(DEFAULT_CONTEXT_KEY);
  const [submitting, setSubmitting] = useState(false);
  const [actingMessageId, setActingMessageId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadThread() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/v1/studios/${encodeURIComponent(studioHandle)}/conversation?limit=24`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`failed to load studio thread (${response.status})`);
        }

        const payload = (await response.json()) as StudioConversationPayload;
        if (!active) {
          return;
        }

        setThread(payload.thread ?? createEmptyThread(studioHandle));
      } catch {
        if (!active) {
          return;
        }
        setError("studio thread is temporarily unavailable.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadThread();

    return () => {
      active = false;
    };
  }, [studioHandle]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || submitting || !canInteract) {
      return;
    }

    const linkedObject =
      contextSelection.startsWith("drop:")
        ? {
            kind: "drop",
            id: contextSelection.slice("drop:".length)
          }
        : undefined;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/studios/${encodeURIComponent(studioHandle)}/conversation`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          body,
          linkedObject
        })
      });

      if (response.status === 401) {
        window.location.assign(signInHref);
        return;
      }

      if (!response.ok) {
        throw new Error(`failed to create studio thread post (${response.status})`);
      }

      const payload = (await response.json()) as StudioConversationPayload;
      if (!payload.thread) {
        throw new Error("missing thread in studio thread create response");
      }

      setThread(payload.thread);
      setDraft("");
      setContextSelection(DEFAULT_CONTEXT_KEY);
    } catch {
      setError("could not post to the studio thread. try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function applyAction(messageId: string, action: StudioConversationAction) {
    if (!canInteract || actingMessageId) {
      return;
    }

    setActingMessageId(messageId);
    setError(null);

    try {
      const response = await fetch(`/api/v1/studios/${encodeURIComponent(studioHandle)}/conversation`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          action,
          messageId
        })
      });

      if (response.status === 401) {
        window.location.assign(signInHref);
        return;
      }

      if (!response.ok) {
        throw new Error(`failed to apply studio thread action (${response.status})`);
      }

      const payload = (await response.json()) as StudioConversationPayload;
      if (!payload.thread) {
        throw new Error("missing thread in studio thread action response");
      }

      setThread(payload.thread);
    } catch {
      setError("could not update this studio thread post.");
    } finally {
      setActingMessageId(null);
    }
  }

  return (
    <section className="slice-panel" data-testid="studio-thread-panel" aria-label="studio thread panel">
      <p className="slice-label">studio thread</p>
      <p className="slice-copy">public thread for notes, reflections, and moderation-safe discourse.</p>
      <p className="slice-meta">
        <Link href={routes.townhall()} className="slice-button ghost">
          open townhall lane
        </Link>{" "}
        to cross-post notes into broader discovery.
      </p>

      {loading ? <p className="slice-meta">loading studio thread…</p> : null}
      {error ? <p className="slice-meta">{error}</p> : null}

      {!loading && thread.posts.length === 0 ? (
        <p className="slice-copy">no studio thread posts yet. publish the first note from this surface.</p>
      ) : (
        <ul className="dropflow-bullet-list" aria-label="studio thread posts">
          {thread.posts.map((post) => (
            <li key={post.id}>
              <strong>@{post.authorHandle}</strong> · {formatTimestamp(post.createdAt)}
              <p>{bodyForVisibility(post)}</p>
              {post.linkedObject ? (
                <p className="slice-meta">
                  linked {post.linkedObject.kind}:{" "}
                  <Link href={post.linkedObject.href as Route} className="slice-button ghost">
                    {post.linkedObject.label}
                  </Link>
                </p>
              ) : null}
              <div className="slice-button-row">
                {post.canReport ? (
                  <button
                    type="button"
                    className="slice-button ghost"
                    onClick={() => void applyAction(post.id, "report")}
                    disabled={actingMessageId === post.id}
                  >
                    report
                  </button>
                ) : null}
                {post.canAppeal ? (
                  <button
                    type="button"
                    className="slice-button ghost"
                    onClick={() => void applyAction(post.id, "appeal")}
                    disabled={actingMessageId === post.id}
                  >
                    appeal
                  </button>
                ) : null}
                {canModerate && post.canModerate
                  ? moderationActionsForPost(post).map((action) => (
                      <button
                        key={`${post.id}-${action}`}
                        type="button"
                        className="slice-button alt"
                        onClick={() => void applyAction(post.id, action)}
                        disabled={actingMessageId === post.id}
                      >
                        {labelForModerationAction(action)}
                      </button>
                    ))
                  : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canInteract ? (
        <form className="slice-form" onSubmit={submitMessage}>
          <label className="slice-field">
            post note
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="slice-input"
              aria-label="write studio thread note"
              placeholder="write a studio note"
              maxLength={1200}
            />
          </label>
          <label className="slice-field">
            context
            <select
              className="slice-input"
              value={contextSelection}
              onChange={(event) => setContextSelection(event.target.value)}
              aria-label="studio thread context"
            >
              <option value={DEFAULT_CONTEXT_KEY}>studio thread</option>
              {dropContextOptions.map((drop) => (
                <option key={drop.id} value={`drop:${drop.id}`}>
                  drop context · {drop.title}
                </option>
              ))}
            </select>
          </label>
          <div className="slice-button-row">
            <button
              type="submit"
              className="slice-button"
              disabled={submitting || draft.trim().length === 0}
            >
              {submitting ? "posting…" : "post to thread"}
            </button>
          </div>
        </form>
      ) : (
        <p className="slice-meta">
          <Link href={signInHref} className="slice-button">
            sign in
          </Link>{" "}
          to post and act on studio thread items.
        </p>
      )}
    </section>
  );
}
