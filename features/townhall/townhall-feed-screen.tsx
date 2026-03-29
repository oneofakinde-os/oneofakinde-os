"use client";

import { OptimizedImage } from "@/features/media/optimized-image";
import { formatUsd } from "@/features/shared/format";
import type {
  Drop,
  TownhallPost,
  TownhallPostsFilter,
  TownhallPostLinkedObjectKind,
  TownhallDropSocialSnapshot,
  TownhallShareChannel,
  TownhallTelemetryMetadata,
  TownhallTelemetryEventType
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import { DEFAULT_TOWNHALL_FEED_PAGE_SIZE } from "@/lib/townhall/feed-pagination";
import { resolveDropModeForTownhallSurface, type TownhallSurfaceMode } from "@/lib/townhall/feed-mode";
import { resolveDropPreview } from "@/lib/townhall/preview-media";
import {
  DEFAULT_TOWNHALL_SHOWROOM_ORDERING,
  DEFAULT_TOWNHALL_SHOWROOM_MEDIA_FILTER,
  parseTownhallShowroomMediaFilter,
  parseTownhallShowroomOrdering,
  type TownhallShowroomMediaFilter,
  type TownhallShowroomOrdering
} from "@/lib/townhall/showroom-query";
import {
  buildTownhallFeedHrefWithFocus,
  resolveTownhallFeedActiveIndex,
  routeForFeedMediaFilter,
  type TownhallFeedFocus,
  type TownhallFeedRouteNamespace
} from "@/lib/townhall/feed-focus";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UrlObject } from "node:url";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TownhallBottomNav } from "./townhall-bottom-nav";
import {
  BookmarkIcon,
  CommentIcon,
  DiamondIcon,
  HeartIcon,
  PlusIcon,
  SearchIcon,
  SendIcon
} from "./townhall-icons";
import { ShowroomFeaturedRail } from "./showroom-featured-rail";

type TownhallFeedScreenProps = {
  mode: TownhallSurfaceMode;
  viewer: {
    accountId: string;
    handle: string;
  } | null;
  drops: Drop[];
  ownedDropIds?: string[];
  initialSocialByDropId?: Record<string, TownhallDropSocialSnapshot>;
  initialNextCursor?: string | null;
  initialHasMore?: boolean;
  pageSize?: number;
  showroomMedia?: TownhallShowroomMediaFilter | string;
  showroomOrdering?: TownhallShowroomOrdering | string;
  routeNamespace?: TownhallFeedRouteNamespace;
  initialFocusDropId?: string | null;
  initialFocusPosition?: number | null;
};

type TownhallPanel = "comments" | "collect" | "share";

type StageTapEvent =
  | React.MouseEvent<HTMLElement>
  | React.PointerEvent<HTMLElement>
  | React.TouchEvent<HTMLElement>;

type StageTapSource = "pointer" | "click";

type StagePointerEvent = React.PointerEvent<HTMLElement>;

type StageTouchEvent = React.TouchEvent<HTMLElement>;

type CollectStats = {
  collectors: number;
  royaltyPercent: number | null;
  floorUsd: number;
  volumeUsd: number;
};

type ModeCopy = {
  kicker: string;
  unlockCta: string;
};

type StageBackgroundStyle = {
  backgroundColor: string;
  backgroundImage?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  backgroundSize?: string;
};

type TouchPoint = {
  x: number;
  y: number;
  startedAtMs: number;
};

type FeedPagePayload = {
  feed?: {
    drops?: Drop[];
    nextCursor?: string | null;
    hasMore?: boolean;
    pageSize?: number;
    totalCount?: number;
  };
  showroom?: {
    mediaFilter?: TownhallShowroomMediaFilter;
    ordering?: TownhallShowroomOrdering;
  };
  ownedDropIds?: string[];
  socialByDropId?: Record<string, TownhallDropSocialSnapshot>;
};

type TownhallPostsPayload = {
  posts?: TownhallPost[];
  post?: TownhallPost;
  filter?: TownhallPostsFilter;
};

type TownhallPostAction =
  | "report"
  | "appeal"
  | "save"
  | "unsave"
  | "follow"
  | "unfollow"
  | "share"
  | "hide"
  | "restrict"
  | "delete"
  | "restore"
  | "dismiss";

type ShowroomModeOption = {
  value: TownhallShowroomMediaFilter;
  label: string;
};

type ShowroomOrderingOption = {
  value: TownhallShowroomOrdering;
  label: string;
};

const LONG_PRESS_CONTROLS_MS = 420;
const SWIPE_EXIT_DELTA_PX = 82;
const SWIPE_EXIT_MAX_DURATION_MS = 920;
const SWIPE_VERTICAL_BIAS = 1.15;
const LONG_PRESS_SUPPRESS_TAP_MS = 700;

const SHOWROOM_MODE_OPTIONS: ShowroomModeOption[] = [
  { value: "all", label: "all" },
  { value: "agora", label: "agora" },
  { value: "watch", label: "watch" },
  { value: "listen", label: "listen" },
  { value: "read", label: "read" },
  { value: "photos", label: "photos" },
  { value: "live", label: "live" }
];

const SHOWROOM_ORDERING_OPTIONS: ShowroomOrderingOption[] = [
  { value: "featured", label: "featured" },
  { value: "for_you", label: "for you" },
  { value: "rising", label: "rising" },
  { value: "newest", label: "newest" },
  { value: "most_collected", label: "most collected" },
  { value: "new_voices", label: "new voices" },
  { value: "sustained_craft", label: "sustained craft" }
];

const MODE_COPY: Record<Exclude<TownhallSurfaceMode, "townhall">, ModeCopy> = {
  watch: {
    kicker: "video community hub",
    unlockCta: "unlock watch"
  },
  listen: {
    kicker: "audio community hub",
    unlockCta: "unlock listen"
  },
  read: {
    kicker: "text community hub",
    unlockCta: "unlock read"
  },
  photos: {
    kicker: "still-image community hub",
    unlockCta: "unlock photos"
  },
  live: {
    kicker: "live community hub",
    unlockCta: "unlock live"
  }
};

function modeNav(mode: TownhallSurfaceMode): Parameters<typeof TownhallBottomNav>[0]["activeMode"] {
  if (mode === "townhall") return "showroom";
  if (mode === "watch") return "watch";
  if (mode === "listen") return "listen";
  if (mode === "read") return "read";
  if (mode === "photos") return "gallery";
  return "live";
}

function formatPublishedDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  });
}

function buildCollectStats(drop: Drop, index: number): CollectStats {
  return {
    collectors: 140 + index * 37,
    royaltyPercent: index % 3 === 1 ? null : 8 + index * 2,
    floorUsd: Number(Math.max(0.99, drop.priceUsd - 0.72).toFixed(2)),
    volumeUsd: Number((drop.priceUsd * (220 + index * 36)).toFixed(2))
  };
}

function defaultDropSocialSnapshot(dropId: string): TownhallDropSocialSnapshot {
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

function createInitialSocialMap(
  drops: Drop[],
  initialSocialByDropId: Record<string, TownhallDropSocialSnapshot>
): Record<string, TownhallDropSocialSnapshot> {
  const output: Record<string, TownhallDropSocialSnapshot> = {};

  for (const drop of drops) {
    const seeded = initialSocialByDropId[drop.id];
    output[drop.id] = seeded
      ? {
          ...seeded,
          comments: [...seeded.comments]
        }
      : defaultDropSocialSnapshot(drop.id);
  }

  return output;
}

function upsertSocialMap(
  existing: Record<string, TownhallDropSocialSnapshot>,
  drops: Drop[]
): Record<string, TownhallDropSocialSnapshot> {
  const next: Record<string, TownhallDropSocialSnapshot> = { ...existing };

  for (const drop of drops) {
    if (!next[drop.id]) {
      next[drop.id] = defaultDropSocialSnapshot(drop.id);
    }
  }

  return next;
}

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

function formatTownhallModerationCaseStateLabel(state: TownhallPost["moderationCaseState"]): string {
  if (state === "appeal_requested") {
    return "appeal requested";
  }
  if (state === "reported") {
    return "reported";
  }
  if (state === "resolved") {
    return "resolved";
  }
  return "clear";
}

function roundTelemetryMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

export function TownhallFeedScreen({
  mode,
  viewer,
  drops,
  ownedDropIds = [],
  initialSocialByDropId = {},
  initialNextCursor = null,
  initialHasMore = false,
  pageSize = DEFAULT_TOWNHALL_FEED_PAGE_SIZE,
  showroomMedia = DEFAULT_TOWNHALL_SHOWROOM_MEDIA_FILTER,
  showroomOrdering = DEFAULT_TOWNHALL_SHOWROOM_ORDERING,
  routeNamespace,
  initialFocusDropId = null,
  initialFocusPosition = null
}: TownhallFeedScreenProps) {
  const pathname = usePathname();
  const resolvedRouteNamespace = useMemo<TownhallFeedRouteNamespace>(() => {
    if (routeNamespace) {
      return routeNamespace;
    }
    return pathname.startsWith("/showroom") ? "showroom" : "townhall";
  }, [pathname, routeNamespace]);
  const parsedShowroomOrdering = parseTownhallShowroomOrdering(showroomOrdering);
  const parsedShowroomMedia = parseTownhallShowroomMediaFilter(showroomMedia);
  const effectiveShowroomMedia = mode === "townhall" ? parsedShowroomMedia : mode;
  const initialFocus = useMemo<TownhallFeedFocus>(
    () => ({
      dropId: initialFocusDropId ?? null,
      position:
        typeof initialFocusPosition === "number" && Number.isFinite(initialFocusPosition)
          ? Math.max(1, Math.floor(initialFocusPosition))
          : null
    }),
    [initialFocusDropId, initialFocusPosition]
  );

  const [feedDrops, setFeedDrops] = useState<Drop[]>(drops);
  const [activeIndex, setActiveIndex] = useState(() =>
    resolveTownhallFeedActiveIndex(drops, initialFocus)
  );
  const [isImmersive, setIsImmersive] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [isPlaying, setIsPlaying] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [ownedDropState, setOwnedDropState] = useState<string[]>(ownedDropIds);
  const [socialByDrop, setSocialByDrop] = useState<Record<string, TownhallDropSocialSnapshot>>(() =>
    createInitialSocialMap(feedDrops, initialSocialByDropId)
  );
  const [openPanel, setOpenPanel] = useState<TownhallPanel | null>(null);
  const [panelDropId, setPanelDropId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState("");
  const [shareOrigin, setShareOrigin] = useState("https://oneofakinde-os.vercel.app");
  const [townhallPosts, setTownhallPosts] = useState<TownhallPost[]>([]);
  const [postsFilter, setPostsFilter] = useState<TownhallPostsFilter>("all");
  const [isPostsPanelOpen, setIsPostsPanelOpen] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState("");
  const [postDraft, setPostDraft] = useState("");
  const [postLinkedObjectKind, setPostLinkedObjectKind] = useState<TownhallPostLinkedObjectKind | "none">(
    "none"
  );
  const [postLinkedObjectId, setPostLinkedObjectId] = useState("");
  const [postLinkedObjectLabel, setPostLinkedObjectLabel] = useState("");
  const [postLinkedObjectHref, setPostLinkedObjectHref] = useState("");
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [failedPreviewAssetKeys, setFailedPreviewAssetKeys] = useState<string[]>([]);
  const [revealedVideoDropIds, setRevealedVideoDropIds] = useState<string[]>([]);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const mediaRefs = useRef<Array<HTMLMediaElement | null>>([]);
  const lastScrollTopRef = useRef(0);
  const lastImmersiveEnterMsRef = useRef(0);
  const lastStageTapMsRef = useRef(0);
  const lastStagePointerTapMsRef = useRef(0);
  const scrollIntentUntilMsRef = useRef(0);
  const watchTimeDropIdRef = useRef<string | null>(null);
  const watchTimeStartedAtMsRef = useRef(0);
  const completionRecordedDropIdsRef = useRef<Set<string>>(new Set());
  const showControlsLongPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressStageTapUntilMsRef = useRef(0);
  const touchStartPointRef = useRef<TouchPoint | null>(null);
  const isLoadingMoreRef = useRef(false);
  const impressionLoggedDropIdsRef = useRef<Set<string>>(new Set());
  const openedDropIdsRef = useRef<Set<string>>(new Set());
  const previewStartedDropIdsRef = useRef<Set<string>>(new Set());
  const accessStartedDropIdsRef = useRef<Set<string>>(new Set());
  const watchTimeDropPositionRef = useRef<number>(0);
  const appliedInitialFocusRef = useRef(false);

  const failedPreviewAssetKeySet = useMemo(
    () => new Set(failedPreviewAssetKeys),
    [failedPreviewAssetKeys]
  );
  const ownedSet = useMemo(() => new Set(ownedDropState), [ownedDropState]);

  const activeDrop = feedDrops[activeIndex] ?? feedDrops[0] ?? null;

  async function postTelemetryEvent(
    dropId: string,
    eventType: TownhallTelemetryEventType,
    payload?: {
      watchTimeSeconds?: number;
      completionPercent?: number;
      metadata?: TownhallTelemetryMetadata;
    }
  ) {
    try {
      await fetch("/api/v1/townhall/telemetry", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          dropId,
          eventType,
          metadata: payload?.metadata,
          watchTimeSeconds: payload?.watchTimeSeconds,
          completionPercent: payload?.completionPercent,
        })
      });
    } catch {
      // Best-effort telemetry should not interrupt the feed UX.
    }
  }

  function telemetryMetadata(
    options?: {
      position?: number;
      source?: TownhallTelemetryMetadata["source"];
      action?: TownhallTelemetryMetadata["action"];
      channel?: TownhallTelemetryMetadata["channel"];
      surface?: TownhallTelemetryMetadata["surface"];
    }
  ): TownhallTelemetryMetadata {
    return {
      source: options?.source ?? "showroom",
      surface: options?.surface ?? mode,
      mediaFilter: effectiveShowroomMedia,
      ordering: parsedShowroomOrdering,
      position: options?.position,
      action: options?.action,
      channel: options?.channel
    };
  }

  function flushWatchTimeTelemetry(nextStartMs: number) {
    const previousDropId = watchTimeDropIdRef.current;
    const previousStartedAtMs = watchTimeStartedAtMsRef.current;
    const previousPosition = watchTimeDropPositionRef.current;
    if (!previousDropId || previousStartedAtMs <= 0) {
      return;
    }

    const elapsedSeconds = roundTelemetryMetric((nextStartMs - previousStartedAtMs) / 1000);
    if (elapsedSeconds < 1) {
      return;
    }

    void postTelemetryEvent(previousDropId, "watch_time", {
      watchTimeSeconds: elapsedSeconds,
      metadata: telemetryMetadata({
        position: previousPosition || undefined
      })
    });
    void postTelemetryEvent(previousDropId, "drop_dwell_time", {
      watchTimeSeconds: elapsedSeconds,
      metadata: telemetryMetadata({
        position: previousPosition || undefined,
        action: "complete"
      })
    });
  }

  function recordCompletionTelemetry(dropId: string, media: HTMLMediaElement, isLocked: boolean) {
    if (completionRecordedDropIdsRef.current.has(dropId)) {
      return;
    }

    if (watchTimeDropIdRef.current !== dropId) {
      return;
    }

    const duration = media.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const completionPercent = (media.currentTime / duration) * 100;
    if (completionPercent < 92) {
      return;
    }

    completionRecordedDropIdsRef.current.add(dropId);
    const position = watchTimeDropPositionRef.current || activeIndex + 1;
    void postTelemetryEvent(dropId, "completion", {
      completionPercent: roundTelemetryMetric(Math.min(100, completionPercent)),
      metadata: telemetryMetadata({ position })
    });
    void postTelemetryEvent(dropId, "preview_complete", {
      completionPercent: roundTelemetryMetric(Math.min(100, completionPercent)),
      metadata: telemetryMetadata({
        position,
        action: "complete"
      })
    });

    if (!isLocked) {
      void postTelemetryEvent(dropId, "access_complete", {
        completionPercent: roundTelemetryMetric(Math.min(100, completionPercent)),
        metadata: telemetryMetadata({
          source: "drop",
          position,
          action: "complete"
        })
      });
    }
  }

  useEffect(() => {
    setFeedDrops(drops);
    setOwnedDropState(ownedDropIds);
    setNextCursor(initialNextCursor);
    setHasMore(initialHasMore);
    setIsLoadingMore(false);
    setLoadMoreError("");
    setActiveIndex(0);
    impressionLoggedDropIdsRef.current.clear();
    openedDropIdsRef.current.clear();
    previewStartedDropIdsRef.current.clear();
    accessStartedDropIdsRef.current.clear();
    appliedInitialFocusRef.current = false;
    setActiveIndex(resolveTownhallFeedActiveIndex(drops, initialFocus));
  }, [drops, ownedDropIds, initialNextCursor, initialHasMore, initialFocus]);

  useEffect(() => {
    setSocialByDrop((current) => {
      const seeded = createInitialSocialMap(feedDrops, initialSocialByDropId);
      const merged: Record<string, TownhallDropSocialSnapshot> = { ...seeded };
      for (const [dropId, snapshot] of Object.entries(current)) {
        merged[dropId] = {
          ...snapshot,
          comments: [...snapshot.comments]
        };
      }
      return upsertSocialMap(merged, feedDrops);
    });
  }, [feedDrops, initialSocialByDropId]);

  useEffect(() => {
    if (appliedInitialFocusRef.current) {
      return;
    }

    if (activeIndex <= 0) {
      appliedInitialFocusRef.current = true;
      return;
    }

    const target = itemRefs.current[activeIndex];
    if (!target) {
      return;
    }

    appliedInitialFocusRef.current = true;
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }, [activeIndex, feedDrops.length]);

  useEffect(() => {
    const nowMs = Date.now();
    flushWatchTimeTelemetry(nowMs);
    watchTimeDropIdRef.current = activeDrop?.id ?? null;
    watchTimeStartedAtMsRef.current = nowMs;
    watchTimeDropPositionRef.current = activeIndex + 1;
  }, [activeDrop?.id]);

  useEffect(() => {
    if (!activeDrop?.id) {
      return;
    }

    if (impressionLoggedDropIdsRef.current.has(activeDrop.id)) {
      return;
    }

    impressionLoggedDropIdsRef.current.add(activeDrop.id);
    const position = activeIndex + 1;
    void postTelemetryEvent(activeDrop.id, "impression", {
      metadata: telemetryMetadata({ position })
    });
    void postTelemetryEvent(activeDrop.id, "showroom_impression", {
      metadata: telemetryMetadata({
        position,
        action: "start"
      })
    });

    if (!openedDropIdsRef.current.has(activeDrop.id)) {
      openedDropIdsRef.current.add(activeDrop.id);
      void postTelemetryEvent(activeDrop.id, "drop_opened", {
        metadata: telemetryMetadata({
          position,
          action: "open"
        })
      });
    }

    if (!previewStartedDropIdsRef.current.has(activeDrop.id)) {
      previewStartedDropIdsRef.current.add(activeDrop.id);
      void postTelemetryEvent(activeDrop.id, "preview_start", {
        metadata: telemetryMetadata({
          position,
          action: "start"
        })
      });
    }

    if (!ownedSet.has(activeDrop.id) || accessStartedDropIdsRef.current.has(activeDrop.id)) {
      return;
    }

    accessStartedDropIdsRef.current.add(activeDrop.id);
    void postTelemetryEvent(activeDrop.id, "access_start", {
      metadata: telemetryMetadata({
        source: "drop",
        position,
        action: "start"
      })
    });
  }, [activeDrop?.id, activeIndex, ownedSet]);

  useEffect(() => {
    return () => {
      flushWatchTimeTelemetry(Date.now());
      if (showControlsLongPressTimeoutRef.current) {
        clearTimeout(showControlsLongPressTimeoutRef.current);
        showControlsLongPressTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setShareOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const root = viewportRef.current;
    if (!root) {
      return;
    }

    lastScrollTopRef.current = root.scrollTop;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isImmersive) {
          return;
        }

        let bestIndex = activeIndex;
        let bestRatio = 0;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const index = Number(target.dataset.index ?? -1);

          if (Number.isNaN(index) || index < 0) continue;
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = index;
          }
        }

        if (bestRatio >= 0.55) {
          setActiveIndex(bestIndex);
        }
      },
      {
        root,
        threshold: [0.45, 0.55, 0.7, 0.85]
      }
    );

    for (const element of itemRefs.current) {
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [activeIndex, feedDrops.length, isImmersive]);

  useEffect(() => {
    setShowControls(false);
    setOpenPanel(null);
    setPanelDropId(null);
    setCommentDraft("");
    setReplyToCommentId(null);
    setShareNotice("");
    setIsPlaying(true);
  }, [activeIndex]);

  useEffect(() => {
    if (openPanel !== "comments" || !panelDropId || !replyToCommentId) {
      return;
    }

    const panelComments = socialByDrop[panelDropId]?.comments ?? [];
    if (!panelComments.some((entry) => entry.id === replyToCommentId && entry.visibility === "visible")) {
      setReplyToCommentId(null);
    }
  }, [openPanel, panelDropId, replyToCommentId, socialByDrop]);

  useEffect(() => {
    for (const [index, media] of mediaRefs.current.entries()) {
      if (!media) continue;

      media.muted = isMuted;
      media.volume = isMuted ? 0 : volume;

      if (index === activeIndex && isPlaying) {
        void media.play().catch(() => undefined);
        continue;
      }

      media.pause();
    }
  }, [activeIndex, isMuted, volume, isPlaying]);

  function togglePanel(panel: TownhallPanel, dropId: string) {
    if (openPanel === panel && panelDropId === dropId) {
      setOpenPanel(null);
      setPanelDropId(null);
      setReplyToCommentId(null);
      return;
    }

    setIsImmersive(false);
    setShowControls(false);
    setIsPostsPanelOpen(false);
    setOpenPanel(panel);
    setPanelDropId(dropId);
    setShareNotice("");
    if (panel !== "comments") {
      setReplyToCommentId(null);
    }

    if (panel === "collect") {
      void postTelemetryEvent(dropId, "collect_intent", {
        metadata: telemetryMetadata({
          source: "drop",
          action: "open",
          position: activeIndex + 1
        })
      });
    }
  }

  function handleStageTap(event: StageTapEvent, index: number, source: StageTapSource) {
    if (source === "pointer") clearLongPressControlsTimer();
    void event;
    void source;
    if (index !== activeIndex) {
      itemRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function clearLongPressControlsTimer() {
    if (showControlsLongPressTimeoutRef.current) {
      clearTimeout(showControlsLongPressTimeoutRef.current);
      showControlsLongPressTimeoutRef.current = null;
    }
  }

  function handleStagePointerDown(event: StagePointerEvent, index: number) {
    if (!isImmersive || index !== activeIndex) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target || target.closest("[data-no-immersive-toggle='true']")) {
      return;
    }

    clearLongPressControlsTimer();
    showControlsLongPressTimeoutRef.current = setTimeout(() => {
      setShowControls(true);
      suppressStageTapUntilMsRef.current = Date.now() + LONG_PRESS_SUPPRESS_TAP_MS;
    }, LONG_PRESS_CONTROLS_MS);
  }

  function handleStagePointerCancelOrUp() {
    clearLongPressControlsTimer();
  }

  function handleStageTouchStart(event: StageTouchEvent, index: number) {
    if (!isImmersive || index !== activeIndex) {
      touchStartPointRef.current = null;
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target || target.closest("[data-no-immersive-toggle='true']")) {
      touchStartPointRef.current = null;
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      touchStartPointRef.current = null;
      return;
    }

    touchStartPointRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      startedAtMs: Date.now()
    };
  }

  function handleStageTouchEnd(event: StageTouchEvent, index: number) {
    clearLongPressControlsTimer();

    if (!isImmersive || index !== activeIndex) {
      touchStartPointRef.current = null;
      return;
    }

    const startPoint = touchStartPointRef.current;
    touchStartPointRef.current = null;
    if (!startPoint) {
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    const elapsedMs = Date.now() - startPoint.startedAtMs;
    if (elapsedMs > SWIPE_EXIT_MAX_DURATION_MS) {
      return;
    }

    const deltaY = touch.clientY - startPoint.y;
    const deltaX = Math.abs(touch.clientX - startPoint.x);
    const isVerticalSwipe = deltaY > SWIPE_EXIT_DELTA_PX && deltaY > deltaX * SWIPE_VERTICAL_BIAS;
    if (!isVerticalSwipe) {
      return;
    }

    setIsImmersive(false);
    setShowControls(false);
    suppressStageTapUntilMsRef.current = Date.now() + LONG_PRESS_SUPPRESS_TAP_MS;
  }

  function handleFeedScroll() {
    const root = viewportRef.current;
    if (root) lastScrollTopRef.current = root.scrollTop;
  }

  function markScrollIntent() {
    // Baseline release keeps townhall scrolling independent from fullscreen state.
  }

  function activeShareUrl(dropId: string): string {
    return `${shareOrigin}${routes.drop(dropId)}`;
  }

  function showroomHref(mediaFilter: TownhallShowroomMediaFilter, ordering: TownhallShowroomOrdering): UrlObject {
    const pathname = routeForFeedMediaFilter(mediaFilter, resolvedRouteNamespace);
    if (ordering !== DEFAULT_TOWNHALL_SHOWROOM_ORDERING) {
      return {
        pathname,
        query: {
          lane_key: ordering
        }
      };
    }

    return { pathname };
  }

  function showroomHrefString(
    mediaFilter: TownhallShowroomMediaFilter,
    ordering: TownhallShowroomOrdering
  ): string {
    const pathname = routeForFeedMediaFilter(mediaFilter, resolvedRouteNamespace);
    if (ordering === DEFAULT_TOWNHALL_SHOWROOM_ORDERING) {
      return pathname;
    }

    return `${pathname}?lane_key=${encodeURIComponent(ordering)}`;
  }

  function currentFeedHref(): string {
    return showroomHrefString(effectiveShowroomMedia, parsedShowroomOrdering);
  }

  function dropOpenHref(dropId: string, position: number): UrlObject {
    const returnTo = buildTownhallFeedHrefWithFocus({
      mediaFilter: effectiveShowroomMedia,
      ordering: parsedShowroomOrdering,
      routeNamespace: resolvedRouteNamespace,
      focusDropId: dropId,
      focusPosition: position
    });

    return {
      pathname: routes.drop(dropId),
      query: {
        returnTo
      }
    };
  }

  function redirectToSignInForInteraction() {
    if (typeof window === "undefined") {
      return;
    }

    window.location.href = routes.signIn(currentFeedHref());
  }

  const loadNextFeedPage = useCallback(async () => {
    if (!hasMore || !nextCursor || isLoadingMoreRef.current) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError("");

    try {
      const params = new URLSearchParams();
      params.set("cursor", nextCursor);
      params.set("limit", String(pageSize));
      params.set("media", effectiveShowroomMedia);
      params.set("lane_key", parsedShowroomOrdering);
      const response = await fetch(`/api/v1/townhall/feed?${params.toString()}`, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`failed to load feed page (${response.status})`);
      }

      const payload = (await response.json()) as FeedPagePayload;
      const incomingDrops = payload.feed?.drops ?? [];
      const incomingSocialByDropId = payload.socialByDropId ?? {};

      setFeedDrops((current) => {
        if (!incomingDrops.length) {
          return current;
        }

        const seen = new Set(current.map((drop) => drop.id));
        const append = incomingDrops.filter((drop) => !seen.has(drop.id));
        if (!append.length) {
          return current;
        }

        return [...current, ...append];
      });

      setSocialByDrop((current) => {
        const merged = { ...current };
        for (const [dropId, snapshot] of Object.entries(incomingSocialByDropId)) {
          merged[dropId] = {
            ...snapshot,
            comments: [...snapshot.comments]
          };
        }
        return merged;
      });

      if (payload.ownedDropIds?.length) {
        setOwnedDropState((current) => {
          const seen = new Set(current);
          for (const dropId of payload.ownedDropIds ?? []) {
            seen.add(dropId);
          }
          return Array.from(seen);
        });
      }

      setNextCursor(payload.feed?.nextCursor ?? null);
      setHasMore(Boolean(payload.feed?.hasMore));
    } catch {
      setLoadMoreError("feed loading paused. pull to retry.");
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMore, nextCursor, pageSize, effectiveShowroomMedia, parsedShowroomOrdering]);

  useEffect(() => {
    if (!hasMore || !nextCursor || isLoadingMoreRef.current) {
      return;
    }

    const remaining = feedDrops.length - activeIndex - 1;
    if (remaining > 1) {
      return;
    }

    void loadNextFeedPage();
  }, [activeIndex, feedDrops.length, hasMore, nextCursor, loadNextFeedPage]);

  function applySocialSnapshot(snapshot: TownhallDropSocialSnapshot) {
    setSocialByDrop((current) => ({
      ...current,
      [snapshot.dropId]: {
        ...snapshot,
        comments: [...snapshot.comments]
      }
    }));
  }

  function applyTownhallPost(post: TownhallPost) {
    setTownhallPosts((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === post.id);
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = post;
        return next;
      }

      return [post, ...current];
    });
  }

  async function loadTownhallPosts(limit = 20, filter: TownhallPostsFilter = postsFilter) {
    setIsLoadingPosts(true);
    setPostsError("");

    try {
      const response = await fetch(
        `/api/v1/townhall/posts?limit=${encodeURIComponent(String(limit))}&filter=${encodeURIComponent(filter)}`,
        {
          method: "GET",
          cache: "no-store"
        }
      );
      if (!response.ok) {
        throw new Error(`failed to load townhall posts (${response.status})`);
      }

      const payload = (await response.json()) as TownhallPostsPayload;
      setTownhallPosts(payload.posts ?? []);
    } catch {
      setPostsError("townhall notes are temporarily unavailable.");
    } finally {
      setIsLoadingPosts(false);
    }
  }

  function togglePostsPanel() {
    const nextOpen = !isPostsPanelOpen;
    setIsImmersive(false);
    setShowControls(false);
    setOpenPanel(null);
    setPanelDropId(null);
    setIsPostsPanelOpen(nextOpen);

    if (nextOpen) {
      void loadTownhallPosts(20, postsFilter);
    }
  }

  function handlePostsFilterChange(nextFilter: TownhallPostsFilter) {
    setPostsFilter(nextFilter);
    if (isPostsPanelOpen) {
      void loadTownhallPosts(20, nextFilter);
    }
  }

  async function postTownhallPostAction(
    postId: string,
    input: {
      action: TownhallPostAction;
      channel?: TownhallShareChannel;
    }
  ): Promise<TownhallPost | null> {
    const response = await fetch(`/api/v1/townhall/posts/${encodeURIComponent(postId)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(input)
    });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as TownhallPostsPayload;
    return payload.post ?? null;
  }

  async function handleTownhallPostAction(
    postId: string,
    action: TownhallPostAction,
    channel?: TownhallShareChannel
  ) {
    if (!viewer) {
      redirectToSignInForInteraction();
      return;
    }

    const post = await postTownhallPostAction(postId, { action, channel });
    if (post) {
      applyTownhallPost(post);
    }
  }

  async function handleTownhallPostSubmit() {
    const body = postDraft.trim();
    if (!body) {
      return;
    }

    if (!viewer) {
      redirectToSignInForInteraction();
      return;
    }

    setIsPublishingPost(true);
    setPostsError("");

    try {
      const linkedObject =
        postLinkedObjectKind !== "none" && postLinkedObjectId.trim()
          ? {
              kind: postLinkedObjectKind,
              id: postLinkedObjectId.trim(),
              ...(postLinkedObjectLabel.trim() ? { label: postLinkedObjectLabel.trim() } : {}),
              ...(postLinkedObjectHref.trim() ? { href: postLinkedObjectHref.trim() } : {})
            }
          : null;

      const response = await fetch("/api/v1/townhall/posts", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          body,
          ...(linkedObject ? { linkedObject } : {})
        })
      });

      if (!response.ok) {
        throw new Error(`failed to publish post (${response.status})`);
      }

      const payload = (await response.json()) as TownhallPostsPayload;
      if (payload.post) {
        applyTownhallPost(payload.post);
      }
      setPostDraft("");
      setPostLinkedObjectKind("none");
      setPostLinkedObjectId("");
      setPostLinkedObjectLabel("");
      setPostLinkedObjectHref("");
    } catch {
      setPostsError("post could not be published.");
    } finally {
      setIsPublishingPost(false);
    }
  }

  async function postSocialMutation(
    pathname: string,
    body?: Record<string, unknown>
  ): Promise<TownhallDropSocialSnapshot | null> {
    const response = await fetch(pathname, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { social?: TownhallDropSocialSnapshot };
    return payload.social ?? null;
  }

  async function handleLikeToggle(dropId: string) {
    if (!viewer) {
      redirectToSignInForInteraction();
      return;
    }

    const social = await postSocialMutation(
      `/api/v1/townhall/social/likes/${encodeURIComponent(dropId)}`
    );
    if (social) {
      applySocialSnapshot(social);
      void postTelemetryEvent(dropId, "interaction_like", {
        metadata: telemetryMetadata({
          source: "drop",
          action: "toggle",
          position: activeIndex + 1
        })
      });
    }
  }

  async function handleSaveToggle(dropId: string) {
    if (!viewer) {
      redirectToSignInForInteraction();
      return;
    }

    const social = await postSocialMutation(
      `/api/v1/townhall/social/saves/${encodeURIComponent(dropId)}`
    );
    if (social) {
      applySocialSnapshot(social);
      void postTelemetryEvent(dropId, "interaction_save", {
        metadata: telemetryMetadata({
          source: "drop",
          action: "toggle",
          position: activeIndex + 1
        })
      });
    }
  }

  async function handleCommentSubmit(dropId: string) {
    const body = commentDraft.trim();
    if (!body) return;

    if (!viewer) {
      redirectToSignInForInteraction();
      return;
    }

    const social = await postSocialMutation(
      `/api/v1/townhall/social/comments/${encodeURIComponent(dropId)}`,
      {
        body,
        ...(replyToCommentId ? { parentCommentId: replyToCommentId } : {})
      }
    );

    if (social) {
      applySocialSnapshot(social);
      void postTelemetryEvent(dropId, "interaction_comment", {
        metadata: telemetryMetadata({
          source: "drop",
          action: "submit",
          position: activeIndex + 1
        })
      });
    }

    setCommentDraft("");
    setReplyToCommentId(null);
  }

  function handleCommentReply(commentId: string) {
    setReplyToCommentId(commentId);
    requestAnimationFrame(() => {
      commentInputRef.current?.focus();
    });
  }

  async function handleCommentReport(dropId: string, commentId: string) {
    if (!viewer) {
      redirectToSignInForInteraction();
      return;
    }

    const social = await postSocialMutation(
      `/api/v1/townhall/social/comments/${encodeURIComponent(dropId)}/${encodeURIComponent(commentId)}/report`
    );
    if (social) {
      applySocialSnapshot(social);
    }
  }

  async function handleCommentModeration(
    dropId: string,
    commentId: string,
    action: "hide" | "restrict" | "delete" | "restore"
  ) {
    if (!viewer) {
      redirectToSignInForInteraction();
      return;
    }

    const social = await postSocialMutation(
      `/api/v1/townhall/social/comments/${encodeURIComponent(dropId)}/${encodeURIComponent(commentId)}/${action}`
    );
    if (social) {
      applySocialSnapshot(social);
    }
  }

  async function handleCommentAppeal(dropId: string, commentId: string) {
    if (!viewer) {
      redirectToSignInForInteraction();
      return;
    }

    const social = await postSocialMutation(
      `/api/v1/townhall/social/comments/${encodeURIComponent(dropId)}/${encodeURIComponent(commentId)}/appeal`
    );
    if (social) {
      applySocialSnapshot(social);
    }
  }

  async function recordShare(dropId: string, channel: TownhallShareChannel) {
    if (!viewer) {
      redirectToSignInForInteraction();
      return;
    }

    const social = await postSocialMutation(
      `/api/v1/townhall/social/shares/${encodeURIComponent(dropId)}`,
      { channel }
    );

    if (social) {
      applySocialSnapshot(social);
      void postTelemetryEvent(dropId, "interaction_share", {
        metadata: telemetryMetadata({
          source: "drop",
          channel,
          action: "submit",
          position: activeIndex + 1
        })
      });
    }
  }

  async function handleCopyForInternalDm(dropId: string) {
    const url = activeShareUrl(dropId);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }

    await recordShare(dropId, "internal_dm");
    setShareNotice("saved for internal dm delivery.");
  }

  function markPreviewAssetFailure(assetKey: string) {
    setFailedPreviewAssetKeys((current) => {
      if (current.includes(assetKey)) {
        return current;
      }

      return [...current, assetKey];
    });
  }

  function revealVideoDrop(dropId: string) {
    setRevealedVideoDropIds((current) => {
      if (current.includes(dropId)) {
        return current;
      }

      return [...current, dropId];
    });
  }

  if (!activeDrop) {
    return (
      <main className="townhall-page" data-testid="showroom-page">
        <section className="townhall-phone-shell townhall-empty" data-testid="showroom-shell-empty">
          <p className="townhall-brand">oneofakinde</p>
          <h1>townhall</h1>
          <p>no drops are available yet.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="townhall-page" data-testid="showroom-page">
      <section
        className={`townhall-phone-shell townhall-phone-shell-feed ${isImmersive ? "immersive" : ""}`}
        aria-label="townhall feed shell"
        data-testid="showroom-shell"
        data-showroom-ordering={parsedShowroomOrdering}
        data-showroom-media={effectiveShowroomMedia}
        data-feed-route-namespace={resolvedRouteNamespace}
      >
        <header className="townhall-header townhall-header-feed">
          <Link href={routes.studio(activeDrop.studioHandle)} className="townhall-avatar-link" aria-label="open creator studio">
            <span>{activeDrop.studioHandle.slice(0, 1).toUpperCase()}</span>
          </Link>
          <p className="townhall-brand">oneofakinde</p>
          <Link
            href={viewer ? routes.create() : routes.signIn(routes.create())}
            className="townhall-icon-link"
            aria-label="create drop"
            data-no-immersive-toggle="true"
          >
            <PlusIcon className="townhall-ui-icon" />
          </Link>
          <Link
            href={routes.townhallSearch()}
            className="townhall-icon-link"
            aria-label="search oneofakinde cosmos"
            data-no-immersive-toggle="true"
          >
            <SearchIcon className="townhall-ui-icon" />
          </Link>
        </header>

        <div
          className="townhall-feed-viewport"
          ref={viewportRef}
          onScroll={handleFeedScroll}
          onWheelCapture={markScrollIntent}
          onTouchMoveCapture={markScrollIntent}
          data-testid="showroom-feed-viewport"
        >
          {feedDrops.map((drop, index) => {
            const isActive = index === activeIndex;
            const isPaywalled = !ownedSet.has(drop.id);
            const openCurrentPanel = isActive && panelDropId === drop.id ? openPanel : null;
            const social = socialByDrop[drop.id] ?? defaultDropSocialSnapshot(drop.id);
            const comments = social.comments;
            const replyingToComment = replyToCommentId
              ? comments.find((entry) => entry.id === replyToCommentId) ?? null
              : null;
            const commentCount = social.commentCount;
            const collectStats = buildCollectStats(drop, index);
            const likeCount = social.likeCount;
            const shareCount = social.shareCount;
            const saveCount = social.saveCount;
            const isLiked = social.likedByViewer;
            const isSaved = social.savedByViewer;
            const isLocked = isPaywalled;
            const dropHeading = drop.seasonLabel.trim();
            const dropSubtitle = drop.episodeLabel.trim();
            const dropSurfaceMode = resolveDropModeForTownhallSurface(drop, index, mode);
            const dropCopy = MODE_COPY[dropSurfaceMode];
            const paywallHref = viewer ? routes.collectDrop(drop.id) : routes.signIn(routes.collectDrop(drop.id));
            const shareUrl = activeShareUrl(drop.id);
            const shareText = `${drop.title} on oneofakinde ${shareUrl}`;
            const resolvedPreview = resolveDropPreview(drop, dropSurfaceMode, {
              failedAssetKeys: failedPreviewAssetKeySet
            });
            const previewAsset = resolvedPreview.asset;
            const stageBackgroundStyle: StageBackgroundStyle = {
              backgroundColor: "#04070a",
              ...(previewAsset.type === "video" && previewAsset.posterSrc
                ? {
                    backgroundImage: `url(${previewAsset.posterSrc})`,
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover"
                  }
                : {}),
              ...(previewAsset.type === "audio" && previewAsset.posterSrc
                ? {
                    backgroundImage: `url(${previewAsset.posterSrc})`,
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover"
                  }
                : {}),
              ...(previewAsset.type === "image"
                ? {
                    backgroundImage: `url(${previewAsset.src})`,
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "cover"
                  }
                : {})
            };
            const canControlMedia =
              previewAsset.type === "video" || previewAsset.type === "audio";
            const showVideoPoster =
              previewAsset.type === "video" &&
              Boolean(previewAsset.posterSrc) &&
              !revealedVideoDropIds.includes(drop.id);

            if (!canControlMedia) {
              mediaRefs.current[index] = null;
            }

            return (
              <article
                key={drop.id}
                className={`townhall-feed-item ${isActive ? "active" : ""}`}
                data-index={index}
                data-drop-id={drop.id}
                data-testid="showroom-drop-card"
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
              >
                <section
                  className="townhall-stage"
                  aria-label={`${drop.title} preview`}
                  data-testid="showroom-drop-stage"
                  style={stageBackgroundStyle}
                  onPointerDownCapture={(event) => handleStagePointerDown(event, index)}
                  onPointerCancelCapture={handleStagePointerCancelOrUp}
                  onPointerUpCapture={(event) => handleStageTap(event, index, "pointer")}
                  onTouchStartCapture={(event) => handleStageTouchStart(event, index)}
                  onTouchEndCapture={(event) => handleStageTouchEnd(event, index)}
                  onClickCapture={(event) => handleStageTap(event, index, "click")}
                >
                  <div className="townhall-backdrop" />

                  {previewAsset.type === "video" ? (
                    <>
                      {previewAsset.posterSrc ? (
                        <OptimizedImage
                          className={`townhall-preview-video-poster ${showVideoPoster ? "" : "hidden"}`}
                          src={previewAsset.posterSrc}
                          alt={previewAsset.alt}
                          loading={isActive ? "eager" : "lazy"}
                          preset="dropPosterFull"
                          onError={() => {
                            revealVideoDrop(drop.id);
                          }}
                        />
                      ) : null}
                      <video
                        ref={(element) => {
                          mediaRefs.current[index] = element;
                        }}
                        className={`townhall-preview-video ${showVideoPoster ? "hidden" : ""}`}
                        src={previewAsset.src}
                        poster={previewAsset.posterSrc}
                        preload="metadata"
                        autoPlay
                        loop
                        playsInline
                        muted
                        onError={() => {
                          markPreviewAssetFailure(resolvedPreview.assetKey);
                        }}
                        onPlaying={() => {
                          revealVideoDrop(drop.id);
                        }}
                        onTimeUpdate={(event) => {
                          const media = event.currentTarget;
                          if (media.currentTime >= 0.35) {
                            revealVideoDrop(drop.id);
                          }
                          recordCompletionTelemetry(drop.id, media, isLocked);
                        }}
                      />
                    </>
                  ) : null}

                  {previewAsset.type === "audio" ? (
                    <>
                      {previewAsset.posterSrc ? (
                        <div
                          className="townhall-audio-poster"
                          style={{ backgroundImage: `url(${previewAsset.posterSrc})` }}
                          aria-label={previewAsset.alt}
                        />
                      ) : null}
                      <audio
                        ref={(element) => {
                          mediaRefs.current[index] = element;
                        }}
                        className="townhall-preview-audio"
                        src={previewAsset.src}
                        preload="metadata"
                        loop
                        muted
                        onError={() => {
                          markPreviewAssetFailure(resolvedPreview.assetKey);
                        }}
                        onTimeUpdate={(event) => {
                          recordCompletionTelemetry(drop.id, event.currentTarget, isLocked);
                        }}
                      />
                    </>
                  ) : null}

                  {previewAsset.type === "image" ? (
                    <OptimizedImage
                      className="townhall-preview-image"
                      src={previewAsset.src}
                      alt={previewAsset.alt}
                      loading={isActive ? "eager" : "lazy"}
                      preset="dropPosterFull"
                      onError={() => {
                        markPreviewAssetFailure(resolvedPreview.assetKey);
                      }}
                    />
                  ) : null}

                  {previewAsset.type === "text" ? (
                    <div className="townhall-text-preview" aria-label={previewAsset.alt} />
                  ) : null}

                  <div className="townhall-overlay" />

                  <div className="townhall-content">
                    <p className="townhall-kicker">{dropCopy.kicker}</p>
                    <p className="townhall-meta">
                      @{drop.studioHandle} · {formatUsd(drop.priceUsd)}
                    </p>
                    <h1 className="townhall-title">{drop.title}</h1>
                    {dropHeading ? <p className="townhall-subtitle">{dropHeading}</p> : null}
                    {dropSubtitle ? <p className="townhall-subtitle secondary">{dropSubtitle}</p> : null}
                    {drop.synopsis.trim() ? <p className="townhall-synopsis">{drop.synopsis}</p> : null}
                    <p className="townhall-meta">{formatPublishedDate(drop.releaseDate)}</p>
                  </div>

                  <aside className="townhall-social-rail" aria-label="social interactions" data-no-immersive-toggle="true">
                    <button
                      type="button"
                      className={`townhall-social-action ${isLiked ? "active" : ""}`}
                      onClick={() => {
                        void handleLikeToggle(drop.id);
                      }}
                      aria-label="like drop"
                    >
                      <HeartIcon className="townhall-social-icon" filled={isLiked} />
                      <small>{likeCount.toLocaleString("en-US")}</small>
                    </button>

                    <button
                      type="button"
                      className={`townhall-social-action ${openCurrentPanel === "comments" ? "active" : ""}`}
                      onClick={() => togglePanel("comments", drop.id)}
                      aria-label="open comments"
                    >
                      <CommentIcon className="townhall-social-icon" filled={openCurrentPanel === "comments"} />
                      <small>{commentCount}</small>
                    </button>

                    <button
                      type="button"
                      className={`townhall-social-action ${openCurrentPanel === "collect" ? "active" : ""}`}
                      onClick={() => togglePanel("collect", drop.id)}
                      aria-label="collect drop details"
                    >
                      <DiamondIcon className="townhall-social-icon" filled={openCurrentPanel === "collect"} />
                      <small>{collectStats.collectors.toLocaleString("en-US")}</small>
                    </button>

                    <button
                      type="button"
                      className={`townhall-social-action ${openCurrentPanel === "share" ? "active" : ""}`}
                      onClick={() => togglePanel("share", drop.id)}
                      aria-label="share drop"
                    >
                      <SendIcon className="townhall-social-icon" filled={openCurrentPanel === "share"} />
                      <small>{shareCount}</small>
                    </button>

                    <button
                      type="button"
                      className={`townhall-social-action ${isSaved ? "active" : ""}`}
                      onClick={() => {
                        void handleSaveToggle(drop.id);
                      }}
                      aria-label="save drop to private library"
                    >
                      <BookmarkIcon className="townhall-social-icon" filled={isSaved} />
                      <small>{saveCount.toLocaleString("en-US")}</small>
                    </button>
                  </aside>

                  {isActive && showControls && canControlMedia ? (
                    <section className="townhall-media-controls" aria-label="media controls" data-no-immersive-toggle="true">
                      <button
                        type="button"
                        className="townhall-control-button"
                        onClick={() => setIsMuted((current) => !current)}
                      >
                        {isMuted ? "unmute" : "mute"}
                      </button>
                      <button
                        type="button"
                        className="townhall-control-button"
                        onClick={() => setIsPlaying((current) => !current)}
                      >
                        {isPlaying ? "pause" : "play"}
                      </button>
                      <button
                        type="button"
                        className="townhall-control-button"
                        onClick={() => {
                          const media = mediaRefs.current[activeIndex];
                          if (!media) return;
                          media.currentTime = Math.max(0, media.currentTime - 10);
                        }}
                      >
                        -10s
                      </button>
                      <button
                        type="button"
                        className="townhall-control-button"
                        onClick={() => {
                          const media = mediaRefs.current[activeIndex];
                          if (!media) return;
                          const duration = Number.isFinite(media.duration) ? media.duration : media.currentTime + 10;
                          media.currentTime = Math.min(duration, media.currentTime + 10);
                        }}
                      >
                        +10s
                      </button>
                      <label className="townhall-volume-control">
                        volume
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={(event) => {
                            const nextVolume = Number(event.target.value);
                            setVolume(nextVolume);
                            setIsMuted(nextVolume === 0);
                          }}
                        />
                      </label>
                      <button type="button" className="townhall-control-button" onClick={() => setShowControls(false)}>
                        hide
                      </button>
                    </section>
                  ) : null}

                  {isActive && openCurrentPanel === "comments" ? (
                    <section className="townhall-overlay-panel" aria-label="drop comments" data-no-immersive-toggle="true">
                      <div className="townhall-overlay-head">
                        <h2>comments</h2>
                        <button type="button" onClick={() => setOpenPanel(null)} aria-label="close comments">
                          close
                        </button>
                      </div>
                      <ul className="townhall-comment-list">
                        {comments.map((comment) => (
                          <li
                            key={comment.id}
                            className="townhall-comment-item"
                            style={{ marginLeft: `${Math.min(comment.depth, 3) * 14}px` }}
                          >
                            <div className="townhall-comment-head">
                              <p>
                                <strong>@{comment.authorHandle}</strong> · {formatRelativeAge(comment.createdAt)}
                              </p>
                              <div className="townhall-comment-actions">
                                {comment.canReply && comment.visibility === "visible" ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCommentReply(comment.id);
                                    }}
                                  >
                                    reply
                                  </button>
                                ) : null}
                                {comment.canReport ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleCommentReport(drop.id, comment.id);
                                    }}
                                  >
                                    report
                                  </button>
                                ) : null}
                                {comment.canAppeal ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleCommentAppeal(drop.id, comment.id);
                                    }}
                                  >
                                    appeal
                                  </button>
                                ) : null}
                                {comment.canModerate ? (
                                  <>
                                    {comment.visibility !== "visible" ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void handleCommentModeration(drop.id, comment.id, "restore");
                                        }}
                                      >
                                        restore
                                      </button>
                                    ) : null}
                                    {comment.visibility !== "hidden" ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void handleCommentModeration(drop.id, comment.id, "hide");
                                        }}
                                      >
                                        hide
                                      </button>
                                    ) : null}
                                    {comment.visibility !== "restricted" ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void handleCommentModeration(drop.id, comment.id, "restrict");
                                        }}
                                      >
                                        restrict
                                      </button>
                                    ) : null}
                                    {comment.visibility !== "deleted" ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void handleCommentModeration(drop.id, comment.id, "delete");
                                        }}
                                      >
                                        delete
                                      </button>
                                    ) : null}
                                  </>
                                ) : null}
                              </div>
                            </div>
                            {comment.replyCount > 0 ? (
                              <p className="townhall-comment-replies">{comment.replyCount} repl{comment.replyCount === 1 ? "y" : "ies"}</p>
                            ) : null}
                            <p className={comment.visibility !== "visible" ? "townhall-comment-hidden" : undefined}>
                              {comment.visibility === "hidden"
                                ? "comment hidden by moderation."
                                : comment.visibility === "restricted"
                                  ? "comment restricted by moderation."
                                  : comment.visibility === "deleted"
                                    ? "comment deleted by moderation."
                                    : comment.body}
                            </p>
                            {comment.appealRequested ? (
                              <p className="townhall-comment-appeal-state">appeal pending review</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      {replyingToComment ? (
                        <p className="townhall-comment-reply-target">
                          replying to @{replyingToComment.authorHandle}
                          <button
                            type="button"
                            onClick={() => {
                              setReplyToCommentId(null);
                            }}
                          >
                            cancel
                          </button>
                        </p>
                      ) : null}
                      <div className="townhall-comment-form">
                        <input
                          ref={commentInputRef}
                          value={commentDraft}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          placeholder={replyingToComment ? "write a reply" : "write a comment"}
                          aria-label="write comment"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            void handleCommentSubmit(drop.id);
                          }}
                        >
                          {replyingToComment ? "reply" : "send"}
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {isActive && openCurrentPanel === "collect" ? (
                    <section className="townhall-overlay-panel" aria-label="collect drop details" data-no-immersive-toggle="true">
                      <div className="townhall-overlay-head">
                        <h2>collect drop</h2>
                        <button type="button" onClick={() => setOpenPanel(null)} aria-label="close collect details">
                          close
                        </button>
                      </div>
                      <dl className="townhall-collect-stats">
                        <div>
                          <dt>price</dt>
                          <dd>{formatUsd(drop.priceUsd)}</dd>
                        </div>
                        <div>
                          <dt>artist royalty</dt>
                          <dd>{collectStats.royaltyPercent === null ? "n/a" : `${collectStats.royaltyPercent}%`}</dd>
                        </div>
                        <div>
                          <dt># collectors</dt>
                          <dd>{collectStats.collectors}</dd>
                        </div>
                        <div>
                          <dt>floor</dt>
                          <dd>{formatUsd(collectStats.floorUsd)}</dd>
                        </div>
                        <div>
                          <dt>volume</dt>
                          <dd>{formatUsd(collectStats.volumeUsd)}</dd>
                        </div>
                      </dl>
                      <div className="townhall-overlay-actions">
                        <Link
                          href={dropOpenHref(drop.id, index + 1)}
                          onClick={() => {
                            void postTelemetryEvent(drop.id, "access_start", {
                              metadata: telemetryMetadata({
                                source: "drop",
                                position: activeIndex + 1,
                                action: "start"
                              })
                            });
                          }}
                        >
                          open drop
                        </Link>
                        <Link href={paywallHref}>collect</Link>
                      </div>
                    </section>
                  ) : null}

                  {isActive && openCurrentPanel === "share" ? (
                    <section className="townhall-overlay-panel" aria-label="share drop" data-no-immersive-toggle="true">
                      <div className="townhall-overlay-head">
                        <h2>send drop</h2>
                        <button type="button" onClick={() => setOpenPanel(null)} aria-label="close share panel">
                          close
                        </button>
                      </div>
                      <div className="townhall-share-grid">
                        <a
                          href={`sms:?body=${encodeURIComponent(shareText)}`}
                          onClick={() => {
                            void recordShare(drop.id, "sms");
                          }}
                        >
                          sms
                        </a>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            void recordShare(drop.id, "whatsapp");
                          }}
                        >
                          whatsapp
                        </a>
                        <a
                          href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
                            drop.title
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            void recordShare(drop.id, "telegram");
                          }}
                        >
                          telegram
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            void handleCopyForInternalDm(drop.id);
                          }}
                        >
                          internal dm
                        </button>
                      </div>
                      {shareNotice ? <p className="townhall-share-note">{shareNotice}</p> : null}
                    </section>
                  ) : null}

                </section>
              </article>
            );
          })}

          {isLoadingMore ? (
            <div className="townhall-feed-load-state" aria-live="polite">
              loading more drops...
            </div>
          ) : null}

          {loadMoreError ? (
            <button
              type="button"
              className="townhall-feed-load-state townhall-feed-load-retry"
              onClick={() => {
                void loadNextFeedPage();
              }}
            >
              {loadMoreError}
            </button>
          ) : null}
        </div>

        {isPostsPanelOpen ? (
          <section
            className="townhall-overlay-panel townhall-overlay-panel-posts"
            aria-label="townhall notes"
            data-no-immersive-toggle="true"
            data-testid="townhall-posts-panel"
          >
            <div className="townhall-overlay-head">
              <h2>townhall notes</h2>
              <button type="button" onClick={togglePostsPanel} aria-label="close townhall notes">
                close
              </button>
            </div>

            {viewer ? (
              <div className="townhall-post-compose">
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
                      const nextKind = event.target.value as TownhallPostLinkedObjectKind | "none";
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
                        onChange={(event) => setPostLinkedObjectId(event.target.value)}
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
                        onChange={(event) => setPostLinkedObjectLabel(event.target.value)}
                        placeholder="custom label (optional)"
                        aria-label="linked object label"
                      />
                      <input
                        value={postLinkedObjectHref}
                        onChange={(event) => setPostLinkedObjectHref(event.target.value)}
                        placeholder="custom href (optional)"
                        aria-label="linked object href"
                      />
                    </>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleTownhallPostSubmit();
                  }}
                  disabled={isPublishingPost || !postDraft.trim()}
                >
                  {isPublishingPost ? "publishing..." : "publish note"}
                </button>
              </div>
            ) : (
              <p className="townhall-post-sign-in-note">
                sign in to publish notes. <Link href={routes.signIn(routes.townhall())}>open sign in</Link>
              </p>
            )}

            {isLoadingPosts ? <p className="townhall-post-state">loading notes...</p> : null}
            {postsError ? <p className="townhall-post-state">{postsError}</p> : null}
            <div className="townhall-post-filter-row">
              <label htmlFor="townhall-post-filter">view</label>
              <select
                id="townhall-post-filter"
                data-testid="townhall-post-filter"
                value={postsFilter}
                onChange={(event) =>
                  handlePostsFilterChange(event.target.value as TownhallPostsFilter)
                }
              >
                <option value="all">all notes</option>
                <option value="following">followed threads</option>
                <option value="saved">saved threads</option>
              </select>
            </div>

            <ul className="townhall-post-list">
              {townhallPosts.map((post) => (
                <li key={post.id} className="townhall-post-item">
                  <p className="townhall-post-meta">
                    <strong>@{post.authorHandle}</strong> · {formatRelativeAge(post.createdAt)}
                  </p>
                  <p className={post.visibility !== "visible" ? "townhall-comment-hidden" : undefined}>
                    {post.visibility === "hidden"
                      ? "post hidden by moderation."
                      : post.visibility === "restricted"
                        ? "post restricted by moderation."
                        : post.visibility === "deleted"
                          ? "post deleted by moderation."
                          : post.body}
                  </p>
                  {post.linkedObject ? (
                    <a href={post.linkedObject.href} className="townhall-post-linked-object">
                      linked {post.linkedObject.kind}: {post.linkedObject.label}
                    </a>
                  ) : null}
                  <p className="townhall-post-engagement" data-testid="townhall-post-engagement">
                    {post.saveCount} saves · {post.followCount} follows · {post.shareCount} shares
                  </p>
                  <div className="townhall-post-actions">
                    {viewer ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            void handleTownhallPostAction(
                              post.id,
                              post.savedByViewer ? "unsave" : "save"
                            );
                          }}
                        >
                          {post.savedByViewer ? "unsave thread" : "save thread"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleTownhallPostAction(
                              post.id,
                              post.followedByViewer ? "unfollow" : "follow"
                            );
                          }}
                        >
                          {post.followedByViewer ? "unfollow thread" : "follow thread"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleTownhallPostAction(post.id, "share", "internal_dm");
                          }}
                        >
                          share thread
                        </button>
                      </>
                    ) : null}
                    {post.canReport ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleTownhallPostAction(post.id, "report");
                        }}
                      >
                        report
                      </button>
                    ) : null}
                    {post.canAppeal ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleTownhallPostAction(post.id, "appeal");
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
                              void handleTownhallPostAction(post.id, "restore");
                            }}
                          >
                            restore
                          </button>
                        ) : null}
                        {post.visibility !== "hidden" ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleTownhallPostAction(post.id, "hide");
                            }}
                          >
                            hide
                          </button>
                        ) : null}
                        {post.visibility !== "restricted" ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleTownhallPostAction(post.id, "restrict");
                            }}
                          >
                            restrict
                          </button>
                        ) : null}
                        {post.visibility !== "deleted" ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleTownhallPostAction(post.id, "delete");
                            }}
                          >
                            delete
                          </button>
                        ) : null}
                        {post.reportCount > 0 || post.appealRequested ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleTownhallPostAction(post.id, "dismiss");
                            }}
                          >
                            dismiss reports
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  <p
                    className="townhall-comment-appeal-state"
                    data-testid="townhall-post-moderation-state"
                  >
                    case {formatTownhallModerationCaseStateLabel(post.moderationCaseState)}
                    {post.reportCount > 0 ? ` · reports ${post.reportCount}` : ""}
                    {post.reportedAt ? ` · reported ${formatRelativeAge(post.reportedAt)}` : ""}
                    {post.appealRequestedAt ? ` · appeal ${formatRelativeAge(post.appealRequestedAt)}` : ""}
                    {post.moderatedAt ? ` · resolved ${formatRelativeAge(post.moderatedAt)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <TownhallBottomNav activeMode={modeNav(mode)} noImmersiveToggle />
      </section>

      <aside className="townhall-side-notes" aria-label="townhall concept notes">
        <h2>townhall shell</h2>
        <p>smooth snap feed with one drop at a time, autoplay preview, and tap-to-immerse behavior.</p>
        <p>social lane now supports like, comments, collect, send, and save-to-private-library interactions.</p>
        <p>notes panel supports standalone artist notes + collector reflections with linked object references.</p>
      </aside>
    </main>
  );
}
