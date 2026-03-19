/**
 * Backend decision (v3.1):
 * Search stays contract-stable behind `/api/v1/catalog/search`.
 * This implementation uses in-process catalog scoring against the persisted BFF snapshot.
 * Launch can swap internals to Postgres FTS/indexing without changing request or response shape.
 */
import { getRequestSession } from "@/lib/bff/auth";
import type { CatalogSearchResponse } from "@/lib/bff/contracts";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import { executeCatalogSearch, parseCatalogSearchQuery } from "@/lib/catalog/search";
import type { Drop } from "@/lib/domain/contracts";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getRequestSession(request);
  const query = parseCatalogSearchQuery(url.searchParams.get("q"));
  const lane = url.searchParams.get("lane");
  const offerState = url.searchParams.get("offer_state");
  const limit = url.searchParams.get("limit");

  const search = await executeCatalogSearch({
    query,
    lane,
    offerState,
    limit,
    viewerAccountId: session?.accountId ?? null
  });

  const drops = await commerceBffService.listDrops(session?.accountId ?? null);
  const dropById = new Map(drops.map((drop) => [drop.id, drop]));
  const results = search.drops
    .map((drop) => dropById.get(drop.id))
    .filter((drop): drop is Drop => Boolean(drop));

  return ok<CatalogSearchResponse>({
    results,
    total: search.totals.drops
  });
}
