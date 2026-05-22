/**
 * GET /api/v1/townhall/hashtags/[tag] — posts tagged with a hashtag.
 *
 * Sprint 7 — DSC-004 / CONS-028. Visibility-filtered for the viewer.
 */

import { getRequestSession } from "@/lib/bff/auth";
import { getRequiredRouteParam, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type HashtagRouteParams = {
  tag: string;
};

export async function GET(request: Request, context: RouteContext<HashtagRouteParams>) {
  const tag = await getRequiredRouteParam(context, "tag");
  if (!tag) {
    return ok({ tag: "", posts: [] });
  }

  const session = await getRequestSession(request);
  const posts = await commerceBffService.listTownhallPostsByHashtag(
    session?.accountId ?? null,
    tag
  );

  return ok({ tag, posts });
}
