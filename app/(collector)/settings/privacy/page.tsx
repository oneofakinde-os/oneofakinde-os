import { PrivacySettingsForm } from "@/features/settings/privacy-settings-form";
import { SettingsNav } from "@/features/settings/settings-nav";
import { AppShell } from "@/features/shell/app-shell";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";

export default async function SettingsPrivacyPage() {
  const session = await requireSession("/settings/privacy");

  const settings = await gateway.getPrivacySettings(session.accountId);
  const initial = settings ?? {
    accountLocked: false,
    onlineStatusVisible: true,
    dmRestriction: "anyone" as const
  };

  return (
    <AppShell title="settings" subtitle="privacy" session={session}>
      <SettingsNav />
      <PrivacySettingsForm initial={initial} />
    </AppShell>
  );
}
