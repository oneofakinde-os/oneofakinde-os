import { SettingsNav } from "@/features/settings/settings-nav";
import { TotpEnrollmentForm } from "@/features/settings/totp-enrollment-form";
import { AppShell } from "@/features/shell/app-shell";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";

const TOTP_STATUS_MESSAGES: Record<string, string> = {
  enroll_failed: "could not start 2fa enrollment. you may already have 2fa active.",
  invalid_code: "please enter a valid 6-digit code.",
  verify_failed: "verification failed. check your authenticator app and try again.",
  verified: "2fa is now active. your account is protected.",
  disable_failed: "could not disable 2fa. no active enrollment found.",
  disabled: "2fa has been disabled."
};

type SecurityPageProps = {
  searchParams: Promise<{ totp_status?: string }>;
};

export default async function SettingsSecurityPage({ searchParams }: SecurityPageProps) {
  const session = await requireSession("/settings/security");
  const params = await searchParams;

  const enrollment = await gateway.getTotpEnrollment(session.accountId);
  const statusMessage = params.totp_status ? (TOTP_STATUS_MESSAGES[params.totp_status] ?? null) : null;

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
          <div>
            <dt>2fa status</dt>
            <dd>{enrollment?.status === "verified" ? "active" : "not enabled"}</dd>
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

      <TotpEnrollmentForm enrollment={enrollment} statusMessage={statusMessage} />

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
