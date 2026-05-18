import type { ScoreFormulaSnapshot } from "@/lib/ranking/score-formula";
import Link from "next/link";

type Props = {
  formula: ScoreFormulaSnapshot;
};

function WeightTable({ label, weights }: { label: string; weights: Record<string, number> }) {
  const sorted = Object.entries(weights).sort(([, a], [, b]) => b - a);
  return (
    <section className="formula-section">
      <h2>{label}</h2>
      <table className="formula-table">
        <thead>
          <tr>
            <th>signal</th>
            <th>weight</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(([signal, weight]) => (
            <tr key={signal}>
              <td>{signal.replace(/([A-Z])/g, " $1").toLowerCase()}</td>
              <td className="formula-weight">{weight}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function BlendTable({ blend }: { blend: ScoreFormulaSnapshot["laneBlend"] }) {
  const lanes = Object.entries(blend) as [string, Record<string, number>][];
  return (
    <section className="formula-section">
      <h2>lane blending</h2>
      <p className="formula-explanation">
        each discovery lane weights the normalized signals differently.
        the townhall default is &ldquo;rising&rdquo; &mdash; recency-heavy so new work surfaces fast.
      </p>
      {lanes.map(([lane, weights]) => (
        <div key={lane} className="formula-lane">
          <h3>{lane.replace(/_/g, " ")}</h3>
          <ul className="formula-blend-list">
            {Object.entries(weights).map(([factor, weight]) => (
              <li key={factor}>
                <span className="formula-factor">{factor}</span>
                <span className="formula-blend-weight">{(weight * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function ScoreFormulaScreen({ formula }: Props) {
  return (
    <main id="main-content" className="transparency-page">
      <header className="transparency-header">
        <Link href="/transparency" className="transparency-back">&larr; transparency</Link>
        <h1>consumption score &mdash; the formula</h1>
        <p className="transparency-version">v{formula.version}</p>
      </header>

      <section className="formula-section">
        <h2>what it is</h2>
        <p>
          the consumption score is the number you see on every drop card. it measures
          accumulated attention and conviction &mdash; how many people watched, collected,
          saved, shared, liked, and commented on a drop. it is backward-looking by design:
          it tells you what has happened, not what will happen.
        </p>
        <p>
          the score is one of six discovery signals on oneofakinde. the other five are
          editorial pins, followed-creator activity, world membership, curator lists,
          and provenance trails. no hidden seventh signal. no algorithm. no personalization.
          same townhall for everyone.
        </p>
      </section>

      <section className="formula-section">
        <h2>what it is not</h2>
        <ul className="formula-anti-list">
          {formula.antiPatterns.map((pattern) => (
            <li key={pattern}>{pattern.replace(/-/g, " ")}</li>
          ))}
        </ul>
      </section>

      <WeightTable label="engagement weights" weights={formula.engagementWeights} />
      <WeightTable label="telemetry weights" weights={formula.telemetryWeights} />
      <BlendTable blend={formula.laneBlend} />

      <section className="formula-section">
        <h2>recency decay</h2>
        <p>
          recency uses exponential decay so newer drops surface faster. each lane has its own half-life:
        </p>
        <ul className="formula-blend-list">
          {Object.entries(formula.recencyHalfLifeDays).map(([lane, days]) => (
            <li key={lane}>
              <span className="formula-factor">{lane.replace(/_/g, " ")}</span>
              <span className="formula-blend-weight">{days} days</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="formula-section">
        <h2>tie-breaker</h2>
        <p>
          when two drops have the same score, the newer one ranks first.
        </p>
      </section>

      <section className="formula-section">
        <h2>machine-readable</h2>
        <p>
          the current formula is available as JSON at{" "}
          <a href="/api/v1/transparency/score" className="formula-link">
            /api/v1/transparency/score
          </a>
          . it updates whenever the weights change.
        </p>
      </section>
    </main>
  );
}
