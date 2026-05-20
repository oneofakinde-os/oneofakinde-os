import Link from "next/link";

const DOCUMENTS = [
  {
    href: "/transparency/score",
    title: "consumption score formula",
    description: "the exact weights and math behind every drop's score. no hidden signals.",
  },
  {
    href: "/transparency/curation",
    title: "curation posture",
    description: "how creators get on the platform today, and how that will change over time.",
  },
  {
    href: "/transparency/wind-down",
    title: "wind-down protocol",
    description: "what happens if oneofakinde shuts down. your money, your work, your ownership — protected.",
  },
  {
    href: "/transparency/content-policy",
    title: "content policy",
    description: "what stays, what goes, and why. political art allowed. platform criticism protected.",
  },
  {
    href: "/transparency/ai-use",
    title: "how we use ai",
    description: "what the platform uses ai for — and what it never will. we disclose because we require creators to.",
  },
  {
    href: "/transparency/government-requests",
    title: "government requests",
    description: "tiered compliance, mandatory creator notification, and a public refusal list for authoritarian regimes.",
  },
] as const;

export function TransparencyIndexScreen() {
  return (
    <main id="main-content" className="transparency-page">
      <header className="transparency-header">
        <h1>transparency</h1>
        <p className="transparency-tagline">
          oneofakinde publishes the rules it operates by. not because the law requires it &mdash;
          because you deserve to know how the platform that hosts your work actually works.
        </p>
      </header>

      <nav className="transparency-nav" aria-label="transparency documents">
        {DOCUMENTS.map((doc) => (
          <Link key={doc.href} href={doc.href} className="transparency-card">
            <h2>{doc.title}</h2>
            <p>{doc.description}</p>
          </Link>
        ))}
      </nav>
    </main>
  );
}
