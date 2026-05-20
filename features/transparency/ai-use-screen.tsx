import Link from "next/link";

export function AiUseScreen() {
  return (
    <main id="main-content" className="transparency-page">
      <header className="transparency-header">
        <Link href="/transparency" className="transparency-back">&larr; transparency</Link>
        <h1>how oneofakinde uses ai</h1>
        <p className="transparency-tagline">
          we require creators to disclose their ai use. so we disclose ours.
        </p>
      </header>

      <section className="formula-section">
        <h2>what we use ai for</h2>
        <ul className="formula-blend-list">
          <li>
            <span className="formula-factor">search ranking computation</span>
            <span className="formula-blend-weight">relevance scoring</span>
          </li>
          <li>
            <span className="formula-factor">moderation triage</span>
            <span className="formula-blend-weight">flagging for human review</span>
          </li>
          <li>
            <span className="formula-factor">accessibility</span>
            <span className="formula-blend-weight">caption + alt-text suggestions</span>
          </li>
          <li>
            <span className="formula-factor">translation</span>
            <span className="formula-blend-weight">i18n assistance</span>
          </li>
          <li>
            <span className="formula-factor">anti-piracy</span>
            <span className="formula-blend-weight">content fingerprinting</span>
          </li>
          <li>
            <span className="formula-factor">anti-manipulation</span>
            <span className="formula-blend-weight">bot + fraud detection</span>
          </li>
        </ul>
      </section>

      <section className="formula-section">
        <h2>what we never use ai for</h2>
        <ul className="formula-anti-list">
          <li>editorial decisions &mdash; humans decide what gets pinned, removed, or elevated</li>
          <li>generative content &mdash; the platform does not create art</li>
          <li>personalization &mdash; no ai-driven recommendations or algorithmic feeds</li>
          <li>pricing &mdash; creators set their own prices</li>
          <li>curation &mdash; humans vet creators, not models</li>
        </ul>
      </section>

      <section className="formula-section">
        <h2>creator ai disclosure</h2>
        <p>
          creators are required to disclose ai involvement in their work using a five-level
          scale (0 = fully human through 4 = fully ai-generated). levels 3&ndash;4 are
          structurally separated into ai-native surfaces. this is a permanent commitment &mdash;
          the platform does not pretend ai work is the same as human-authored work.
        </p>
      </section>
    </main>
  );
}
