import { ModerationDashboardScreen } from "@/features/moderation/moderation-dashboard-screen";
import { commerceBffService } from "@/lib/bff/service";
import { requireSession } from "@/lib/server/session";
import { routes } from "@/lib/routes";

export default async function ModerationDashboardPage() {
  const session = await requireSession(routes.signIn(routes.workshopModeration()));

  if (!session.roles.includes("creator")) {
    const { redirect } = await import("next/navigation");
    redirect(routes.workshop());
  }

  const [worldConversationQueue, townhallQueue, liveSessionQueue] = await Promise.all([
    commerceBffService.listWorldConversationModerationQueue(session.accountId),
    commerceBffService.listTownhallModerationQueue(session.accountId),
    commerceBffService.listLiveSessionConversationModerationQueue(session.accountId)
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
