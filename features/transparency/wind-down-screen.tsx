import Link from "next/link";

export function WindDownScreen() {
  return (
    <main id="main-content" className="transparency-page">
      <header className="transparency-header">
        <Link href="/transparency" className="transparency-back">&larr; transparency</Link>
        <h1>wind-down protocol</h1>
        <p className="transparency-tagline">
          what happens if oneofakinde shuts down. written in advance, not after the fact.
        </p>
      </header>

      <section className="formula-section">
        <h2>the commitment</h2>
        <p>
          if oneofakinde ever shuts down &mdash; voluntarily or otherwise &mdash; your work,
          your money, and your ownership records are protected. this protocol is published
          now, before any crisis, so you can hold us to it.
        </p>
      </section>

      <section className="formula-section">
        <h2>your money is segregated</h2>
        <p>
          collector payments sit in segregated escrow accounts. they are never commingled with
          operating funds. in bankruptcy, these accounts are protected &mdash; they are not
          part of the estate that creditors can claim.
        </p>
        <p>
          creator earnings owed are tracked on an immutable ledger. in insolvency, ledger
          debt to creators takes priority over equity-holder claims.
        </p>
      </section>

      <section className="formula-section">
        <h2>your ownership survives</h2>
        <p>
          certificates are cryptographically signed and verifiable independent of the
          platform via an institutional mirror. if the platform disappears, your proof
          of ownership does not.
        </p>
      </section>

      <section className="formula-section">
        <h2>the shutdown sequence</h2>
        <dl className="curation-stages">
          <div className="curation-stage">
            <dt>day 1 &mdash; announcement</dt>
            <dd>public announcement. every user notified. date, process, and reasons published.</dd>
          </div>
          <div className="curation-stage">
            <dt>days 1&ndash;60 &mdash; export window</dt>
            <dd>
              every user can export their full data: signed receipts, certificates,
              ownership history, analytics, patron lists, and drop files.
            </dd>
          </div>
          <div className="curation-stage">
            <dt>day 60 &mdash; new collects stop</dt>
            <dd>
              no new collects accepted. existing entitlements honored. patron commitments
              charge their final cycle or cancel with prorated refund.
            </dd>
          </div>
          <div className="curation-stage">
            <dt>day 90 &mdash; final settlement</dt>
            <dd>
              all accumulated creator payouts processed, even at financial cost to the platform.
              pro-rata residual fund distribution to creators with unfulfilled payouts.
            </dd>
          </div>
          <div className="curation-stage">
            <dt>after shutdown</dt>
            <dd>
              worlds and drops become read-only via the institutional mirror,
              preserving the cultural record.
            </dd>
          </div>
        </dl>
      </section>

      <section className="formula-section">
        <h2>if someone acquires oneofakinde</h2>
        <p>
          any acquirer must honor existing commission structures, patron commitments,
          certificate validity, and constitutional commitments for at least 12&ndash;24
          months. material changes require 90-day advance notice to all users.
        </p>
      </section>

      <section className="formula-section">
        <h2>annual verification</h2>
        <p>
          every year, oneofakinde publicly attests that segregated accounts are intact
          and the ledger reconciles. this document itself is a permanent public commitment &mdash;
          material changes require advance notice to users.
        </p>
      </section>
    </main>
  );
}
