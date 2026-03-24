import { SettingsAccountForm } from "@/features/settings/settings-account-form";
import { SettingsNav } from "@/features/settings/settings-nav";
import { AppShell } from "@/features/shell/app-shell";
import { requireSession } from "@/lib/server/session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "settings",
};

export default async function SettingsAccountPage() {
  const session = await requireSession("/settings/account");

  return (
    <AppShell title="settings" subtitle="account" session={session}>
      <SettingsNav />
      <SettingsAccountForm session={session} />
    </AppShell>
  );
}
