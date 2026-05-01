"use client";

/**
 * Settings UI for managing the viewer's block + mute lists.
 *
 * Renders two side-by-side lists. Each entry has an "unblock" / "unmute"
 * button. Toggling the button calls the existing `POST /api/v1/social/{block,mute}/:handle`
 * route, which is idempotent (toggle), so a second call removes the relationship.
 *
 * Kept deliberately minimal — no avatar fetch, no profile preview — pending
 * design review per the plan's "Do NOT create new React components from
 * scratch" guidance. This is the simplest functional shape we can ship.
 */

import { useEffect, useState, useTransition } from "react";

type Mode = "block" | "mute";

type ListResponse = { blocked: string[] } | { muted: string[] };

async function fetchHandles(mode: Mode): Promise<string[]> {
  const res = await fetch(`/api/v1/social/${mode === "block" ? "blocked" : "muted"}`, {
    cache: "no-store"
  });
  if (!res.ok) return [];
  const body = (await res.json()) as ListResponse;
  return mode === "block"
    ? ((body as { blocked: string[] }).blocked ?? [])
    : ((body as { muted: string[] }).muted ?? []);
}

async function toggleHandle(mode: Mode, handle: string): Promise<boolean> {
  const res = await fetch(`/api/v1/social/${mode}/${encodeURIComponent(handle)}`, {
    method: "POST"
  });
  return res.ok;
}

function BlockMuteSection({ mode }: { mode: Mode }) {
  const [handles, setHandles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchHandles(mode).then((h) => {
      if (!cancelled) {
        setHandles(h);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  function handleToggle(handle: string) {
    startTransition(async () => {
      const ok = await toggleHandle(mode, handle);
      if (ok) {
        // Toggling removes the relationship — drop the handle locally.
        setHandles((prev) => prev.filter((h) => h !== handle));
        setFeedback(`@${handle} ${mode === "block" ? "unblocked" : "unmuted"}`);
        setTimeout(() => setFeedback(null), 2000);
      } else {
        setFeedback("could not update — try again");
        setTimeout(() => setFeedback(null), 3000);
      }
    });
  }

  const labelTitle = mode === "block" ? "blocked accounts" : "muted accounts";
  const emptyCopy =
    mode === "block"
      ? "you have not blocked anyone."
      : "you have not muted anyone.";

  return (
    <section className="slice-panel" data-testid={`settings-${mode}-list`}>
      <p className="slice-label">{labelTitle}</p>
      {feedback ? (
        <p className="slice-meta" role="status">
          {feedback}
        </p>
      ) : null}
      {loading ? (
        <p className="slice-copy">loading…</p>
      ) : handles.length === 0 ? (
        <p className="slice-copy">{emptyCopy}</p>
      ) : (
        <ul className="slice-list" aria-label={labelTitle}>
          {handles.map((h) => (
            <li key={h} className="slice-row">
              <span className="slice-copy">@{h}</span>
              <button
                type="button"
                className="slice-button ghost sm"
                onClick={() => handleToggle(h)}
                disabled={pending}
                data-testid={`settings-${mode}-toggle-${h}`}
              >
                {mode === "block" ? "unblock" : "unmute"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SettingsBlockMuteList() {
  return (
    <>
      <BlockMuteSection mode="block" />
      <BlockMuteSection mode="mute" />
    </>
  );
}
