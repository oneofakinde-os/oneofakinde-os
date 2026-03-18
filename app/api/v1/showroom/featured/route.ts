import { getRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { buildShowroomFeaturedLane } from "@/lib/townhall/featured-lane";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getRequestSession(request);
  const featured = await buildShowroomFeaturedLane({
    limit: url.searchParams.get("limit"),
    viewerAccountId: session?.accountId ?? null
  });

  return ok({ featured });
}
