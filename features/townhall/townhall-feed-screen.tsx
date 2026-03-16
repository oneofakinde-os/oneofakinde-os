"use client";

import { formatUsd } from "@/features/shared/format";
import type {
  Drop,
  TownhallDropSocialSnapshot,
  TownhallShareChannel,
  TownhallTelemetryEventType
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import { resolveDropModeForTownhallSurface, type TownhallSurfaceMode } from "@/lib/townhall/feed-mode";
import { resolveDropPreview } from "@/lib/townhall/preview-media";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

type TownhallFeedScreenProps = {
  mode: TownhallSurfaceMode;
  viewer: {
    accountId: string;
    handle: string;
  } | null;
  drops: Drop[];
  ownedDropIds?: string[];
  initialSocialByDropId?: Record<string, TownhallDropSocialSnapshot>;
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

const LONG_PRESS_CONTROLS_MS = 420;
const SWIPE_EXIT_DELTA_PX = 82;
const SWIPE_EXIT_MAX_DURATION_MS = 920;
const SWIPE_VERTICAL_BIAS = 1.15;
const LONG_PRESS_SUPPRESS_TAP_MS = 700;

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
  if (mode === "townhall") return "townhall";
  if (mode === "watch") return "watch";
  if (mode === "listen") return "listen";
  if (mode === "read") return "read";
  if (mode === "photos") return "photos";
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

function roundTelemetryMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

export function TownhallFeedScreen({
  mode,
  viewer,
  drops,
  ownedDropIds = [],
  initialSocialByDropId = {}
}: TownhallFeedScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isImmersive, setIsImmersive] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [isPlaying, setIsPlaying] = useState(true);
  const [socialByDrop, setSocialByDrop] = useState<Record<string, TownhallDropSocialSnapshot>>(() =>
    createInitialSocialMap(drops, initialSocialByDropId)
  );
  const [openPanel, setOpenPanel] = useState<TownhallPanel | null>(null);
  const [panelDropId, setPanelDropId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [shareOrigin, setShareOrigin] = useState("https://oneofakinde-os.vercel.app");
  const [failedPreviewAssetKeys, setFailedPreviewAssetKeys] = useState<string[]>([]);
  const [revealedVideoDropIds, setRevealedVideoDropIds] = useState<string[]>([]);

  const viewportRef = useRef<HTMLDivElement | null>(null);
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

  const failedPreviewAssetKeySet = useMemo(
    () => new Set(failedPreviewAssetKeys),
    [failedPreviewAssetKeys]
  );
  const ownedSet = useMemo(() => new Set(ownedDropIds), [ownedDropIds]);

  const activeDrop = drops[activeIndex] ?? drops[0] ?? null;

  async function postTelemetryEvent(
    dropId: string,
    eventType: TownhallTelemetryEventType,
    payload?: {
      watchTimeSeconds?: number;
      completionPercent?: number;
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
          ...(payload ?? {})
        })
      });
    } catch {
      // Best-effort telemetry should not interrupt the feed UX.
    }
  }

  function flushWatchTimeTelemetry(nextStartMs: number) {
    const previousDropId = watchTimeDropIdRef.current;
    const previousStartedAtMs = watchTimeStartedAtMsRef.current;
    if (!previousDropId || previousStartedAtMs <= 0) {
      return;
    }

    const elapsedSeconds = roundTelemetryMetric((nextStartMs - previousStartedAtMs) / 1000);
    if (elapsedSeconds < 1) {
      return;
    }

    void postTelemetryEvent(previousDropId, "watch_time", {
      watchTimeSeconds: elapsedSeconds
    });
  }

  function recordCompletionTelemetry(dropId: string, media: HTMLMediaElement) {
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
    void postTelemetryEvent(dropId, "completion", {
      completionPercent: roundTelemetryMetric(Math.min(100, completionPercent))
    });
  }

  useEffect(() => {
    setSocialByDrop((current) => upsertSocialMap(current, drops));
  }, [drops]);

  useEffect(() => {
    const nowMs = Date.now();
    flushWatchTimeTelemetry(nowMs);
    watchTimeDropIdRef.current = activeDrop?.id ?? null;
    watchTimeStartedAtMsRef.current = nowMs;
  }, [activeDrop?.id]);

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
  }, [activeIndex, drops.length, isImmersive]);

  useEffect(() => {
    setShowControls(false);
    setOpenPanel(null);
    setPanelDropId(null);
    setCommentDraft("");
    setShareNotice("");
    setIsPlaying(true);
  }, [activeIndex]);

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

  if (!activeDrop) {
    return (
      <main className="townhall-page">
        <section className="townhall-phone-shell townhall-empty">
          <p className="townhall-brand">oneofakinde</p>
          <h1>townhall</h1>
          <p>no drops are available yet.</p>
        </section>
      </main>
    );
  }

  function togglePanel(panel: TownhallPanel, dropId: string) {
    if (openPanel === panel && panelDropId === dropId) {
      setOpenPanel(null);
      setPanelDropId(null);
      return;
    }

    setIsImmersive(false);
    setShowControls(false);
    setOpenPanel(panel);
    setPanelDropId(dropId);
    setShareNotice("");

    if (panel === "collect") {
      void postTelemetryEvent(dropId, "collect_intent");
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

  function currentFeedHref(): string {
    if (mode === "townhall") return routes.townhall();
    if (mode === "watch") return routes.townhallWatch();
    if (mode === "listen") return routes.townhallListen();
    if (mode === "read") return routes.townhallRead();
    if (mode === "photos") return routes.townhallGallery();
    return routes.townhallLive();
  }

  function redirectToSignInForInteraction() {
    if (typeof window === "undefined") {
      return;
    }

    window.location.href = routes.signIn(currentFeedHref());
  }

  function applySocialSnapshot(snapshot: TownhallDropSocialSnapshot) {
    setSocialByDrop((current) => ({
      ...current,
      [snapshot.dropId]: {
        ...snapshot,
        comments: [...snapshot.comments]
      }
    }));
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
      { body }
    );

    if (social) {
      applySocialSnapshot(social);
    }

    setCommentDraft("");
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

  return (
    <main className="townhall-page">
      <section className={`townhall-phone-shell townhall-phone-shell-feed ${isImmersive ? "immersive" : ""}`} aria-label="townhall feed shell">
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
          <form
            action={routes.townhallSearch()}
            method="get"
            className="townhall-search-form townhall-search-form-feed"
            role="search"
            aria-label="search oneofakinde"
            data-no-immersive-toggle="true"
          >
            <SearchIcon className="townhall-search-inline-icon" />
            <input
              type="search"
              name="q"
              className="townhall-search-input"
              placeholder="search users, worlds, and drops"
              aria-label="search users, worlds, and drops"
            />
          </form>
        </header>

        <div
          className="townhall-feed-viewport"
          ref={viewportRef}
          onScroll={handleFeedScroll}
          onWheelCapture={markScrollIntent}
          onTouchMoveCapture={markScrollIntent}
        >
          {drops.map((drop, index) => {
            const isActive = index === activeIndex;
            const isPaywalled = !ownedSet.has(drop.id);
            const openCurrentPanel = isActive && panelDropId === drop.id ? openPanel : null;
            const social = socialByDrop[drop.id] ?? defaultDropSocialSnapshot(drop.id);
            const comments = social.comments;
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
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
              >
                <section
                  className="townhall-stage"
                  aria-label={`${drop.title} preview`}
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
                        <img
                          className={`townhall-preview-video-poster ${showVideoPoster ? "" : "hidden"}`}
                          src={previewAsset.posterSrc}
                          alt={previewAsset.alt}
                          loading={isActive ? "eager" : "lazy"}
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
                          recordCompletionTelemetry(drop.id, media);
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
                          recordCompletionTelemetry(drop.id, event.currentTarget);
                        }}
                      />
                    </>
                  ) : null}

                  {previewAsset.type === "image" ? (
                    <img
                      className="townhall-preview-image"
                      src={previewAsset.src}
                      alt={previewAsset.alt}
                      loading={isActive ? "eager" : "lazy"}
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
                          <li key={comment.id}>
                            <p>
                              <strong>@{comment.authorHandle}</strong> · {formatRelativeAge(comment.createdAt)}
                            </p>
                            <p>{comment.body}</p>
                          </li>
                        ))}
                      </ul>
                      <div className="townhall-comment-form">
                        <input
                          value={commentDraft}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          placeholder="write a comment"
                          aria-label="write comment"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            void handleCommentSubmit(drop.id);
                          }}
                        >
                          send
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
                        <Link href={routes.drop(drop.id)}>open drop</Link>
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
        </div>

        <TownhallBottomNav activeMode={modeNav(mode)} noImmersiveToggle />
      </section>

      <aside className="townhall-side-notes" aria-label="townhall concept notes">
        <h2>townhall shell</h2>
        <p>smooth snap feed with one drop at a time, autoplay preview, and tap-to-immerse behavior.</p>
        <p>social lane now supports like, comments, collect, send, and save-to-private-library interactions.</p>
      </aside>
    </main>
  );
}
