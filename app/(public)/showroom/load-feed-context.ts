import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { rankDropsForTownhall } from "@/lib/townhall/ranking";
import { DEFAULT_TOWNHALL_FEED_PAGE_SIZE, paginateTownhallFeed } from "@/lib/townhall/feed-pagination";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallDropSocialSnapshot } from "@/lib/domain/contracts";
import {
  filterDropsForShowroomMedia,
  parseTownhallShowroomMediaFilter,
  parseTownhallShowroomOrdering,
  type TownhallShowroomMediaFilter,
  type TownhallShowroomOrdering
} from "@/lib/townhall/showroom-query";

type TownhallViewer = {
  accountId: string;
  handle: string;
};

type LoadTownhallFeedContextOptions = {
  mediaFilter?: TownhallShowroomMediaFilter | string | null;
  ordering?: TownhallShowroomOrdering | string | null;
};

export async function loadTownhallFeedContext(options: LoadTownhallFeedContextOptions = {}) {
  const mediaFilter = parseTownhallShowroomMediaFilter(options.mediaFilter);
  const ordering = parseTownhallShowroomOrdering(options.ordering);
  const [session, drops] = await Promise.all([getOptionalSession(), gateway.listDrops()]);
  const filteredDrops = filterDropsForShowroomMedia(drops, mediaFilter);

  const collection = session ? await gateway.getMyCollection(session.accountId) : null;
  const viewerHasTasteSignals = Boolean((collection?.ownedDrops ?? []).length);

  const telemetryByDropId = await commerceBffService.getTownhallTelemetrySignals(
    filteredDrops.map((drop) => drop.id)
  );
  const rankedDrops = rankDropsForTownhall(filteredDrops, {
    telemetryByDropId,
    laneKey: ordering,
    viewerAccountId: session?.accountId ?? null,
    viewerHasTasteSignals
  });
  const initialPage = paginateTownhallFeed(rankedDrops, {
    pageSize: DEFAULT_TOWNHALL_FEED_PAGE_SIZE
  });
  const initialDropIds = initialPage.drops.map((drop) => drop.id);

  if (!session) {
    const social = await commerceBffService.getTownhallSocialSnapshot(null, initialDropIds);
    return {
      viewer: null as TownhallViewer | null,
      drops: initialPage.drops,
      ownedDropIds: [] as string[],
      socialByDropId: social.byDropId as Record<string, TownhallDropSocialSnapshot>,
      nextCursor: initialPage.nextCursor,
      hasMore: initialPage.hasMore,
      pageSize: initialPage.pageSize,
      mediaFilter,
      ordering
    };
  }

  const social = await commerceBffService.getTownhallSocialSnapshot(session.accountId, initialDropIds);

  return {
    viewer: {
      accountId: session.accountId,
      handle: session.handle
    } as TownhallViewer,
    drops: initialPage.drops,
    ownedDropIds: (collection?.ownedDrops ?? []).map((entry) => entry.drop.id),
    socialByDropId: social.byDropId as Record<string, TownhallDropSocialSnapshot>,
    nextCursor: initialPage.nextCursor,
    hasMore: initialPage.hasMore,
    pageSize: initialPage.pageSize,
    mediaFilter,
    ordering
  };
}
