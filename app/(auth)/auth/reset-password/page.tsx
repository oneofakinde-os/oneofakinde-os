import { routes } from "@/lib/routes";
import Link from "next/link";
import { resetPasswordAction } from "./actions";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedParams = await searchParams;
  const errorCode = firstParam(resolvedParams.error);

  return (
    <main className="identity-page">
      <section className="identity-frame" aria-label="reset password">
        <header className="identity-head">
          <p className="identity-brand">oneofakinde</p>
          <h1 className="identity-title">choose a new password</h1>
          <p className="identity-copy">
            enter your new password below. minimum 8 characters.
          </p>
        </header>

        <form action={resetPasswordAction} className="identity-form">
          <label className="identity-field">
            <span className="identity-label">new password</span>
            <input
              className="identity-input"
              type="password"
              name="password"
              placeholder="••••••••"
              minLength={8}
              required
            />
          </label>

          <label className="identity-field">
            <span className="identity-label">confirm password</span>
            <input
              className="identity-input"
              type="password"
              name="confirm"
              placeholder="••••••••"
              minLength={8}
              required
            />
          </label>

          {errorCode === "too_short" ? (
            <p className="identity-error">password must be at least 8 characters.</p>
          ) : null}
          {errorCode === "mismatch" ? (
            <p className="identity-error">passwords don&apos;t match. try again.</p>
          ) : null}
          {errorCode === "update_failed" ? (
            <p className="identity-error">could not update password. the link may have expired — request a new one.</p>
          ) : null}
          {errorCode === "not_available" ? (
            <p className="identity-error">password reset is not available in this environment.</p>
          ) : null}

          <button type="submit" className="identity-cta">
            update password
          </button>
        </form>

        <footer className="identity-foot">
          <Link href={routes.signIn()} className="identity-link">
            back to sign in
          </Link>
        </footer>
      </section>
    </main>
  );
}
