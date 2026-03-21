import { StudioScreen } from "@/features/studio/studio-screen";
import { commerceBffService } from "@/lib/bff/service";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type StudioPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function StudioCanonicalPage({ params }: StudioPageProps) {
  const { handle } = await params;

  const [session, studio, drops] = await Promise.all([
    getOptionalSession(),
    gateway.getStudioByHandle(handle),
    gateway.listDropsByStudioHandle(handle)
  ]);

  if (!studio) {
    notFound();
  }

  const worlds = (
    await Promise.all(studio.worldIds.map((worldId) => gateway.getWorldById(worldId)))
  ).filter((world): world is NonNullable<typeof world> => Boolean(world));

  const [membershipEntitlements, viewerFollowing, followerCount, viewerPatronIndicator] = await Promise.all([
    session ? gateway.listMembershipEntitlements(session.accountId) : Promise.resolve([]),
    session ? commerceBffService.isFollowingStudio(session.accountId, handle) : Promise.resolve(false),
    commerceBffService.getStudioFollowerCount(handle),
    session ? commerceBffService.getViewerPatronIndicator(session.accountId, handle) : Promise.resolve(null)
  ]);

  const activeStudioMemberships = membershipEntitlements.filter(
    (entitlement) => entitlement.isActive && entitlement.studioHandle === studio.handle
  );
  const memberWorldIds = Array.from(
    new Set(
      activeStudioMemberships
        .map((entitlement) => entitlement.worldId)
        .filter((worldId): worldId is string => Boolean(worldId))
    )
  );

  return (
    <StudioScreen
      session={session}
      studio={studio}
      worlds={worlds}
      drops={drops}
      viewerMembershipIndicator={{
        hasSession: Boolean(session),
        hasStudioMembership:
          activeStudioMemberships.length > 0 ||
          activeStudioMemberships.some((entitlement) => entitlement.worldId === null),
        activeMembershipCount: activeStudioMemberships.length,
        memberWorldIds,
        canCommitPatron: Boolean(session?.roles.includes("collector"))
      }}
      viewerFollowing={viewerFollowing}
      followerCount={followerCount}
      viewerPatronIndicator={viewerPatronIndicator}
    />
  );
}
