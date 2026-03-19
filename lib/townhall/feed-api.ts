import type { FeedResponse } from "@/lib/bff/contracts";
import { getRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallDropSocialSnapshot } from "@/lib/domain/contracts";
import { emitOperationalEvent } from "@/lib/ops/observability";
import {
  paginateTownhallFeed,
  parseTownhallFeedPageSize,
  type TownhallFeedPage
} from "@/lib/townhall/feed-pagination";
import { rankDropsForTownhall } from "@/lib/townhall/ranking";
import {
  buildCollectListingsByDropId,
  filterDropsForShowroomMedia,
  parseTownhallShowroomMediaFilter,
  parseTownhallShowroomOrderingFromParams,
  type TownhallShowroomMediaFilter,
  type TownhallShowroomOrdering
} from "@/lib/townhall/showroom-query";

type TownhallFeedViewer = {
  accountId: string;
  handle: string;
};

export type TownhallFeedResponse = {
  viewer: TownhallFeedViewer | null;
  feed: TownhallFeedPage;
  showroom: {
    mediaFilter: TownhallShowroomMediaFilter;
    ordering: TownhallShowroomOrdering;
    effectiveOrdering: TownhallShowroomOrdering;
  };
  ownedDropIds: string[];
  socialByDropId: Record<string, TownhallDropSocialSnapshot>;
};

export type BuildTownhallFeedPayloadResult =
  | {
      ok: true;
      townhallFeed: TownhallFeedResponse;
      publicFeed: FeedResponse;
    }
  | {
      ok: false;
      error: string;
    };

function resolveEffectiveOrdering(
  ordering: TownhallShowroomOrdering,
  hasViewerSession: boolean,
  viewerHasTasteSignals: boolean
): TownhallShowroomOrdering {
  if (ordering !== "for_you") {
    return ordering;
  }

  return hasViewerSession && viewerHasTasteSignals ? "for_you" : "rising";
}

export async function buildTownhallFeedPayload(request: Request): Promise<BuildTownhallFeedPayloadResult> {
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const pageSize = parseTownhallFeedPageSize(url.searchParams.get("limit"));
  const mediaFilter = parseTownhallShowroomMediaFilter(url.searchParams.get("media"));
  const ordering = parseTownhallShowroomOrderingFromParams(url.searchParams);

  const [session, collectInventory] = await Promise.all([
    getRequestSession(request),
    commerceBffService.getCollectInventory(null, "all")
  ]);
  const drops = await commerceBffService.listDrops(session?.accountId ?? null);
  const filteredDrops = filterDropsForShowroomMedia(drops, mediaFilter, {
    collectListingsByDropId: buildCollectListingsByDropId(collectInventory.listings)
  });

  const [collection, library] = session
    ? await Promise.all([
        commerceBffService.getMyCollection(session.accountId),
        commerceBffService.getLibrary(session.accountId)
      ])
    : [null, null];
  const viewerHasTasteSignals = Boolean(
    (collection?.ownedDrops ?? []).length || (library?.savedDrops ?? []).length
  );
  const effectiveOrdering = resolveEffectiveOrdering(ordering, Boolean(session), viewerHasTasteSignals);

  const telemetryByDropId = await commerceBffService.getTownhallTelemetrySignals(
    filteredDrops.map((drop) => drop.id)
  );
  const rankedDrops = rankDropsForTownhall(filteredDrops, {
    telemetryByDropId,
    laneKey: effectiveOrdering,
    viewerAccountId: session?.accountId ?? null,
    viewerHasTasteSignals
  });

  console.info(
    `[ook.showroom] lane_key=${ordering} lane_effective=${effectiveOrdering} media=${mediaFilter} session=${session ? "true" : "false"} page_size=${pageSize}`
  );
  emitOperationalEvent("showroom.feed.request", {
    lane_key: effectiveOrdering,
    lane_key_requested: ordering,
    media_filter: mediaFilter,
    viewer_session: Boolean(session),
    page_size: pageSize,
    has_cursor: Boolean(cursor)
  });

  let page: TownhallFeedPage;
  try {
    page = paginateTownhallFeed(rankedDrops, {
      cursor,
      pageSize
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "invalid cursor"
    };
  }

  const pageDropIds = page.drops.map((drop) => drop.id);
  const social = await commerceBffService.getTownhallSocialSnapshot(
    session?.accountId ?? null,
    pageDropIds
  );

  return {
    ok: true,
    townhallFeed: {
      viewer: session
        ? {
            accountId: session.accountId,
            handle: session.handle
          }
        : null,
      feed: page,
      showroom: {
        mediaFilter,
        ordering,
        effectiveOrdering
      },
      ownedDropIds: (collection?.ownedDrops ?? []).map((entry) => entry.drop.id),
      socialByDropId: social.byDropId as Record<string, TownhallDropSocialSnapshot>
    },
    publicFeed: {
      drops: page.drops,
      lane_key: effectiveOrdering,
      total: page.totalCount
    }
  };
}
