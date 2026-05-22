/**
 * GET /api/v1/catalog/autocomplete?q= — typeahead suggestions across drops,
 * studios, worlds, and hashtags.
 *
 * Sprint 7 — DSC-008. Backed by buildAutocompleteSuggestions; safe to swap to
 * a search index later without changing the response shape.
 */

import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(20, limitRaw)) : undefined;

  const suggestions = await commerceBffService.getSearchAutocomplete(query, limit);

  return ok({ suggestions });
}
