import Link from "next/link";

export function CurationPostureScreen() {
  return (
    <main id="main-content" className="transparency-page">
      <header className="transparency-header">
        <Link href="/transparency" className="transparency-back">&larr; transparency</Link>
        <h1>curation posture</h1>
      </header>

      <section className="formula-section">
        <h2>oneofakinde is curated</h2>
        <p>
          right now, every creator on oneofakinde is personally vetted. this is stage 1.
          we will not silently pivot from curated to open. when the curation model changes,
          we will tell you before it happens, explain why, and give you time to decide
          whether the new model still works for you.
        </p>
      </section>

      <section className="formula-section">
        <h2>the stages</h2>
        <dl className="curation-stages">
          <div className="curation-stage curation-stage-current">
            <dt>stage 1 &mdash; founder-curated (now)</dt>
            <dd>
              every creator is personally vetted. the cohort builds cultural reference.
              quality is maintained through direct human judgment, not metrics.
            </dd>
          </div>
          <div className="curation-stage">
            <dt>stage 2 &mdash; application + invitation</dt>
            <dd>
              existing creators can invite others (limited slots). applications open
              with curator review. the quality bar is maintained through human review,
              not automated gates.
            </dd>
          </div>
          <div className="curation-stage">
            <dt>stage 3 &mdash; open with reputation gates</dt>
            <dd>
              anyone can join. full creator features (Featured Lane access, advanced
              patron tiers) unlock through demonstrated reputation: collects from real
              accounts, sustained patron base, no rule violations.
            </dd>
          </div>
        </dl>
      </section>

      <section className="formula-section">
        <h2>what stays true at every stage</h2>
        <ul className="formula-anti-list">
          <li>the platform retains the right to remove creators with documented basis</li>
          <li>curation changes are announced publicly before taking effect</li>
          <li>the current cohort will never wake up in a different environment without notice</li>
        </ul>
      </section>
    </main>
  );
}
