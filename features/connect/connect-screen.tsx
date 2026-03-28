"use client";

import type {
  TownhallPost,
  TownhallPostsFilter,
  TownhallPostLinkedObjectKind,
  TownhallShareChannel
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  helpers                                                           */
/* ------------------------------------------------------------------ */

function formatRelativeAge(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "now";
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

function linkedObjectKindLabel(kind: TownhallPostLinkedObjectKind): string {
  if (kind === "drop") return "drop";
  if (kind === "world") return "world";
  return "studio";
}

/* ------------------------------------------------------------------ */
/*  types                                                             */
/* ------------------------------------------------------------------ */

type ConnectScreenProps = {
  viewer: { accountId: string; handle: string } | null;
  initialPosts: TownhallPost[];
  initialFilter: TownhallPostsFilter;
};

/* ------------------------------------------------------------------ */
/*  component                                                         */
/* ------------------------------------------------------------------ */

export function ConnectScreen({
  viewer,
  initialPosts,
  initialFilter
}: ConnectScreenProps) {
  const [posts, setPosts] = useState<TownhallPost[]>(initialPosts);
  const [postsFilter, setPostsFilter] =
    useState<TownhallPostsFilter>(initialFilter);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  const [postDraft, setPostDraft] = useState("");
  const [isPublishingPost, setIsPublishingPost] = useState(false);

  const [postLinkedObjectKind, setPostLinkedObjectKind] = useState<
    TownhallPostLinkedObjectKind
  >("drop");
  const [postLinkedObjectId, setPostLinkedObjectId] = useState("");
  const [postLinkedObjectLabel, setPostLinkedObjectLabel] = useState("");
  const [postLinkedObjectHref, setPostLinkedObjectHref] = useState("");

  const [isComposeOpen, setIsComposeOpen] = useState(false);

  /* ----- data loading ----- */
  const fetchPosts = useCallback(async (filter: TownhallPostsFilter) => {
    setIsLoadingPosts(true);
    setPostsError(null);
    try {
      const response = await fetch(
        `/api/v1/townhall/posts?filter=${encodeURIComponent(filter)}`
      );
      if (!response.ok) {
        throw new Error(`failed to load threads (${response.status})`);
      }
      const data = (await response.json()) as {
        posts: TownhallPost[];
        filter: TownhallPostsFilter;
      };
      // Connect surface shows only posts with linked objects (market conversation)
      const marketPosts = data.posts.filter((p) => p.linkedObject !== null);
      setPosts(marketPosts);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "failed to load threads";
      setPostsError(message);
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    void fetchPosts(postsFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postsFilter]);

  /* ----- post submission ----- */
  async function handlePostSubmit() {
    if (!postDraft.trim() || isPublishingPost || !postLinkedObjectId.trim()) return;
    setIsPublishingPost(true);
    try {
      const payload = {
        body: postDraft.trim(),
        linkedObject: {
          kind: postLinkedObjectKind,
          id: postLinkedObjectId.trim(),
          label: postLinkedObjectLabel.trim() || undefined,
          href: postLinkedObjectHref.trim() || undefined
        }
      };
      const response = await fetch("/api/v1/townhall/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`publish failed (${response.status})`);
      }
      setPostDraft("");
      setPostLinkedObjectId("");
      setPostLinkedObjectLabel("");
      setPostLinkedObjectHref("");
      setIsComposeOpen(false);
      void fetchPosts(postsFilter);
    } catch {
      setPostsError("failed to publish thread");
    } finally {
      setIsPublishingPost(false);
    }
  }

  /* ----- post actions ----- */
  async function handlePostAction(
    postId: string,
    action: string,
    channel?: TownhallShareChannel
  ) {
    try {
      const payload: Record<string, unknown> = { action };
      if (channel) payload.channel = channel;
      const response = await fetch(`/api/v1/townhall/posts/${postId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`action failed (${response.status})`);
      }
      void fetchPosts(postsFilter);
    } catch {
      setPostsError(`failed to ${action} thread`);
    }
  }

  /* ----- render ----- */
  return (
    <section
      className="connect-surface"
      aria-label="connect"
      data-testid="connect-screen"
    >
      {/* ---- header ---- */}
      <header className="connect-header" data-testid="connect-header">
        <h1 className="connect-brand">connect</h1>
        <p className="connect-subtitle">
          market conversation around drops, worlds, and studios
        </p>
        {viewer ? (
          <button
            type="button"
            className="connect-compose-toggle"
            aria-label="start a thread"
            onClick={() => setIsComposeOpen((open) => !open)}
          >
            + new thread
          </button>
        ) : null}
      </header>

      {/* ---- compose form ---- */}
      {viewer && isComposeOpen ? (
        <div className="connect-compose" data-testid="connect-compose">
          <textarea
            value={postDraft}
            onChange={(event) => setPostDraft(event.target.value)}
            placeholder="share thoughts about a drop, world, or studio..."
            aria-label="write thread"
          />
          <div className="connect-link-controls">
            <label htmlFor="connect-link-kind">link to</label>
            <select
              id="connect-link-kind"
              value={postLinkedObjectKind}
              onChange={(event) =>
                setPostLinkedObjectKind(
                  event.target.value as TownhallPostLinkedObjectKind
                )
              }
            >
              <option value="drop">drop</option>
              <option value="world">world</option>
              <option value="studio">studio</option>
            </select>
            <input
              value={postLinkedObjectId}
              onChange={(event) => setPostLinkedObjectId(event.target.value)}
              placeholder={
                postLinkedObjectKind === "drop"
                  ? "drop id (e.g. stardust)"
                  : postLinkedObjectKind === "world"
                    ? "world id (e.g. dark-matter)"
                    : "studio handle"
              }
              aria-label="linked object id"
            />
            <input
              value={postLinkedObjectLabel}
              onChange={(event) => setPostLinkedObjectLabel(event.target.value)}
              placeholder="display label (optional)"
              aria-label="linked object label"
            />
          </div>
          <button
            type="button"
            onClick={() => { void handlePostSubmit(); }}
            disabled={isPublishingPost || !postDraft.trim() || !postLinkedObjectId.trim()}
          >
            {isPublishingPost ? "publishing..." : "publish thread"}
          </button>
        </div>
      ) : null}

      {!viewer ? (
        <p className="connect-sign-in-note">
          sign in to start or join threads.{" "}
          <Link href={routes.signIn("/connect")}>open sign in</Link>
        </p>
      ) : null}

      {/* ---- filter row ---- */}
      <div className="connect-filter-row" data-testid="connect-filter-row">
        <label htmlFor="connect-filter">view</label>
        <select
          id="connect-filter"
          data-testid="connect-filter"
          value={postsFilter}
          onChange={(event) =>
            setPostsFilter(event.target.value as TownhallPostsFilter)
          }
        >
          <option value="all">all threads</option>
          <option value="following">followed threads</option>
          <option value="saved">saved threads</option>
        </select>
      </div>

      {/* ---- loading / error ---- */}
      {isLoadingPosts ? (
        <p className="connect-state" data-testid="connect-loading">
          loading threads...
        </p>
      ) : null}
      {postsError ? (
        <p className="connect-state connect-error" data-testid="connect-error">
          {postsError}
        </p>
      ) : null}

      {/* ---- empty state ---- */}
      {!isLoadingPosts && !postsError && posts.length === 0 ? (
        <div className="connect-empty" data-testid="connect-empty">
          <p className="connect-empty-label">no threads yet</p>
          <p className="connect-empty-hint">
            start a conversation about a drop, world, or studio you care about.
          </p>
        </div>
      ) : null}

      {/* ---- thread list ---- */}
      <ul className="connect-thread-list" data-testid="connect-thread-list">
        {posts.map((post) => (
          <li
            key={post.id}
            className="connect-thread-card"
            data-testid="connect-thread-card"
          >
            {/* linked object badge */}
            {post.linkedObject ? (
              <a
                href={post.linkedObject.href}
                className="connect-thread-linked-badge"
              >
                {linkedObjectKindLabel(post.linkedObject.kind)}:{" "}
                {post.linkedObject.label}
              </a>
            ) : null}

            {/* author + age */}
            <p className="connect-thread-meta">
              <strong>@{post.authorHandle}</strong> ·{" "}
              {formatRelativeAge(post.createdAt)}
            </p>

            {/* body */}
            <p
              className={
                post.visibility !== "visible"
                  ? "connect-thread-body-moderated"
                  : "connect-thread-body"
              }
            >
              {post.visibility === "hidden"
                ? "thread hidden by moderation."
                : post.visibility === "restricted"
                  ? "thread restricted by moderation."
                  : post.visibility === "deleted"
                    ? "thread removed."
                    : post.body}
            </p>

            {/* engagement */}
            <p className="connect-thread-engagement" data-testid="connect-thread-engagement">
              {post.saveCount} saves · {post.followCount} follows ·{" "}
              {post.shareCount} shares
            </p>

            {/* actions */}
            <div className="connect-thread-actions" data-testid="connect-thread-actions">
              {viewer ? (
                <>
                  <button
                    type="button"
                    aria-label={post.savedByViewer ? "unsave thread" : "save thread"}
                    onClick={() => {
                      void handlePostAction(post.id, post.savedByViewer ? "unsave" : "save");
                    }}
                  >
                    {post.savedByViewer ? "unsave" : "save"}
                  </button>
                  <button
                    type="button"
                    aria-label={post.followedByViewer ? "unfollow thread" : "follow thread"}
                    onClick={() => {
                      void handlePostAction(post.id, post.followedByViewer ? "unfollow" : "follow");
                    }}
                  >
                    {post.followedByViewer ? "unfollow" : "follow"}
                  </button>
                  <button
                    type="button"
                    aria-label="share thread"
                    onClick={() => {
                      void handlePostAction(post.id, "share", "internal_dm");
                    }}
                  >
                    share
                  </button>
                </>
              ) : null}
              {post.canReport ? (
                <button
                  type="button"
                  aria-label="report thread"
                  onClick={() => { void handlePostAction(post.id, "report"); }}
                >
                  report
                </button>
              ) : null}
              {post.canAppeal ? (
                <button
                  type="button"
                  aria-label="appeal thread"
                  onClick={() => { void handlePostAction(post.id, "appeal"); }}
                >
                  appeal
                </button>
              ) : null}
              {post.canModerate ? (
                <>
                  {post.visibility !== "visible" ? (
                    <button type="button" onClick={() => { void handlePostAction(post.id, "restore"); }}>
                      restore
                    </button>
                  ) : null}
                  {post.visibility !== "hidden" ? (
                    <button type="button" onClick={() => { void handlePostAction(post.id, "hide"); }}>
                      hide
                    </button>
                  ) : null}
                  {post.visibility !== "deleted" ? (
                    <button type="button" onClick={() => { void handlePostAction(post.id, "delete"); }}>
                      delete
                    </button>
                  ) : null}
                  {post.reportCount > 0 || post.appealRequested ? (
                    <button type="button" onClick={() => { void handlePostAction(post.id, "dismiss"); }}>
                      dismiss
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
