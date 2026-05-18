import Link from "next/link";

export function ContentPolicyScreen() {
  return (
    <main id="main-content" className="transparency-page">
      <header className="transparency-header">
        <Link href="/transparency" className="transparency-back">&larr; transparency</Link>
        <h1>content policy</h1>
        <p className="transparency-tagline">
          what stays, what goes, and why. published so you know the rules before you publish.
        </p>
      </header>

      <section className="formula-section">
        <h2>layer 1 &mdash; hard exclusions</h2>
        <p>removed without debate. no exceptions.</p>
        <ul className="formula-anti-list">
          <li>child sexual abuse material (csam)</li>
          <li>direct incitement to imminent violence</li>
          <li>content subject to a defamation finding</li>
          <li>intellectual property violation without viable defense</li>
          <li>sanctions violations</li>
        </ul>
      </section>

      <section className="formula-section">
        <h2>layer 2 &mdash; aesthetic exclusions</h2>
        <p>
          oneofakinde has editorial identity. like a museum or magazine, we have a sensibility
          and use it transparently. layer 2 removals are documented with reasoning and
          are appealable.
        </p>
        <ul className="formula-anti-list">
          <li>content whose primary purpose is dehumanization of any group</li>
          <li>content glorifying real-world violence against real people</li>
          <li>coordinated harassment campaigns dressed as content</li>
          <li>work whose creative function is essentially harming a specific person</li>
          <li>synthetic media of real people without disclosure</li>
        </ul>
      </section>

      <section className="formula-section">
        <h2>layer 3 &mdash; allowed with sensitivity rating</h2>
        <p>
          most controversial content lives here. political art, religious critique,
          uncomfortable comedy, satire, historical documentation of atrocity,
          fiction with difficult characters. allowed regardless of viewpoint.
        </p>
        <p>the line is about function, not position:</p>
        <ul className="formula-blend-list">
          <li>
            <span className="formula-factor">dehumanization removed</span>
            <span className="formula-blend-weight">regardless of target</span>
          </li>
          <li>
            <span className="formula-factor">glorification of atrocity removed</span>
            <span className="formula-blend-weight">regardless of perpetrator</span>
          </li>
          <li>
            <span className="formula-factor">comedy, satire, political art</span>
            <span className="formula-blend-weight">remains regardless of targets</span>
          </li>
        </ul>
      </section>

      <section className="formula-section">
        <h2>layer 4 &mdash; you control your experience</h2>
        <p>
          mute creators, hide worlds, set sensitivity filters, block users, curate your
          own discovery. the platform gives you tools to shape what you see without
          removing what others can see.
        </p>
      </section>

      <section className="formula-section">
        <h2>political content</h2>
        <p>
          political art is allowed regardless of which political position it expresses.
          same rules for every direction.
        </p>
        <p>
          the platform never endorses candidates, parties, ballot measures, or political
          positions. editorial pins cannot elevate politically-charged content. ops
          communications maintain neutrality.
        </p>
      </section>

      <section className="formula-section">
        <h2>criticism of oneofakinde</h2>
        <p>
          criticism of the platform, the founder, or the company is explicitly protected speech.
          non-negotiable. the moment a platform protects itself from criticism, it loses
          moral standing for any other editorial decision.
        </p>
      </section>

      <section className="formula-section">
        <h2>appeals</h2>
        <p>
          every moderation decision generates written reasoning you can read.
          layer 2 removals are appealable through the three-tier appeal framework:
          second reviewer, ops-lead escalation, and for high-stakes decisions,
          binding external arbitration by a neutral panel.
        </p>
      </section>
    </main>
  );
}
