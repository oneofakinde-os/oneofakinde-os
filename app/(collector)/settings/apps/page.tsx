import { SettingsNav } from "@/features/settings/settings-nav";
import { AppShell } from "@/features/shell/app-shell";
import { requireSession } from "@/lib/server/session";

export default async function SettingsAppsPage() {
  const session = await requireSession("/settings/apps");

  return (
    <AppShell title="settings" subtitle="connected apps" session={session}>
      <SettingsNav />
      <section className="slice-panel">
        <p className="slice-label">wallet connections</p>
        <div className="ops-settings-grid">
          <p className="slice-copy">
            no wallets connected. connect a wallet to enable on-chain features
            like certificate verification and resale listings.
          </p>
          <button type="button" className="slice-button ghost" disabled>
            connect wallet (coming soon)
          </button>
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">third-party integrations</p>
        <div className="ops-settings-grid">
          <p className="slice-copy">
            manage apps and services connected to your oneofakinde account.
            no integrations are active at this time.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
