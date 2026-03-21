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
import { TownhallBottomNav } from "./townhall-bottom-nav";
import { SearchIcon, PlusIcon } from "./townhall-icons";

/* ------------------------------------------------------------------ */
/*  helpers                                                           */
/* ------------------------------------------------------------------ */

function formatRelativeAge(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "now";
  }

  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

function formatModerationCaseStateLabel(
  state: TownhallPost["moderationCaseState"]
): string {
  if (state === "appeal_requested") return "appeal requested";
  if (state === "reported") return "reported";
  if (state === "resolved") return "resolved";
  return "clear";
}

/* ------------------------------------------------------------------ */
/*  types                                                             */
/* ------------------------------------------------------------------ */

type TownhallDiscourseScreenProps = {
  viewer: { accountId: string; handle: string } | null;
  initialPosts: TownhallPost[];
  initialFilter: TownhallPostsFilter;
};

/* ------------------------------------------------------------------ */
/*  component                                                         */
/* ------------------------------------------------------------------ */

export function TownhallDiscourseScreen({
  viewer,
  initialPosts,
  initialFilter
}: TownhallDiscourseScreenProps) {
  /* ----- state ----- */
  const [posts, setPosts] = useState<TownhallPost[]>(initialPosts);
  const [postsFilter, setPostsFilter] =
    useState<TownhallPostsFilter>(initialFilter);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  const [postDraft, setPostDraft] = useState("");
  const [isPublishingPost, setIsPublishingPost] = useState(false);

  const [postLinkedObjectKind, setPostLinkedObjectKind] = useState<
    TownhallPostLinkedObjectKind | "none"
  >("none");
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
        throw new Error(`failed to load posts (${response.status})`);
      }
      const data = (await response.json()) as {
        posts: TownhallPost[];
        filter: TownhallPostsFilter;
      };
      setPosts(data.posts);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "failed to load posts";
      setPostsError(message);
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    // Only re-fetch when filter changes away from initial
    void fetchPosts(postsFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postsFilter]);

  /* ----- filter change ----- */
  function handlePostsFilterChange(nextFilter: TownhallPostsFilter) {
    setPostsFilter(nextFilter);
  }

  /* ----- post submission ----- */
  async function handlePostSubmit() {
    if (!postDraft.trim() || isPublishingPost) return;
    setIsPublishingPost(true);
    try {
      const payload: Record<string, unknown> = { body: postDraft.trim() };
      if (postLinkedObjectKind !== "none" && postLinkedObjectId.trim()) {
        payload.linkedObject = {
          kind: postLinkedObjectKind,
          id: postLinkedObjectId.trim(),
          label: postLinkedObjectLabel.trim() || undefined,
          href: postLinkedObjectHref.trim() || undefined
        };
      }
      const response = await fetch("/api/v1/townhall/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`publish failed (${response.status})`);
      }
      setPostDraft("");
      setPostLinkedObjectKind("none");
      setPostLinkedObjectId("");
      setPostLinkedObjectLabel("");
      setPostLinkedObjectHref("");
      setIsComposeOpen(false);
      void fetchPosts(postsFilter);
    } catch {
      setPostsError("failed to publish note");
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
      if (channel) {
        payload.channel = channel;
      }
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
      setPostsError(`failed to ${action} post`);
    }
  }

  /* ----- render ----- */
  return (
    <section
      className="townhall-discourse-surface"
      aria-label="townhall discourse"
      data-testid="townhall-discourse-screen"
    >
      {/* ---- header ---- */}
      <header
        className="townhall-discourse-header"
        data-testid="townhall-discourse-header"
      >
        <h1 className="townhall-discourse-brand">townhall</h1>
        <div className="townhall-discourse-header-actions">
          <Link
            href={routes.townhallSearch()}
            className="townhall-discourse-search-link"
            aria-label="search townhall"
          >
            <SearchIcon className="townhall-discourse-icon" />
          </Link>
          {viewer ? (
            <button
              type="button"
              className="townhall-discourse-compose-toggle"
              aria-label="compose note"
              onClick={() => setIsComposeOpen((open) => !open)}
            >
              <PlusIcon className="townhall-discourse-icon" />
            </button>
          ) : null}
        </div>
      </header>

      {/* ---- compose form ---- */}
      {viewer && isComposeOpen ? (
        <div
          className="townhall-discourse-compose"
          data-testid="townhall-discourse-compose"
        >
          <textarea
            value={postDraft}
            onChange={(event) => setPostDraft(event.target.value)}
            placeholder="share an artist note or collector reflection"
            aria-label="write townhall note"
          />
          <div className="townhall-post-link-controls">
            <select
              value={postLinkedObjectKind}
              onChange={(event) => {
                const nextKind = event.target
                  .value as TownhallPostLinkedObjectKind | "none";
                setPostLinkedObjectKind(nextKind);
                if (nextKind === "none") {
                  setPostLinkedObjectId("");
                  setPostLinkedObjectLabel("");
                  setPostLinkedObjectHref("");
                }
              }}
            >
              <option value="none">no link</option>
              <option value="drop">link drop</option>
              <option value="world">link world</option>
              <option value="studio">link studio</option>
            </select>
            {postLinkedObjectKind !== "none" ? (
              <>
                <input
                  value={postLinkedObjectId}
                  onChange={(event) =>
                    setPostLinkedObjectId(event.target.value)
                  }
                  placeholder={
                    postLinkedObjectKind === "drop"
                      ? "drop id"
                      : postLinkedObjectKind === "world"
                        ? "world id"
                        : "studio handle"
                  }
                  aria-label="linked object id"
                />
                <input
                  value={postLinkedObjectLabel}
                  onChange={(event) =>
                    setPostLinkedObjectLabel(event.target.value)
                  }
                  placeholder="custom label (optional)"
                  aria-label="linked object label"
                />
                <input
                  value={postLinkedObjectHref}
                  onChange={(event) =>
                    setPostLinkedObjectHref(event.target.value)
                  }
                  placeholder="custom href (optional)"
                  aria-label="linked object href"
                />
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              void handlePostSubmit();
            }}
            disabled={isPublishingPost || !postDraft.trim()}
          >
            {isPublishingPost ? "publishing..." : "publish note"}
          </button>
        </div>
      ) : null}

      {!viewer ? (
        <p className="townhall-discourse-sign-in-note">
          sign in to publish notes.{" "}
          <Link href={routes.signIn(routes.townhall())}>open sign in</Link>
        </p>
      ) : null}

      {/* ---- filter row ---- */}
      <div
        className="townhall-discourse-filter-row"
        data-testid="townhall-discourse-filter-row"
      >
        <label htmlFor="townhall-discourse-filter">view</label>
        <select
          id="townhall-discourse-filter"
          data-testid="townhall-discourse-filter"
          value={postsFilter}
          onChange={(event) =>
            handlePostsFilterChange(
              event.target.value as TownhallPostsFilter
            )
          }
        >
          <option value="all">all notes</option>
          <option value="following">followed threads</option>
          <option value="saved">saved threads</option>
        </select>
      </div>

      {/* ---- loading / error ---- */}
      {isLoadingPosts ? (
        <p className="townhall-discourse-state" data-testid="townhall-discourse-loading">
          loading notes...
        </p>
      ) : null}
      {postsError ? (
        <p className="townhall-discourse-state" data-testid="townhall-discourse-error">
          {postsError}
        </p>
      ) : null}

      {/* ---- post list ---- */}
      <ul
        className="townhall-discourse-post-list"
        data-testid="townhall-discourse-post-list"
      >
        {posts.map((post) => (
          <li
            key={post.id}
            className="townhall-discourse-post-card"
            data-testid="townhall-discourse-post-card"
          >
            <p className="townhall-discourse-post-meta">
              <strong>@{post.authorHandle}</strong> ·{" "}
              {formatRelativeAge(post.createdAt)}
            </p>
            <p
              className={
                post.visibility !== "visible"
                  ? "townhall-comment-hidden"
                  : undefined
              }
            >
              {post.visibility === "hidden"
                ? "post hidden by moderation."
                : post.visibility === "restricted"
                  ? "post restricted by moderation."
                  : post.visibility === "deleted"
                    ? "post deleted by moderation."
                    : post.body}
            </p>
            {post.linkedObject ? (
              <a
                href={post.linkedObject.href}
                className="townhall-discourse-linked-object"
              >
                linked {post.linkedObject.kind}: {post.linkedObject.label}
              </a>
            ) : null}
            <p
              className="townhall-discourse-engagement"
              data-testid="townhall-discourse-engagement"
            >
              {post.saveCount} saves · {post.followCount} follows ·{" "}
              {post.shareCount} shares
            </p>
            <div
              className="townhall-discourse-actions"
              data-testid="townhall-discourse-actions"
            >
              {viewer ? (
                <>
                  <button
                    type="button"
                    aria-label={
                      post.savedByViewer ? "unsave thread" : "save thread"
                    }
                    onClick={() => {
                      void handlePostAction(
                        post.id,
                        post.savedByViewer ? "unsave" : "save"
                      );
                    }}
                  >
                    {post.savedByViewer ? "unsave thread" : "save thread"}
                  </button>
                  <button
                    type="button"
                    aria-label={
                      post.followedByViewer
                        ? "unfollow thread"
                        : "follow thread"
                    }
                    onClick={() => {
                      void handlePostAction(
                        post.id,
                        post.followedByViewer ? "unfollow" : "follow"
                      );
                    }}
                  >
                    {post.followedByViewer
                      ? "unfollow thread"
                      : "follow thread"}
                  </button>
                  <button
                    type="button"
                    aria-label="share thread"
                    onClick={() => {
                      void handlePostAction(
                        post.id,
                        "share",
                        "internal_dm"
                      );
                    }}
                  >
                    share thread
                  </button>
                </>
              ) : null}
              {post.canReport ? (
                <button
                  type="button"
                  aria-label="report post"
                  onClick={() => {
                    void handlePostAction(post.id, "report");
                  }}
                >
                  report
                </button>
              ) : null}
              {post.canAppeal ? (
                <button
                  type="button"
                  aria-label="appeal post"
                  onClick={() => {
                    void handlePostAction(post.id, "appeal");
                  }}
                >
                  appeal
                </button>
              ) : null}
              {post.canModerate ? (
                <>
                  {post.visibility !== "visible" ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handlePostAction(post.id, "restore");
                      }}
                    >
                      restore
                    </button>
                  ) : null}
                  {post.visibility !== "hidden" ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handlePostAction(post.id, "hide");
                      }}
                    >
                      hide
                    </button>
                  ) : null}
                  {post.visibility !== "restricted" ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handlePostAction(post.id, "restrict");
                      }}
                    >
                      restrict
                    </button>
                  ) : null}
                  {post.visibility !== "deleted" ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handlePostAction(post.id, "delete");
                      }}
                    >
                      delete
                    </button>
                  ) : null}
                  {post.reportCount > 0 || post.appealRequested ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handlePostAction(post.id, "dismiss");
                      }}
                    >
                      dismiss reports
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
            <p
              className="townhall-discourse-moderation-state"
              data-testid="townhall-discourse-moderation-state"
            >
              case {formatModerationCaseStateLabel(post.moderationCaseState)}
              {post.reportCount > 0
                ? ` · reports ${post.reportCount}`
                : ""}
              {post.reportedAt
                ? ` · reported ${formatRelativeAge(post.reportedAt)}`
                : ""}
              {post.appealRequestedAt
                ? ` · appeal ${formatRelativeAge(post.appealRequestedAt)}`
                : ""}
              {post.moderatedAt
                ? ` · resolved ${formatRelativeAge(post.moderatedAt)}`
                : ""}
            </p>
          </li>
        ))}
      </ul>

      <TownhallBottomNav activeMode="agora" noImmersiveToggle />
    </section>
  );
}
