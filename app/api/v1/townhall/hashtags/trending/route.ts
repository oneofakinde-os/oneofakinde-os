/**
 * GET /api/v1/townhall/hashtags/trending — velocity-ranked trending hashtags.
 *
 * Sprint 7 — DSC-013 / CONS-029. Optional ?window_hours= and ?limit=.
 */

import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const windowHours = Number.parseInt(url.searchParams.get("window_hours") ?? "", 10);
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);

  const trends = await commerceBffService.getTrendingHashtags(
    Number.isFinite(windowHours) ? windowHours : undefined,
    Number.isFinite(limit) ? limit : undefined
  );

  return ok({ trends });
}
