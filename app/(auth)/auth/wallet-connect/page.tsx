import { routes } from "@/lib/routes";
import { normalizeReturnTo } from "@/lib/session";
import { getOptionalSession } from "@/lib/server/session";
import type { Route } from "next";
import Link from "next/link";

const walletChoices = ["phantom", "walletconnect", "coinbase wallet", "metamask"];

type WalletConnectPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function WalletConnectPage({ searchParams }: WalletConnectPageProps) {
  const [resolvedParams, session] = await Promise.all([searchParams, getOptionalSession()]);
  const defaultReturnTo = routes.profileSetup(routes.showroom());
  const returnTo = normalizeReturnTo(
    firstParam(resolvedParams.returnTo),
    defaultReturnTo
  );
  const continueHref = returnTo as Route;
  const walletLinkHref = session
    ? routes.walletLink(returnTo)
    : routes.signIn(routes.walletLink(returnTo));

  return (
    <main className="identity-page">
      <section className="identity-frame" aria-label="connect wallet">
        <header className="identity-head">
          <p className="identity-brand">oneofakinde</p>
          <h1 className="identity-title">connect wallet</h1>
          <p className="identity-copy">choose a wallet now or scan to link on another device, then continue onboarding.</p>
        </header>

        <section className="wallet-grid" aria-label="wallet providers">
          {walletChoices.map((walletName) => (
            <button key={walletName} type="button" className="identity-chip wallet-choice" disabled>
              {walletName}
            </button>
          ))}
        </section>

        <section className="wallet-qr-card" aria-label="wallet qr link">
          <div className="wallet-qr" />
          <div>
            <p className="wallet-qr-label">qr link</p>
            <p className="wallet-qr-copy">scan with your mobile wallet app to link this account.</p>
            <code className="wallet-qr-code">ook://wallet-link/session</code>
          </div>
        </section>

        <div className="slice-button-row">
          <Link href={walletLinkHref} className="identity-cta identity-cta-link">
            continue to wallet-link
          </Link>
          <Link href={continueHref} className="slice-button alt">
            continue without wallet
          </Link>
        </div>

        <footer className="identity-foot">
          <Link href={routes.signIn(returnTo)} className="identity-link">
            continue with email
          </Link>
          <span>·</span>
          <Link href={routes.signUp(returnTo)} className="identity-link">
            create account
          </Link>
        </footer>
      </section>
    </main>
  );
}
