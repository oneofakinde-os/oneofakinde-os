import { SettingsNav } from "@/features/settings/settings-nav";
import { SettingsNotificationsForm } from "@/features/settings/settings-notifications-form";
import { AppShell } from "@/features/shell/app-shell";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import type { NotificationPreferences } from "@/lib/domain/contracts";

const FALLBACK_PREFERENCES: Omit<NotificationPreferences, "accountId"> = {
  channels: { in_app: true, email: false, push: false },
  mutedTypes: [],
  digestEnabled: true
};

export default async function SettingsNotificationsPage() {
  const session = await requireSession("/settings/notifications");

  // Wave 2.1 — server-fetch the preferences row so the form hydrates with
  // the user's actual saved choices instead of generic defaults. Falls back
  // to the platform defaults if the gateway returns null (e.g. legacy
  // account row, mock adapter quirks).
  const fetched = await gateway.getNotificationPreferences(session.accountId);
  const initialPreferences: NotificationPreferences =
    fetched ?? { accountId: session.accountId, ...FALLBACK_PREFERENCES };

  return (
    <AppShell title="settings" subtitle="notifications" session={session}>
      <SettingsNav />
      <SettingsNotificationsForm initialPreferences={initialPreferences} />
    </AppShell>
  );
}
