"use client";

import { useState } from "react";
import type { TotpEnrollment } from "@/lib/domain/contracts";
import { disableTotpAction, enrollTotpAction, verifyTotpAction } from "@/app/(collector)/settings/security/actions";

type TotpEnrollmentFormProps = {
  enrollment: TotpEnrollment | null;
  statusMessage: string | null;
};

export function TotpEnrollmentForm({ enrollment, statusMessage }: TotpEnrollmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already verified — show active state with disable option
  if (enrollment?.status === "verified") {
    return (
      <section className="slice-panel">
        <p className="slice-label">two-factor authentication</p>
        <div className="ops-settings-grid">
          <p className="slice-copy">
            2fa is <strong>active</strong>. your account is protected with TOTP-based
            two-factor authentication.
          </p>
          <dl className="slice-dl">
            <dt>enabled since</dt>
            <dd>{enrollment.verifiedAt ? new Date(enrollment.verifiedAt).toLocaleDateString() : "—"}</dd>
          </dl>
          {statusMessage && <p className="slice-meta">{statusMessage}</p>}
          <form
            action={async () => {
              setIsSubmitting(true);
              try { await disableTotpAction(); } finally { setIsSubmitting(false); }
            }}
          >
            <button
              type="submit"
              className="slice-button ghost"
              disabled={isSubmitting}
            >
              {isSubmitting ? "disabling…" : "disable 2fa"}
            </button>
          </form>
        </div>
      </section>
    );
  }

  // Pending enrollment — show QR URI and verification form
  if (enrollment?.status === "pending") {
    return (
      <section className="slice-panel">
        <p className="slice-label">two-factor authentication</p>
        <div className="ops-settings-grid">
          <p className="slice-copy">
            scan the code below with your authenticator app (google authenticator,
            authy, 1password, etc.), then enter the 6-digit code to verify.
          </p>

          <dl className="slice-dl" data-testid="totp-setup-details">
            <dt>setup uri</dt>
            <dd className="slice-mono" style={{ wordBreak: "break-all", fontSize: "0.75rem" }}>
              {enrollment.totpUri}
            </dd>
          </dl>

          {enrollment.recoveryCodes.length > 0 && (
            <details className="slice-details">
              <summary className="slice-link">recovery codes (save these now)</summary>
              <ul className="slice-list" data-testid="totp-recovery-codes">
                {enrollment.recoveryCodes.map((code) => (
                  <li key={code} className="slice-mono">{code}</li>
                ))}
              </ul>
            </details>
          )}

          {statusMessage && <p className="slice-meta">{statusMessage}</p>}

          <form
            action={async (formData: FormData) => {
              setIsSubmitting(true);
              try { await verifyTotpAction(formData); } finally { setIsSubmitting(false); }
            }}
          >
            <label className="slice-label" htmlFor="totp-code">
              verification code
            </label>
            <input
              id="totp-code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              required
              className="slice-input"
              data-testid="totp-code-input"
            />
            <button
              type="submit"
              className="slice-button"
              disabled={isSubmitting}
              data-testid="totp-verify-button"
            >
              {isSubmitting ? "verifying…" : "verify and activate"}
            </button>
          </form>
        </div>
      </section>
    );
  }

  // No enrollment — show setup button
  return (
    <section className="slice-panel">
      <p className="slice-label">two-factor authentication</p>
      <div className="ops-settings-grid">
        <p className="slice-copy">
          two-factor authentication adds an extra layer of security to your account
          using a time-based one-time password (TOTP).
        </p>
        {statusMessage && <p className="slice-meta">{statusMessage}</p>}
        <form
          action={async () => {
            setIsSubmitting(true);
            try { await enrollTotpAction(); } finally { setIsSubmitting(false); }
          }}
        >
          <button
            type="submit"
            className="slice-button"
            disabled={isSubmitting}
            data-testid="totp-enroll-button"
          >
            {isSubmitting ? "setting up…" : "enable 2fa"}
          </button>
        </form>
      </div>
    </section>
  );
}
