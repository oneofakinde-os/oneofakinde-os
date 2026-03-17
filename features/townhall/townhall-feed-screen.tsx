"use client";

import { formatUsd } from "@/features/shared/format";
import type {
  Drop,
  TownhallDropSocialSnapshot,
  TownhallShareChannel,
  TownhallTelemetryEventType
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import {
  DEFAULT_TOWNHALL_SHOWROOM_ORDERING,
  type TownhallShowroomOrdering
} from "@/lib/townhall/showroom-query";
import {
  resolveDropModeForTownhallSurface,
  type TownhallSurfaceMode
} from "@/lib/townhall/feed-mode";
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
  showroomOrdering?: TownhallShowroomOrdering;
  showroomMedia?: string;
  pageSize?: number;
  initialHasMore?: boolean;
  initialNextCursor?: string | null;
  initialFocusDropId?: string | null;
  initialFocusPosition?: number | null;
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

const SHOWROOM_MODES = [
  { value: "all", label: "all", href: routes.townhall() },
  { value: "agora", label: "agora", href: `${routes.townhall()}?media=agora` },
  { value: "watch", label: "watch", href: routes.townhallWatch() },
  { value: "listen", label: "listen", href: routes.townhallListen() },
  { value: "read", label: "read", href: routes.townhallRead() },
  { value: "photos", label: "photos", href: routes.townhallGallery() },
  { value: "live", label: "live", href: routes.townhallLive() }
] as const;

const SHOWROOM_ORDERING_OPTIONS = [
  { value: "featured", label: "featured" },
  { value: "for_you", label: "for you" },
  { value: "rising", label: "rising" },
  { value: "newest", label: "newest" },
  { value: "most_collected", label: "most collected" },
  { value: "new_voices", label: "new voices" },
  { value: "sustained_craft", label: "sustained craft" }
] as const;

