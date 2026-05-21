"use client";

import type { AudienceScope, Broadcast, BroadcastType } from "@/lib/domain/creator-broadcast";
import { useState, useTransition } from "react";

type BroadcastComposerProps = {
  initialBroadcasts: Broadcast[];
};

type ScopeKind = "all_followers" | "patrons_only";

const TYPE_OPTIONS: { value: BroadcastType; label: string }[] = [
  { value: "newsletter", label: "newsletter" },
  { value: "world_announcement", label: "world announcement" },
  { value: "drop_launch", label: "drop launch" },
  { value: "patron_update", label: "patron update" }
];

const SCOPE_OPTIONS: { value: ScopeKind; label: string }[] = [
  { value: "all_followers", label: "all followers" },
  { value: "patrons_only", label: "patrons only" }
];

function scopeFromKind(kind: ScopeKind): AudienceScope {
  return kind === "patrons_only" ? { kind: "patrons_only" } : { kind: "all_followers" };
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function BroadcastComposer({ initialBroadcasts }: BroadcastComposerProps) {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(initialBroadcasts);
  const [type, setType] = useState<BroadcastType>("newsletter");
  const [scopeKind, setScopeKind] = useState<ScopeKind>("all_followers");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function flash(message: string) {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 4000);
  }

  function handlePreview() {
    startTransition(async () => {
      const res = await fetch("/api/v1/workshop/broadcasts/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ audienceScope: scopeFromKind(scopeKind) })
      });
      if (res.ok) {
        const data = (await res.json()) as { preview: { totalRecipients: number } };
        setPreviewCount(data.preview.totalRecipients);
      } else {
        flash("could not preview audience.");
      }
    });
  }

  function handleCreate() {
    if (!subject.trim() || !body.trim()) {
      flash("subject and body are required.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/v1/workshop/broadcasts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, subject, body, audienceScope: scopeFromKind(scopeKind) })
      });
      if (res.ok) {
        const data = (await res.json()) as { broadcast: Broadcast };
        setBroadcasts((current) => [data.broadcast, ...current]);
        setSubject("");
        setBody("");
        setPreviewCount(null);
        flash("draft saved.");
      } else {
        flash("could not save draft.");
      }
    });
  }

  function handleSend(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/v1/workshop/broadcasts/${encodeURIComponent(id)}/send`, {
        method: "POST"
      });
      if (res.ok) {
        const data = (await res.json()) as { broadcast: Broadcast };
        setBroadcasts((current) => current.map((b) => (b.id === id ? data.broadcast : b)));
        flash(`sent to ${data.broadcast.recipientCount ?? 0} recipient${data.broadcast.recipientCount === 1 ? "" : "s"}.`);
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        flash(data?.error ?? "could not send broadcast.");
      }
    });
  }

  return (
    <>
      <section className="slice-panel" data-testid="broadcast-composer">
        <p className="slice-label">compose broadcast</p>
        {feedback ? (
          <p className="slice-meta" role="status">{feedback}</p>
        ) : null}
        <div className="slice-form">
          <div className="broadcast-compose-row">
            <label className="slice-field">
              type
              <select className="slice-input" value={type} onChange={(e) => setType(e.target.value as BroadcastType)}>
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="slice-field">
              audience
              <select
                className="slice-input"
                value={scopeKind}
                onChange={(e) => {
                  setScopeKind(e.target.value as ScopeKind);
                  setPreviewCount(null);
                }}
              >
                {SCOPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="slice-field">
            subject
            <input
              className="slice-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="what's this update about?"
              maxLength={140}
            />
          </label>
          <label className="slice-field">
            message
            <textarea
              className="slice-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="write your broadcast"
              rows={5}
              maxLength={4000}
            />
          </label>
          <div className="slice-button-row">
            <button type="button" className="slice-button ghost" onClick={handlePreview} disabled={pending}>
              preview audience
            </button>
            {previewCount !== null ? (
              <span className="slice-meta" data-testid="broadcast-preview-count">
                {previewCount} recipient{previewCount === 1 ? "" : "s"}
              </span>
            ) : null}
            <button type="button" className="slice-button" onClick={handleCreate} disabled={pending}>
              {pending ? "saving..." : "save draft"}
            </button>
          </div>
        </div>
      </section>

      <section className="slice-panel" data-testid="broadcast-list">
        <p className="slice-label">your broadcasts</p>
        {broadcasts.length === 0 ? (
          <p className="slice-copy">no broadcasts yet. compose one above.</p>
        ) : (
          <ul className="slice-list" aria-label="broadcasts">
            {broadcasts.map((broadcast) => (
              <li key={broadcast.id} className="slice-drop-card" data-testid="broadcast-item">
                <div className="slice-row">
                  <p className="slice-label">{broadcast.type.replace(/_/g, " ")}</p>
                  <p className="slice-meta">{broadcast.status}</p>
                </div>
                <h3 className="slice-title">{broadcast.subject}</h3>
                <p className="slice-copy">{broadcast.body}</p>
                <p className="slice-meta">
                  audience: {broadcast.audienceScope.kind.replace(/_/g, " ")}
                  {broadcast.status === "sent"
                    ? ` · sent ${formatTimestamp(broadcast.sentAt)} · ${broadcast.recipientCount ?? 0} recipients`
                    : ` · created ${formatTimestamp(broadcast.createdAt)}`}
                </p>
                {broadcast.status === "draft" || broadcast.status === "scheduled" ? (
                  <div className="slice-button-row">
                    <button
                      type="button"
                      className="slice-button"
                      onClick={() => handleSend(broadcast.id)}
                      disabled={pending}
                    >
                      send now
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
