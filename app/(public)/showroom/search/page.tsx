import { TownhallSearchScreen } from "@/features/townhall/townhall-search-screen";
import { executeCatalogSearch } from "@/lib/catalog/search";
import { parseCatalogSearchUiState } from "@/lib/catalog/search-ui-state";
import { routes } from "@/lib/routes";
import { getOptionalSession } from "@/lib/server/session";

type TownhallSearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    lane?: string | string[];
    offer_state?: string | string[];
    collectibility?: string | string[];
    min_price?: string | string[];
    max_price?: string | string[];
  }>;
};

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function TownhallSearchPage({ searchParams }: TownhallSearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const searchState = parseCatalogSearchUiState({
    query: firstParam(resolvedSearchParams.q),
    lane: firstParam(resolvedSearchParams.lane),
    offerState: firstParam(resolvedSearchParams.offer_state),
    collectibility: firstParam(resolvedSearchParams.collectibility),
    minPriceUsd: firstParam(resolvedSearchParams.min_price),
    maxPriceUsd: firstParam(resolvedSearchParams.max_price)
  });

  const [session, search] = await Promise.all([
    getOptionalSession(),
    executeCatalogSearch({
      query: searchState.query,
      lane: searchState.lane,
      offerState: searchState.offerState,
      collectibility: searchState.collectibility,
      minPriceUsd: searchState.minPriceUsd,
      maxPriceUsd: searchState.maxPriceUsd
    })
  ]);

  return (
    <TownhallSearchScreen
      session={session}
      search={search}
      searchState={searchState}
      basePath={routes.showroomSearch()}
    />
  );
}
