import { FollowingFeedScreen } from "@/features/following/following-feed-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";

export default async function FollowingPage() {
  const session = await requireSession("/following");
  const [drops, worlds, followedHandles] = await Promise.all([
    gateway.listDrops(session.accountId),
    gateway.listWorlds(),
    gateway.getViewerFollowedStudioHandles(session.accountId)
  ]);

  return (
    <FollowingFeedScreen
      session={session}
      followedHandles={followedHandles}
      drops={drops}
      worlds={worlds}
    />
  );
}
