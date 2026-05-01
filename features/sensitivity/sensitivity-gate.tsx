"use client";

/**
 * Sprint 0.3 — Consumer-side sensitivity interstitial.
 *
 * Wraps content that may carry an `advisory` or `mature` sensitivity rating
 * and shows a click-through confirmation before revealing the children.
 *
 *   - `none`     → renders children immediately (no overlay)
 *   - `advisory` → "may contain mature themes"
 *   - `mature`   → "explicit content; viewer must confirm"
 *
 * Per the Master Engineer Plan this is a client-side gate, NOT a security
 * boundary — the API still returns the drop data; we just defer rendering.
 * Confirmations are remembered in sessionStorage keyed by `dropId` so the
 * collector isn't re-prompted on every navigation within a single session.
 */

import { useEffect, useState } from "react";
import type { SensitivityRating, SensitivitySource } from "@/lib/domain/contracts";

type SensitivityGateProps = {
  dropId: string;
  rating: SensitivityRating | undefined;
  source?: SensitivitySource;
  children: React.ReactNode;
};

const STORAGE_PREFIX = "ook.sensitivity.confirmed.";

function readConfirmed(dropId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(STORAGE_PREFIX + dropId) === "1";
  } catch {
    return false;
  }
}

function persistConfirmed(dropId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + dropId, "1");
  } catch {
    // sessionStorage unavailable (private mode etc.) — noop; user reconfirms next time.
  }
}

function bannerCopy(rating: "advisory" | "mature"): { title: string; body: string } {
  if (rating === "mature") {
    return {
      title: "explicit content",
      body: "this drop contains explicit content. confirm to continue."
    };
  }
  return {
    title: "advisory",
    body: "this drop may contain mature themes. confirm to continue."
  };
}

export function SensitivityGate({ dropId, rating, source, children }: SensitivityGateProps) {
  // Drops marked `none` (or unrated) skip the gate entirely.
  const needsGate = rating === "advisory" || rating === "mature";
  const [confirmed, setConfirmed] = useState(false);

  // Hydration-safe: don't read sessionStorage during the server render.
  useEffect(() => {
    if (!needsGate) return;
    if (readConfirmed(dropId)) {
      setConfirmed(true);
    }
  }, [dropId, needsGate]);

  if (!needsGate || confirmed) {
    return <>{children}</>;
  }

  const copy = bannerCopy(rating);
  return (
    <section
      className="slice-panel"
      data-testid="sensitivity-gate"
      data-sensitivity-rating={rating}
      role="alertdialog"
      aria-labelledby={`sensitivity-gate-${dropId}-title`}
      aria-describedby={`sensitivity-gate-${dropId}-body`}
    >
      <p className="slice-label" id={`sensitivity-gate-${dropId}-title`}>
        {copy.title}
      </p>
      <p className="slice-copy" id={`sensitivity-gate-${dropId}-body`}>
        {copy.body}
      </p>
      {source === "world_default" ? (
        <p className="slice-meta">rating inherited from this drop's world.</p>
      ) : null}
      <div className="slice-button-row" style={{ marginTop: "1rem" }}>
        <button
          type="button"
          className="slice-button"
          onClick={() => {
            persistConfirmed(dropId);
            setConfirmed(true);
          }}
          data-testid="sensitivity-gate-confirm"
        >
          continue
        </button>
        <a href="/showroom" className="slice-button ghost" data-testid="sensitivity-gate-back">
          back to showroom
        </a>
      </div>
    </section>
  );
}
