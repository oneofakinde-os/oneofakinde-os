import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import {
  parseTownhallFeedFocusDrop,
  parseTownhallFeedFocusPosition,
  townhallFeedFocusQueryKeys
} from "@/lib/townhall/feed-focus";
import { loadTownhallFeedContext } from "../load-feed-context";

type TownhallWatchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function TownhallWatchPage({ searchParams }: TownhallWatchPageProps) {
  const params = (await searchParams) ?? {};
  const laneKey = firstQueryValue(params.lane_key) ?? firstQueryValue(params.ordering);
  const {
    viewer,
    drops,
    ownedDropIds,
    socialByDropId,
    nextCursor,
    hasMore,
    pageSize,
    ordering
  } = await loadTownhallFeedContext({
    mediaFilter: "watch",
    ordering: laneKey
  });
  return (
    <TownhallFeedScreen
      mode="watch"
      viewer={viewer}
      drops={drops}
      initialFocusDropId={parseTownhallFeedFocusDrop(firstQueryValue(params[townhallFeedFocusQueryKeys.drop]))}
      initialFocusPosition={parseTownhallFeedFocusPosition(firstQueryValue(params[townhallFeedFocusQueryKeys.position]))}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
      initialNextCursor={nextCursor}
      initialHasMore={hasMore}
      pageSize={pageSize}
      showroomMedia="watch"
      showroomOrdering={ordering}
    />
  );
}
