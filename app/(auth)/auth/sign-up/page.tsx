import { SocialAuthButtons } from "@/features/auth/social-auth-buttons";
import { normalizeReturnTo } from "@/lib/session";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { signUpAction } from "./actions";

type SignUpPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
    error?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolvedParams = await searchParams;
  const returnTo = normalizeReturnTo(firstParam(resolvedParams.returnTo), "/townhall");
  const walletConnectHref = routes.walletConnect(returnTo);
  const errorCode = firstParam(resolvedParams.error);
  const hasInvalidEmail = errorCode === "invalid_email";
  const hasEmailTaken = errorCode === "email_taken";
  const hasSignupFailed = errorCode === "signup_failed";
  const hasAuthServiceError = errorCode === "auth_service_unavailable";

  return (
    <main className="identity-page">
      <section className="identity-frame" aria-label="create account">
        <header className="identity-head">
          <p className="identity-brand">oneofakinde</p>
          <h1 className="identity-title">create account</h1>
          <p className="identity-copy">start with email and continue directly into townhall. wallet linking is optional.</p>
        </header>

        <form action={signUpAction} className="identity-form">
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="identity-field">
            <span className="identity-label">what&apos;s your email?</span>
            <input
              className="identity-input"
              type="email"
              name="email"
              placeholder="new-account@oneofakinde.com"
              required
            />
          </label>

          <label className="identity-field">
            <span className="identity-label">choose a password</span>
            <input
              className="identity-input"
              type="password"
              name="password"
              placeholder="at least 8 characters"
              minLength={8}
              required
            />
          </label>

          <fieldset className="identity-segment" aria-label="account role">
            <legend>choose mode</legend>
            <label>
              <input type="radio" name="role" value="collector" defaultChecked />
              collector
            </label>
            <label>
              <input type="radio" name="role" value="creator" />
              creator
            </label>
          </fieldset>

          <SocialAuthButtons mode="sign-up" returnTo={returnTo} />

          {hasInvalidEmail ? <p className="identity-error">enter a valid email to continue.</p> : null}
          {hasEmailTaken ? (
            <p className="identity-error">this email is already registered. try signing in instead.</p>
          ) : null}
          {hasSignupFailed ? (
            <p className="identity-error">account creation failed. check your password (min 8 characters) and try again.</p>
          ) : null}
          {hasAuthServiceError ? (
            <p className="identity-error">account creation is temporarily unavailable. try again in a moment.</p>
          ) : null}

          <button type="submit" className="identity-cta">
            let&apos;s go
          </button>
        </form>

        <footer className="identity-foot">
          <Link href={walletConnectHref} className="identity-link">
            link wallet (optional)
          </Link>
          <span>·</span>
          <Link href={routes.signIn(returnTo)} className="identity-link">
            sign in
          </Link>
        </footer>
      </section>
    </main>
  );
}
