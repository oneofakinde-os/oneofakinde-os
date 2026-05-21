"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type HandleChangeFormProps = {
  currentHandle: string;
};

export function HandleChangeForm({ currentHandle }: HandleChangeFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newHandle, setNewHandle] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSubmit() {
    const trimmed = newHandle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!trimmed || trimmed.length < 3) {
      setFeedback("handle must be at least 3 characters (letters, numbers, underscores).");
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/v1/session/account/handle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newHandle: trimmed })
      });
      if (res.ok) {
        setFeedback(`handle changed to @${trimmed}. old handle @${currentHandle} redirects for 180 days.`);
        setNewHandle("");
        router.refresh();
      } else {
        setFeedback("handle change failed. it may be taken or invalid.");
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  }

  return (
    <section className="slice-panel" data-testid="handle-change-form">
      <p className="slice-label">change handle</p>
      <p className="slice-copy">
        current handle: <strong>@{currentHandle}</strong>. your old handle will redirect for 180 days.
      </p>

      {feedback ? (
        <p className="slice-meta" role="status">{feedback}</p>
      ) : null}

      <div className="slice-form">
        <label className="slice-field">
          new handle
          <input
            className="slice-input"
            type="text"
            value={newHandle}
            onChange={(e) => setNewHandle(e.target.value)}
            placeholder="new_handle"
            minLength={3}
            maxLength={30}
          />
        </label>
        <div className="slice-button-row">
          <button
            type="button"
            className="slice-button"
            onClick={handleSubmit}
            disabled={pending || !newHandle.trim()}
          >
            {pending ? "changing..." : "change handle"}
          </button>
        </div>
      </div>
    </section>
  );
}
