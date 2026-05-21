"use client";

import type { DmRestriction, PrivacySettingsSnapshot } from "@/lib/domain/contracts";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type PrivacySettingsFormProps = {
  initial: PrivacySettingsSnapshot;
};

const DM_OPTIONS: ReadonlyArray<{ value: DmRestriction; label: string }> = [
  { value: "anyone", label: "anyone" },
  { value: "followers_only", label: "followers only" },
  { value: "mutual_only", label: "mutuals only" },
  { value: "no_one", label: "no one" }
];

export function PrivacySettingsForm({ initial }: PrivacySettingsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dmRestriction, setDmRestriction] = useState<DmRestriction>(initial.dmRestriction);
  const [onlineStatusVisible, setOnlineStatusVisible] = useState(initial.onlineStatusVisible);
  const [accountLocked, setAccountLocked] = useState(initial.accountLocked);
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSave() {
    startTransition(async () => {
      const res = await fetch("/api/v1/session/privacy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dmRestriction, onlineStatusVisible, accountLocked })
      });
      if (res.ok) {
        setFeedback("privacy settings updated.");
        router.refresh();
      } else {
        setFeedback("could not update privacy settings.");
      }
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  return (
    <section className="slice-panel" data-testid="privacy-settings-form">
      <p className="slice-label">privacy controls</p>

      {feedback ? (
        <p className="slice-meta" role="status">{feedback}</p>
      ) : null}

      <div className="ops-settings-grid">
        <label className="slice-field">
          who can send you direct messages
          <select
            className="slice-input"
            value={dmRestriction}
            onChange={(e) => setDmRestriction(e.target.value as DmRestriction)}
          >
            {DM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <label className="identity-checkbox">
          <input
            type="checkbox"
            checked={onlineStatusVisible}
            onChange={(e) => setOnlineStatusVisible(e.target.checked)}
          />
          <span>show online status to others</span>
        </label>

        <label className="identity-checkbox">
          <input
            type="checkbox"
            checked={accountLocked}
            onChange={(e) => setAccountLocked(e.target.checked)}
          />
          <span>lock account (require approval for new followers)</span>
        </label>
      </div>

      <div className="slice-button-row" style={{ marginTop: "1rem" }}>
        <button
          type="button"
          className="slice-button"
          onClick={handleSave}
          disabled={pending}
        >
          {pending ? "saving..." : "save privacy settings"}
        </button>
      </div>
    </section>
  );
}
