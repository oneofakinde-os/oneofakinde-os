import { SocialAuthButtons } from "@/features/auth/social-auth-buttons";
import { normalizeReturnTo } from "@/lib/session";
import { routes } from "@/lib/routes";
import { buildDefaultEntryFlow, extractFinalReturnTo } from "@/lib/system-flow";
import type { Metadata } from "next";
import Link from "next/link";
import { signInAction } from "./actions";

export const metadata: Metadata = {
  title: "sign in",
};

type SignInPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
    error?: string | string[];
    status?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedParams = await searchParams;
  const defaultReturnTo = buildDefaultEntryFlow().finalReturnTo;
  const returnTo = normalizeReturnTo(firstParam(resolvedParams.returnTo), defaultReturnTo);
  const walletConnectHref = returnTo.startsWith("/auth/wallet-connect")
    ? (returnTo as ReturnType<typeof routes.walletConnect>)
    : routes.walletConnect(returnTo);
  const signUpReturnTo = extractFinalReturnTo(returnTo);
  const errorCode = firstParam(resolvedParams.error);
  const status = firstParam(resolvedParams.status);
  const hasInvalidEmail = errorCode === "invalid_email";
  const hasInvalidCredentials = errorCode === "invalid_credentials";
  const hasRoleError = errorCode === "role_required";
  const hasAuthServiceError = errorCode === "auth_service_unavailable";
  const hasRateLimited = errorCode === "rate_limited";
  const hasPasswordReset = status === "password_reset";

  return (
    <main className="identity-page">
      <section className="identity-frame" aria-label="sign in">
        <header className="identity-head">
          <p className="identity-brand">oneofakinde</p>
          <h1 className="identity-title">sign in</h1>
          <p className="identity-copy">sign in and continue directly to townhall. wallet linking stays optional.</p>
        </header>

        <form action={signInAction} className="identity-form">
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="identity-field">
            <span className="identity-label">what&apos;s your email?</span>
            <input
              className="identity-input"
              type="email"
              name="email"
              placeholder="collector@oneofakinde.com"
              defaultValue="collector@oneofakinde.com"
              required
            />
          </label>

          <label className="identity-field">
            <span className="identity-label">enter your password</span>
            <input
              className="identity-input"
              type="password"
              name="password"
              placeholder="••••••••"
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

          <SocialAuthButtons mode="sign-in" returnTo={returnTo} />

          {hasPasswordReset ? (
            <p className="identity-success">password updated successfully. sign in with your new password.</p>
          ) : null}
          {hasInvalidEmail ? <p className="identity-error">enter a valid email to continue.</p> : null}
          {hasInvalidCredentials ? (
            <p className="identity-error">email or password is incorrect. try again.</p>
          ) : null}
          {hasRoleError ? (
            <p className="identity-error">this route requires creator access. switch mode and continue.</p>
          ) : null}
          {hasAuthServiceError ? (
            <p className="identity-error">sign-in is temporarily unavailable. try again in a moment.</p>
          ) : null}
          {hasRateLimited ? (
            <p className="identity-error">too many sign-in attempts. please wait a minute and try again.</p>
          ) : null}

          <button type="submit" className="identity-cta">
            let&apos;s go
          </button>
        </form>

        <footer className="identity-foot">
          <Link href={routes.forgotPassword()} className="identity-link">
            forgot password?
          </Link>
          <span>·</span>
          <Link href={walletConnectHref} className="identity-link">
            link wallet (optional)
          </Link>
          <span>·</span>
          <Link href={routes.signUp(signUpReturnTo)} className="identity-link">
            create account
          </Link>
        </footer>
      </section>
    </main>
  );
}
