/**
 * PUT /api/v1/studios/:handle/safety
 *
 * Sprint 1 — PRV-005/PRV-006: update studio safety settings including
 * DM restriction, keyword filters, online status visibility, and hide
 * like counts.
 *
 * 403 — caller does not own the studio
 * 404 — studio not found
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { DmRestriction, ExternalLink } from "@/lib/domain/contracts";

type SafetyRouteParams = { handle: string };

const VALID_DM: ReadonlySet<DmRestriction> = new Set(["anyone", "followers_only", "mutual_only", "no_one"]);

export async function PUT(request: Request, context: RouteContext<SafetyRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const params = await context.params;
  const handle = params.handle;
  if (guard.session.handle.toLowerCase() !== handle.toLowerCase()) {
    return forbidden("you can only update your own studio safety settings");
  }

  const body = (await request.json()) as Record<string, unknown>;
  const settings: {
    dmRestriction?: DmRestriction;
    keywordFilters?: string[];
    onlineStatusVisible?: boolean;
    hideLikeCounts?: boolean;
    bannerUrl?: string;
    externalLinks?: ExternalLink[];
  } = {};

  if (typeof body.dmRestriction === "string" && VALID_DM.has(body.dmRestriction as DmRestriction)) {
    settings.dmRestriction = body.dmRestriction as DmRestriction;
  }
  if (Array.isArray(body.keywordFilters)) {
    settings.keywordFilters = body.keywordFilters.filter((kw): kw is string => typeof kw === "string");
  }
  if (typeof body.onlineStatusVisible === "boolean") {
    settings.onlineStatusVisible = body.onlineStatusVisible;
  }
  if (typeof body.hideLikeCounts === "boolean") {
    settings.hideLikeCounts = body.hideLikeCounts;
  }
  if (typeof body.bannerUrl === "string") {
    settings.bannerUrl = body.bannerUrl;
  }
  if (Array.isArray(body.externalLinks)) {
    settings.externalLinks = body.externalLinks.filter(
      (link): link is ExternalLink =>
        typeof link === "object" && link !== null && typeof link.label === "string" && typeof link.url === "string"
    );
  }

  const result = await commerceBffService.updateStudioSafetySettings(guard.session.accountId, settings);
  if (!result) {
    return notFound("studio not found");
  }

  return ok(result);
}
