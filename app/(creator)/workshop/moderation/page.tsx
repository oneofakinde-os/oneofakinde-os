import { ModerationDashboardScreen } from "@/features/moderation/moderation-dashboard-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import { routes } from "@/lib/routes";

export default async function ModerationDashboardPage() {
  const session = await requireSession(routes.signIn(routes.workshopModeration()));

  if (!session.roles.includes("creator")) {
    const { redirect } = await import("next/navigation");
    redirect(routes.workshop());
  }

  const [worldConversationQueue, townhallQueue, liveSessionQueue] = await Promise.all([
    gateway.listWorldConversationModerationQueue(session.accountId),
    gateway.listTownhallModerationQueue(session.accountId),
    gateway.listLiveSessionConversationModerationQueue(session.accountId)
  ]);

  return (
    <ModerationDashboardScreen
      session={session}
      initialWorldConversationQueue={worldConversationQueue}
      initialTownhallQueue={townhallQueue}
      initialLiveSessionQueue={liveSessionQueue}
    />
  );
}
