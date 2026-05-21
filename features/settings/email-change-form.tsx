"use client";

import { useState, useTransition } from "react";

type EmailChangeFormProps = {
  currentEmail: string;
};

export function EmailChangeForm({ currentEmail }: EmailChangeFormProps) {
  const [pending, startTransition] = useTransition();
  const [newEmail, setNewEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSubmit() {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setFeedback("enter a valid email address.");
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/v1/session/account/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newEmail: trimmed })
      });
      if (res.ok) {
        setFeedback("verification email sent. check your inbox to confirm the change.");
        setNewEmail("");
      } else {
        setFeedback("email change failed. it may be taken or invalid.");
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  }

  return (
    <section className="slice-panel" data-testid="email-change-form">
      <p className="slice-label">change email</p>
      <p className="slice-copy">
        current email: <strong>{currentEmail}</strong>. a verification link will be sent to the new address.
      </p>

      {feedback ? (
        <p className="slice-meta" role="status">{feedback}</p>
      ) : null}

      <div className="slice-form">
        <label className="slice-field">
          new email
          <input
            className="slice-input"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new-email@example.com"
          />
        </label>
        <div className="slice-button-row">
          <button
            type="button"
            className="slice-button"
            onClick={handleSubmit}
            disabled={pending || !newEmail.trim()}
          >
            {pending ? "sending..." : "request email change"}
          </button>
        </div>
      </div>
    </section>
  );
}
