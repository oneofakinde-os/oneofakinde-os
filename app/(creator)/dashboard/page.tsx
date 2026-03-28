import { DashboardScreen } from "@/features/dashboard/dashboard-screen";
import { gateway } from "@/lib/gateway";
import { requireSessionRoles } from "@/lib/server/session";

export default async function DashboardPage() {
  const session = await requireSessionRoles("/dashboard", ["creator"]);

  const [drops, opsAnalyticsPanel, workshopAnalyticsPanel] = await Promise.all([
    gateway.listDrops(session.accountId),
    gateway.getOpsAnalyticsPanel(session.accountId),
    gateway.getWorkshopAnalyticsPanel(session.accountId),
  ]);

  return (
    <DashboardScreen
      session={session}
      drops={drops}
      opsAnalyticsPanel={opsAnalyticsPanel}
      workshopAnalyticsPanel={workshopAnalyticsPanel}
    />
  );
}
