"use client";

/**
 * Sprint 0.1 — settings UI for account deletion + data export.
 *
 * Renders three buttons depending on the account's lifecycle state:
 *   - "active": [Download my data] + [Request deletion]
 *   - "deletion_requested": [Download my data] + [Cancel deletion]
 *   - "anonymized": (no controls — terminal state)
 *
 * Kept deliberately minimal per the plan's "Do NOT create new React
 * components from scratch" guidance. The "Request deletion" button shows
 * an inline confirmation row before posting, since deletion is a
 * destructive action.
 */

import type { AccountDeletionStatus } from "@/lib/domain/contracts";
import { useEffect, useState, useTransition } from "react";

async function fetchStatus(): Promise<AccountDeletionStatus | null> {
  const res = await fetch("/api/v1/session/account/deletion-status", { cache: "no-store" });
  if (!res.ok) return null;
  const body = (await res.json()) as { status: AccountDeletionStatus };
  return body.status;
}

async function postDelete(): Promise<AccountDeletionStatus | null> {
  const res = await fetch("/api/v1/session/account/delete", { method: "POST" });
  if (!res.ok) return null;
  return ((await res.json()) as { status: AccountDeletionStatus }).status;
}

async function postCancel(): Promise<AccountDeletionStatus | null> {
  const res = await fetch("/api/v1/session/account/delete/cancel", { method: "POST" });
  if (!res.ok) return null;
  return ((await res.json()) as { status: AccountDeletionStatus }).status;
}

function downloadExport() {
  // Direct browser navigation triggers the route's
  // `Content-Disposition: attachment` header.
  window.location.href = "/api/v1/session/account/export";
}

export function SettingsAccountDeletion() {
  const [status, setStatus] = useState<AccountDeletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStatus().then((s) => {
      if (!cancelled) {
        setStatus(s);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleRequestDelete() {
    startTransition(async () => {
      const next = await postDelete();
      if (next) {
        setStatus(next);
        setConfirming(false);
        setFeedback("deletion requested. you have 30 days to cancel before the data is removed.");
      } else {
        setFeedback("could not start deletion. try again.");
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  }

  function handleCancelDelete() {
    startTransition(async () => {
      const next = await postCancel();
      if (next) {
        setStatus(next);
        setFeedback("deletion cancelled. your account is active again.");
      } else {
        setFeedback("could not cancel. try again.");
      }
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  return (
    <section className="slice-panel" data-testid="settings-account-deletion">
      <p className="slice-label">account data + deletion</p>
      <p className="slice-copy">
        you can download a copy of your data at any time, or request that
        your account be deleted. deletion is reversible during a 30-day
        grace period; after that, your account is anonymized.
      </p>

      {feedback ? (
        <p className="slice-meta" role="status">
          {feedback}
        </p>
      ) : null}

      {loading ? (
        <p className="slice-copy">loading…</p>
      ) : status === "anonymized" ? (
        <p className="slice-copy">this account has been anonymized.</p>
      ) : (
        <div className="slice-button-row" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="slice-button alt"
            onClick={downloadExport}
            data-testid="settings-account-export-download"
          >
            download my data
          </button>

          {status === "deletion_requested" ? (
            <button
              type="button"
              className="slice-button"
              onClick={handleCancelDelete}
              disabled={pending}
              data-testid="settings-account-cancel-deletion"
            >
              cancel deletion
            </button>
          ) : confirming ? (
            <>
              <button
                type="button"
                className="slice-button"
                onClick={handleRequestDelete}
                disabled={pending}
                data-testid="settings-account-confirm-deletion"
              >
                yes, delete my account
              </button>
              <button
                type="button"
                className="slice-button ghost"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="slice-button ghost"
              onClick={() => setConfirming(true)}
              data-testid="settings-account-request-deletion"
            >
              request account deletion
            </button>
          )}
        </div>
      )}

      {status === "deletion_requested" ? (
        <p className="slice-meta" style={{ marginTop: "0.5rem" }}>
          deletion is currently pending. cancel anytime within the 30-day window.
        </p>
      ) : null}
    </section>
  );
}
