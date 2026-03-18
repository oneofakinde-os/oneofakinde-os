import { routes } from "@/lib/routes";
import { normalizeReturnTo } from "@/lib/session";
import { requireSession } from "@/lib/server/session";
import type { Route } from "next";
import Link from "next/link";

const walletChoices = ["phantom", "walletconnect", "coinbase wallet", "metamask"];

type WalletLinkPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function WalletLinkPage({ searchParams }: WalletLinkPageProps) {
  const resolvedParams = await searchParams;
  const defaultReturnTo = routes.townhall();
  const returnTo = normalizeReturnTo(
    firstParam(resolvedParams.returnTo),
    defaultReturnTo
  );
  const continueHref = returnTo as Route;
  const session = await requireSession(`/auth/wallet-link?returnTo=${encodeURIComponent(returnTo)}`);

  return (
    <main className="identity-page">
      <section className="identity-frame" aria-label="link wallet">
        <header className="identity-head">
          <p className="identity-brand">oneofakinde</p>
          <h1 className="identity-title">link wallet</h1>
          <p className="identity-copy">session owner: @{session.handle}</p>
        </header>

        <section className="wallet-grid" aria-label="wallet providers">
          {walletChoices.map((walletName) => (
            <button key={walletName} type="button" className="identity-chip wallet-choice" disabled>
              {walletName}
            </button>
          ))}
        </section>

        <section className="wallet-qr-card" aria-label="wallet qr pairing">
          <div className="wallet-qr" />
          <div>
            <p className="wallet-qr-label">device pairing</p>
            <p className="wallet-qr-copy">scan or paste code in your wallet app to complete wallet-link.</p>
            <code className="wallet-qr-code">ook://wallet-link/@{session.handle}</code>
          </div>
        </section>

        <div className="identity-foot">
          <Link href={continueHref} className="identity-link">
            continue
          </Link>
          <span>·</span>
          <Link href={routes.townhall()} className="identity-link">
            open townhall
          </Link>
        </div>
      </section>
    </main>
  );
}
