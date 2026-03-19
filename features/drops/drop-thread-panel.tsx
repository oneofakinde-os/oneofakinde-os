"use client";

import type { TownhallDropSocialSnapshot } from "@/lib/domain/contracts";
import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";

type DropThreadPanelProps = {
  dropId: string;
  canInteract: boolean;
  signInHref: Route;
};

type TownhallSocialPayload = {
  social?: {
    byDropId?: Record<string, TownhallDropSocialSnapshot>;
  };
};

type TownhallSocialMutationPayload = {
  social?: TownhallDropSocialSnapshot;
};

function createEmptySnapshot(dropId: string): TownhallDropSocialSnapshot {
  return {
    dropId,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    saveCount: 0,
    likedByViewer: false,
    savedByViewer: false,
    comments: []
  };
}

function formatCommentTimestamp(value: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    return "just now";
  }

  return new Date(time).toLocaleString();
}

function commentBodyForVisibility(comment: TownhallDropSocialSnapshot["comments"][number]): string {
  if (comment.visibility === "hidden") return "comment hidden by moderation.";
  if (comment.visibility === "restricted") return "comment restricted by moderation.";
  if (comment.visibility === "deleted") return "comment deleted by moderation.";
  return comment.body;
}

export function DropThreadPanel({ dropId, canInteract, signInHref }: DropThreadPanelProps) {
  const [social, setSocial] = useState<TownhallDropSocialSnapshot>(() => createEmptySnapshot(dropId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSocialSnapshot() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/v1/townhall/social?drop_ids=${encodeURIComponent(dropId)}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`failed to load social snapshot (${response.status})`);
        }

        const payload = (await response.json()) as TownhallSocialPayload;
        const next = payload.social?.byDropId?.[dropId] ?? createEmptySnapshot(dropId);

        if (!active) {
          return;
        }
        setSocial({
          ...next,
          comments: [...next.comments]
        });
      } catch {
        if (!active) {
          return;
        }
        setError("thread is temporarily unavailable.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSocialSnapshot();

    return () => {
      active = false;
    };
  }, [dropId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || submitting || !canInteract) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/townhall/social/comments/${encodeURIComponent(dropId)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ body })
        }
      );

      if (response.status === 401) {
        window.location.assign(signInHref);
        return;
      }

      if (!response.ok) {
        throw new Error(`failed to post drop thread comment (${response.status})`);
      }

      const payload = (await response.json()) as TownhallSocialMutationPayload;
      if (!payload.social) {
        throw new Error("missing social payload from comment mutation");
      }

      setSocial({
        ...payload.social,
        comments: [...payload.social.comments]
      });
      setDraft("");
    } catch {
      setError("could not post comment. try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="dropflow-panel" aria-label="drop thread" data-testid="drop-thread-panel">
      <div className="dropflow-panel-head">
        <p>drop thread</p>
        <span>{social.commentCount.toLocaleString("en-US")} comments</span>
      </div>
      <p className="slice-meta">work-specific conversation anchored to this drop.</p>

      {loading ? <p className="slice-meta">loading thread…</p> : null}
      {error ? <p className="slice-meta">{error}</p> : null}

      {!loading && social.comments.length === 0 ? (
        <p className="slice-copy">no comments yet. start the thread from this drop surface.</p>
      ) : (
        <ul className="dropflow-bullet-list" aria-label="drop thread comments">
          {social.comments.map((comment) => (
            <li key={comment.id}>
              <strong>@{comment.authorHandle}</strong> · {formatCommentTimestamp(comment.createdAt)}
              <p>{commentBodyForVisibility(comment)}</p>
            </li>
          ))}
        </ul>
      )}

      {canInteract ? (
        <form className="slice-form" onSubmit={handleSubmit}>
          <label className="slice-field">
            add to thread
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="slice-input"
              aria-label="write drop thread comment"
              placeholder="write a drop thread comment"
              maxLength={280}
            />
          </label>
          <div className="slice-button-row">
            <button type="submit" className="slice-button" disabled={submitting || draft.trim().length === 0}>
              {submitting ? "posting…" : "post comment"}
            </button>
          </div>
        </form>
      ) : (
        <p className="slice-meta">
          <Link href={signInHref} className="slice-button ghost">
            sign in
          </Link>{" "}
          to post and reply in this drop thread.
        </p>
      )}
    </section>
  );
}
