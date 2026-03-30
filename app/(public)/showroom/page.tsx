import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import {
  parseTownhallFeedFocusDrop,
  parseTownhallFeedFocusPosition,
  townhallFeedFocusQueryKeys
} from "@/lib/townhall/feed-focus";
import type { Metadata } from "next";
import { loadTownhallFeedContext } from "./load-feed-context";

export const metadata: Metadata = {
  title: "showroom",
  description: "browse the latest drops from independent studios on oneofakinde.",
};

type ShowroomPageProps = {
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

export default async function ShowroomPage({ searchParams }: ShowroomPageProps) {
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
    mediaFilter,
    ordering
  } = await loadTownhallFeedContext({
    mediaFilter: firstQueryValue(params.media),
    ordering: laneKey
  });

  return (
    <TownhallFeedScreen
      mode="townhall"
      routeNamespace="showroom"
      viewer={viewer}
      drops={drops}
      initialFocusDropId={parseTownhallFeedFocusDrop(firstQueryValue(params[townhallFeedFocusQueryKeys.drop]))}
      initialFocusPosition={parseTownhallFeedFocusPosition(firstQueryValue(params[townhallFeedFocusQueryKeys.position]))}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
      initialNextCursor={nextCursor}
      initialHasMore={hasMore}
      pageSize={pageSize}
      showroomMedia={mediaFilter}
      showroomOrdering={ordering}
    />
  );
}
