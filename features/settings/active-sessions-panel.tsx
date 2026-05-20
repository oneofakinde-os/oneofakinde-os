"use client";

import type { ActiveSession } from "@/lib/domain/account-security";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ActiveSessionsPanelProps = {
  sessions: ActiveSession[];
};

function formatTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  const date = new Date(parsed);
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`;
}

function relativeAge(value: string): string {
  const ms = Date.now() - Date.parse(value);
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export function ActiveSessionsPanel({ sessions }: ActiveSessionsPanelProps) {
  const router = useRouter();
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleRevoke(sessionId: string) {
    setRevoking(sessionId);
    try {
      const res = await fetch("/api/v1/session/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setRevoking(null);
    }
  }

  return (
    <section className="slice-panel" data-testid="active-sessions-panel">
      <p className="slice-label">active sessions</p>
      {sessions.length === 0 ? (
        <p className="slice-copy">no active sessions found.</p>
      ) : (
        <ul className="slice-list" aria-label="active sessions">
          {sessions.map((session) => (
            <li key={session.id} className="slice-drop-card" data-testid="session-entry">
              <div className="slice-row">
                <div>
                  <p className="slice-label">
                    {session.deviceLabel}
                    {session.isCurrent ? (
                      <span className="verification-badge"> (current)</span>
                    ) : null}
                  </p>
                  <p className="slice-meta">
                    last active {relativeAge(session.lastActiveAt)} · started{" "}
                    {formatTimestamp(session.createdAt)}
                  </p>
                </div>
                {!session.isCurrent ? (
                  <button
                    className="slice-button ghost sm"
                    type="button"
                    disabled={revoking === session.id}
                    onClick={() => handleRevoke(session.id)}
                  >
                    {revoking === session.id ? "revoking..." : "revoke"}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
