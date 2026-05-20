import Link from "next/link";

export function GovernmentRequestsScreen() {
  return (
    <main id="main-content" className="transparency-page">
      <header className="transparency-header">
        <Link href="/transparency" className="transparency-back">&larr; transparency</Link>
        <h1>government requests</h1>
        <p className="transparency-tagline">
          our strongest protection is not having the data to give.
        </p>
      </header>

      <section className="formula-section">
        <h2>data minimization</h2>
        <p>
          oneofakinde collects the minimum personal data required for the platform to
          function. pseudonymous accounts are a first-class option. the less data we
          have, the less any government can demand.
        </p>
      </section>

      <section className="formula-section">
        <h2>tiered compliance</h2>
        <dl className="curation-stages">
          <div className="curation-stage">
            <dt>tier a &mdash; us + peer jurisdictions</dt>
            <dd>
              eu, uk, canada, australia, new zealand, japan, south korea. honored when
              legally sufficient. scope strictly limited. creator notified unless gag-ordered.
            </dd>
          </div>
          <div className="curation-stage">
            <dt>tier b &mdash; mixed-record jurisdictions</dt>
            <dd>
              honored narrowly when criteria align with universally-recognized criminal
              investigation. refused when politically motivated, when the alleged &ldquo;crime&rdquo;
              is speech, journalism, opposition activity, religious expression, or lgbtq
              identity. refused when designed to identify pseudonymous critics.
            </dd>
          </div>
          <div className="curation-stage">
            <dt>tier c &mdash; authoritarian regimes</dt>
            <dd>
              refused. jurisdictions on the public list (criteria-driven: freedom house,
              rsf press freedom index). not based on platform political preference &mdash;
              based on independent assessments.
            </dd>
          </div>
          <div className="curation-stage curation-stage-current">
            <dt>tier d &mdash; sanctioned / non-state actors</dt>
            <dd>refused absolutely. no exceptions.</dd>
          </div>
        </dl>
      </section>

      <section className="formula-section">
        <h2>creator notification</h2>
        <ul className="formula-blend-list">
          <li>
            <span className="formula-factor">default</span>
            <span className="formula-blend-weight">immediate notification before response</span>
          </li>
          <li>
            <span className="formula-factor">gag-ordered</span>
            <span className="formula-blend-weight">delayed until legally permitted, then full disclosure</span>
          </li>
          <li>
            <span className="formula-factor">refused (tier c)</span>
            <span className="formula-blend-weight">aggregate disclosure only, to protect against retaliation</span>
          </li>
        </ul>
      </section>

      <section className="formula-section">
        <h2>annual transparency report</h2>
        <p>
          oneofakinde publishes an annual report with aggregate government requests by
          tier, refusals, and refusal jurisdictions. the platform maintains a legal
          defense reserve for resisting unjust requests through legal process.
        </p>
      </section>
    </main>
  );
}
