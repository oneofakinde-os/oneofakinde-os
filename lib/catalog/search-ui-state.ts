import { parseCollectMarketLane } from "@/lib/collect/market-lanes";
import type { CollectMarketLane, CollectOfferState } from "@/lib/domain/contracts";
import {
  parseCatalogSearchCollectibility,
  parseCatalogSearchOfferState,
  parseCatalogSearchPrice,
  parseCatalogSearchQuery
} from "@/lib/catalog/search";
import type { CollectibilityFilter } from "@/lib/discovery/search-enhancements";

export type CatalogSearchUiStateInput = {
  query?: string | null;
  lane?: string | null;
  offerState?: string | null;
  collectibility?: string | null;
  minPriceUsd?: string | null;
  maxPriceUsd?: string | null;
};

export type CatalogSearchUiState = {
  query: string;
  lane: CollectMarketLane;
  offerState: CollectOfferState | null;
  collectibility: CollectibilityFilter;
  minPriceUsd: number | null;
  maxPriceUsd: number | null;
};

export function parseCatalogSearchUiState(input: CatalogSearchUiStateInput = {}): CatalogSearchUiState {
  return {
    query: parseCatalogSearchQuery(input.query),
    lane: parseCollectMarketLane(input.lane),
    offerState: parseCatalogSearchOfferState(input.offerState),
    collectibility: parseCatalogSearchCollectibility(input.collectibility),
    minPriceUsd: parseCatalogSearchPrice(input.minPriceUsd),
    maxPriceUsd: parseCatalogSearchPrice(input.maxPriceUsd)
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
  if (state.collectibility !== "all") {
    params.set("collectibility", state.collectibility);
  }
  if (state.minPriceUsd !== null) {
    params.set("min_price", String(state.minPriceUsd));
  }
  if (state.maxPriceUsd !== null) {
    params.set("max_price", String(state.maxPriceUsd));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
