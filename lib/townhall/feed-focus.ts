import type { Drop } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import {
  DEFAULT_TOWNHALL_SHOWROOM_ORDERING,
  type TownhallShowroomMediaFilter,
  type TownhallShowroomOrdering
} from "@/lib/townhall/showroom-query";

const FOCUS_DROP_QUERY_KEY = "focusDrop";
const FOCUS_POSITION_QUERY_KEY = "focusPosition";

export type TownhallFeedFocus = {
  dropId: string | null;
  position: number | null;
};

export function routeForTownhallMediaFilter(mediaFilter: TownhallShowroomMediaFilter): string {
  if (mediaFilter === "watch") return routes.townhallWatch();
  if (mediaFilter === "listen") return routes.townhallListen();
  if (mediaFilter === "read") return routes.townhallRead();
  if (mediaFilter === "photos") return routes.townhallPhotos();
  if (mediaFilter === "live") return routes.townhallLive();
  return routes.townhall();
}

export function parseTownhallFeedFocusDrop(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function parseTownhallFeedFocusPosition(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return null;
  }

  return Math.floor(numeric);
}

export function resolveTownhallFeedActiveIndex(
  drops: Array<Pick<Drop, "id">>,
  focus: TownhallFeedFocus
): number {
  if (focus.dropId) {
    const dropIndex = drops.findIndex((drop) => drop.id === focus.dropId);
    if (dropIndex >= 0) {
      return dropIndex;
    }
  }

  if (focus.position !== null) {
    return Math.min(Math.max(focus.position - 1, 0), Math.max(drops.length - 1, 0));
  }

  return 0;
}

export function buildTownhallFeedHrefWithFocus(input: {
  mediaFilter: TownhallShowroomMediaFilter;
  ordering: TownhallShowroomOrdering;
  focusDropId: string;
  focusPosition: number;
}): string {
  const pathname = routeForTownhallMediaFilter(input.mediaFilter);
  const params = new URLSearchParams();

  if (input.ordering !== DEFAULT_TOWNHALL_SHOWROOM_ORDERING) {
    params.set("lane_key", input.ordering);
  }

  const focusDropId = parseTownhallFeedFocusDrop(input.focusDropId);
  if (focusDropId) {
    params.set(FOCUS_DROP_QUERY_KEY, focusDropId);
  }

  const focusPosition = parseTownhallFeedFocusPosition(String(input.focusPosition));
  if (focusPosition !== null) {
    params.set(FOCUS_POSITION_QUERY_KEY, String(focusPosition));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export const townhallFeedFocusQueryKeys = {
  drop: FOCUS_DROP_QUERY_KEY,
  position: FOCUS_POSITION_QUERY_KEY
} as const;
