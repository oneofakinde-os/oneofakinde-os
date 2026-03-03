import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import {
  parseTownhallFeedFocusDrop,
  parseTownhallFeedFocusPosition,
  townhallFeedFocusQueryKeys
} from "@/lib/townhall/feed-focus";
import { loadTownhallFeedContext } from "../load-feed-context";

type ShowroomLivePageProps = {
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

export default async function ShowroomLivePage({ searchParams }: ShowroomLivePageProps) {
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
    mediaFilter: "live",
    ordering: laneKey
  });

  return (
    <TownhallFeedScreen
      mode="live"
      viewer={viewer}
      drops={drops}
      initialFocusDropId={parseTownhallFeedFocusDrop(firstQueryValue(params[townhallFeedFocusQueryKeys.drop]))}
      initialFocusPosition={parseTownhallFeedFocusPosition(firstQueryValue(params[townhallFeedFocusQueryKeys.position]))}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
      initialNextCursor={nextCursor}
      initialHasMore={hasMore}
      pageSize={pageSize}
      showroomMedia="live"
      showroomOrdering={ordering}
    />
  );
}
