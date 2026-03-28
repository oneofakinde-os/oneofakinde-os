import { SettingsNav } from "@/features/settings/settings-nav";
import { AppShell } from "@/features/shell/app-shell";
import { requireSession } from "@/lib/server/session";

export default async function SettingsSecurityPage() {
  const session = await requireSession("/settings/security");

  return (
    <AppShell title="settings" subtitle="security" session={session}>
      <SettingsNav />
      <section className="slice-panel">
        <p className="slice-label">security overview</p>
        <dl className="slice-list">
          <div>
            <dt>signed in as</dt>
            <dd>@{session.handle} ({session.email})</dd>
          </div>
          <div>
            <dt>account roles</dt>
            <dd>{session.roles.join(", ")}</dd>
          </div>
          <div>
            <dt>active sessions</dt>
            <dd>1 device (current)</dd>
          </div>
        </dl>
      </section>

      <section className="slice-panel">
        <p className="slice-label">password</p>
        <div className="ops-settings-grid">
          <p className="slice-copy">
            password management is handled through your authentication provider.
            use the link below to update your credentials.
          </p>
          <a href="/auth/reset-password" className="slice-button ghost">
            change password
          </a>
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">two-factor authentication</p>
        <div className="ops-settings-grid">
          <p className="slice-copy">
            two-factor authentication adds an extra layer of security to your account.
            this feature will be available soon.
          </p>
          <button type="button" className="slice-button ghost" disabled>
            enable 2fa (coming soon)
          </button>
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">active sessions</p>
        <div className="ops-settings-grid">
          <p className="slice-copy">
            you are currently signed in on this device. session management
            across multiple devices will be available in a future update.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
