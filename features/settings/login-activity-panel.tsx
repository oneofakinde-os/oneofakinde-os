import type { LoginActivityEntry } from "@/lib/domain/account-security";

type LoginActivityPanelProps = {
  entries: LoginActivityEntry[];
};

function formatTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  const date = new Date(parsed);
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`;
}

export function LoginActivityPanel({ entries }: LoginActivityPanelProps) {
  return (
    <section className="slice-panel" data-testid="login-activity-panel">
      <p className="slice-label">recent login activity</p>
      {entries.length === 0 ? (
        <p className="slice-copy">no login activity recorded yet.</p>
      ) : (
        <ul className="slice-list" aria-label="login activity">
          {entries.map((entry) => (
            <li key={entry.id} className="slice-drop-card" data-testid="login-activity-entry">
              <div className="slice-row">
                <div>
                  <p className="slice-label">
                    {entry.deviceLabel}
                    {entry.suspicious ? (
                      <span className="login-activity-suspicious"> suspicious</span>
                    ) : null}
                  </p>
                  <p className="slice-meta">
                    {entry.success ? "signed in" : "failed sign-in"} ·{" "}
                    {formatTimestamp(entry.timestamp)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
