import { badRequest, ok } from "@/lib/bff/http";
import { buildTownhallFeedPayload, type TownhallFeedResponse } from "@/lib/townhall/feed-api";

export async function GET(request: Request) {
  const result = await buildTownhallFeedPayload(request);
  if (!result.ok) {
    return badRequest(result.error);
  }

  return ok<TownhallFeedResponse>(result.townhallFeed);
}
