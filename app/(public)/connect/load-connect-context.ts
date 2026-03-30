import { getOptionalSession } from "@/lib/server/session";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallPost, TownhallPostsFilter } from "@/lib/domain/contracts";

type ConnectViewer = { accountId: string; handle: string };

export async function loadConnectContext() {
  const session = await getOptionalSession();
  const postsSnapshot = await commerceBffService.getTownhallPosts(
    session?.accountId ?? null,
    { filter: "all" }
  );

  // Connect surface shows only posts linked to drops/worlds/studios
  const marketPosts = postsSnapshot.posts.filter(
    (post) => post.linkedObject !== null
  );

  return {
    viewer: session
      ? ({ accountId: session.accountId, handle: session.handle } as ConnectViewer)
      : null,
    posts: marketPosts as TownhallPost[],
    filter: postsSnapshot.filter as TownhallPostsFilter
  };
}
