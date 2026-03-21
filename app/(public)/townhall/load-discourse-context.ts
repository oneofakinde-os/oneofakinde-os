import { getOptionalSession } from "@/lib/server/session";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallPost, TownhallPostsFilter } from "@/lib/domain/contracts";

type TownhallViewer = { accountId: string; handle: string };

export async function loadTownhallDiscourseContext() {
  const session = await getOptionalSession();
  const postsSnapshot = await commerceBffService.getTownhallPosts(
    session?.accountId ?? null,
    { filter: "all" }
  );
  return {
    viewer: session
      ? ({ accountId: session.accountId, handle: session.handle } as TownhallViewer)
      : null,
    posts: postsSnapshot.posts as TownhallPost[],
    filter: postsSnapshot.filter as TownhallPostsFilter
  };
}
