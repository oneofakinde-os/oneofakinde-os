import { SettingsNav } from "@/features/settings/settings-nav";
import { SettingsNotificationsForm } from "@/features/settings/settings-notifications-form";
import { AppShell } from "@/features/shell/app-shell";
import { requireSession } from "@/lib/server/session";

export default async function SettingsNotificationsPage() {
  const session = await requireSession("/settings/notifications");

  return (
    <AppShell title="settings" subtitle="notifications" session={session}>
      <SettingsNav />
      <SettingsNotificationsForm />
    </AppShell>
  );
}
