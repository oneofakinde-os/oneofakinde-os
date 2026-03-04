/**
 * Backend decision (v3.1):
 * Search stays contract-stable behind `/api/v1/catalog/search`.
 * This implementation uses in-process catalog scoring against the persisted BFF snapshot.
 * Launch can swap internals to Postgres FTS/indexing without changing request or response shape.
 */
import { ok } from "@/lib/bff/http";
import { executeCatalogSearch, parseCatalogSearchQuery } from "@/lib/catalog/search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = parseCatalogSearchQuery(url.searchParams.get("q"));
  const lane = url.searchParams.get("lane");
  const offerState = url.searchParams.get("offer_state");
  const limit = url.searchParams.get("limit");

  const search = await executeCatalogSearch({
    query,
    lane,
    offerState,
    limit
  });

  return ok({ search });
}
