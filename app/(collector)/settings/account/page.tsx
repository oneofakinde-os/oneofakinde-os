import { updateStudioSafetyAction } from "@/app/(collector)/settings/account/actions";
import { SettingsAccountDeletion } from "@/features/settings/settings-account-deletion";
import { SettingsAccountForm } from "@/features/settings/settings-account-form";
import { SettingsBlockMuteList } from "@/features/settings/settings-block-mute-list";
import { SettingsStudioSafety } from "@/features/settings/settings-studio-safety";
import { SettingsNav } from "@/features/settings/settings-nav";
import { AppShell } from "@/features/shell/app-shell";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "settings",
};

export default async function SettingsAccountPage() {
  const session = await requireSession("/settings/account");
  const studio = session.roles.includes("creator")
    ? await gateway.getStudioByHandle(session.handle)
    : null;

  return (
    <AppShell title="settings" subtitle="account" session={session}>
      <SettingsNav />
      <SettingsAccountForm session={session} />
      <SettingsStudioSafety studio={studio} updateAction={updateStudioSafetyAction} />
      <SettingsBlockMuteList />
      <SettingsAccountDeletion />
    </AppShell>
  );
}
