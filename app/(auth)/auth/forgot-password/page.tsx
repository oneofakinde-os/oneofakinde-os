import { routes } from "@/lib/routes";
import Link from "next/link";
import { forgotPasswordAction } from "./actions";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const resolvedParams = await searchParams;
  const errorCode = firstParam(resolvedParams.error);
  const status = firstParam(resolvedParams.status);
  const sent = status === "sent";

  return (
    <main className="identity-page">
      <section className="identity-frame" aria-label="forgot password">
        <header className="identity-head">
          <p className="identity-brand">oneofakinde</p>
          <h1 className="identity-title">reset your password</h1>
          <p className="identity-copy">
            {sent
              ? "check your inbox. we sent a password reset link to your email."
              : "enter the email address you used to sign up and we\u2019ll send you a reset link."}
          </p>
        </header>

        {!sent ? (
          <form action={forgotPasswordAction} className="identity-form">
            <label className="identity-field">
              <span className="identity-label">your email</span>
              <input
                className="identity-input"
                type="email"
                name="email"
                placeholder="collector@oneofakinde.com"
                required
              />
            </label>

            {errorCode === "invalid_email" ? (
              <p className="identity-error">enter a valid email to continue.</p>
            ) : null}
            {errorCode === "send_failed" ? (
              <p className="identity-error">could not send reset email. try again in a moment.</p>
            ) : null}
            {errorCode === "not_available" ? (
              <p className="identity-error">password reset is not available in this environment.</p>
            ) : null}

            <button type="submit" className="identity-cta">
              send reset link
            </button>
          </form>
        ) : (
          <div className="identity-form">
            <p className="identity-copy">
              didn&apos;t receive it? check your spam folder or try again.
            </p>
            <Link href="/auth/forgot-password" className="identity-cta-link">
              resend
            </Link>
          </div>
        )}

        <footer className="identity-foot">
          <Link href={routes.signIn()} className="identity-link">
            back to sign in
          </Link>
        </footer>
      </section>
    </main>
  );
}
