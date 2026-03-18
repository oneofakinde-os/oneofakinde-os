import { getRequestSession } from "@/lib/bff/auth";
import { badRequest, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallDropSocialSnapshot } from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";
import { emitOperationalEvent } from "@/lib/ops/observability";
import {
  paginateTownhallFeed,
  parseTownhallFeedPageSize
} from "@/lib/townhall/feed-pagination";
import { rankDropsForTownhall } from "@/lib/townhall/ranking";
import {
  buildCollectListingsByDropId,
  filterDropsForShowroomMedia,
  parseTownhallShowroomMediaFilter,
  parseTownhallShowroomOrderingFromParams
} from "@/lib/townhall/showroom-query";

export async function GET(request: Request) {
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

  console.info(
    `[ook.showroom] lane_key=${ordering} media=${mediaFilter} session=${session ? "true" : "false"} page_size=${pageSize}`
  );
  emitOperationalEvent("showroom.feed.request", {
    lane_key: ordering,
    media_filter: mediaFilter,
    viewer_session: Boolean(session),
    page_size: pageSize,
    has_cursor: Boolean(cursor)
  });

  let page;
  try {
    page = paginateTownhallFeed(rankedDrops, {
      cursor,
      pageSize
    });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "invalid cursor");
  }

  const pageDropIds = page.drops.map((drop) => drop.id);
  const social = await commerceBffService.getTownhallSocialSnapshot(
    session?.accountId ?? null,
    pageDropIds
  );

  return ok({
    viewer: session
      ? {
          accountId: session.accountId,
          handle: session.handle
        }
      : null,
    feed: page,
    showroom: {
      mediaFilter,
      ordering
    },
    ownedDropIds: (collection?.ownedDrops ?? []).map((entry) => entry.drop.id),
    socialByDropId: social.byDropId as Record<string, TownhallDropSocialSnapshot>
  });
}
