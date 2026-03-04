import { parseCollectMarketLane } from "@/lib/collect/market-lanes";
import type { CollectMarketLane, CollectOfferState } from "@/lib/domain/contracts";
import { parseCatalogSearchOfferState, parseCatalogSearchQuery } from "@/lib/catalog/search";

export type CatalogSearchUiStateInput = {
  query?: string | null;
  lane?: string | null;
  offerState?: string | null;
};

export type CatalogSearchUiState = {
  query: string;
  lane: CollectMarketLane;
  offerState: CollectOfferState | null;
};

export function parseCatalogSearchUiState(input: CatalogSearchUiStateInput = {}): CatalogSearchUiState {
  return {
    query: parseCatalogSearchQuery(input.query),
    lane: parseCollectMarketLane(input.lane),
    offerState: parseCatalogSearchOfferState(input.offerState)
  };
}

export function buildCatalogSearchHref(pathname: string, state: CatalogSearchUiState): string {
  const params = new URLSearchParams();
  if (state.query) {
    params.set("q", state.query);
  }
  if (state.lane !== "all") {
    params.set("lane", state.lane);
  }
  if (state.offerState) {
    params.set("offer_state", state.offerState);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
