import { MembershipTiersScreen } from "@/features/membership/membership-tiers-screen";
import { commerceBffService } from "@/lib/bff/service";
import { gateway } from "@/lib/gateway";
import { routes } from "@/lib/routes";
import { requireSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type MembershipPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MembershipPage({ params }: MembershipPageProps) {
  const { id } = await params;

  const session = await requireSession(routes.signIn(routes.worldMembership(id)));
  const world = await gateway.getWorldById(id);

  if (!world) {
    notFound();
  }

  const [isMember, patronIndicator, patronTierConfigs] = await Promise.all([
    commerceBffService.hasActiveMembership(session.accountId, id),
    commerceBffService.getViewerPatronIndicator(session.accountId, world.studioHandle),
    commerceBffService.listWorkshopPatronTierConfigs(session.accountId)
  ]);

  const worldTierConfigs = patronTierConfigs.filter(
    (t) => t.worldId === id || !t.worldId
  );

  return (
    <MembershipTiersScreen
      world={world}
      session={session}
      isMember={isMember}
      isPatron={patronIndicator !== null && patronIndicator.status === "active"}
      patronTierConfigs={worldTierConfigs}
    />
  );
}
