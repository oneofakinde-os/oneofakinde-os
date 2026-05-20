"use client";

import type { DmRestriction, Studio } from "@/lib/domain/contracts";
import { useState, useTransition } from "react";

type SettingsStudioSafetyProps = {
  studio: Studio | null;
  updateAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
};

const DM_OPTIONS: ReadonlyArray<{ value: DmRestriction; label: string; description: string }> = [
  { value: "anyone", label: "anyone", description: "any account can message you" },
  { value: "followers_only", label: "followers only", description: "only accounts that follow you" },
  { value: "mutual_only", label: "mutual only", description: "only accounts you both follow" },
  { value: "no_one", label: "no one", description: "disable direct messages entirely" }
];

export function SettingsStudioSafety({ studio, updateAction }: SettingsStudioSafetyProps) {
  const [dmRestriction, setDmRestriction] = useState<DmRestriction>(studio?.dmRestriction ?? "anyone");
  const [keywordFiltersText, setKeywordFiltersText] = useState(
    (studio?.keywordFilters ?? []).join(", ")
  );
  const [onlineStatusVisible, setOnlineStatusVisible] = useState(studio?.onlineStatusVisible ?? true);
  const [hideLikeCounts, setHideLikeCounts] = useState(studio?.hideLikeCounts ?? false);
  const [isPrivate, setIsPrivate] = useState(studio?.isPrivate ?? false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!studio) return null;

  function handleSubmit() {
    const formData = new FormData();
    formData.set("dmRestriction", dmRestriction);
    formData.set("keywordFilters", keywordFiltersText.trim());
    formData.set("onlineStatusVisible", String(onlineStatusVisible));
    formData.set("hideLikeCounts", String(hideLikeCounts));
    formData.set("isPrivate", String(isPrivate));

    startTransition(async () => {
      const result = await updateAction(formData);
      if (result.ok) {
        setFeedback({ type: "success", message: "safety settings updated" });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: "error", message: result.error ?? "update failed" });
      }
    });
  }

  return (
    <section className="slice-panel" aria-label="studio safety settings">
      <p className="slice-label">studio safety + privacy</p>

      {feedback ? (
        <div
          className={`slice-toast ${feedback.type === "success" ? "slice-toast-success" : "slice-toast-error"}`}
          role="status"
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="ops-settings-grid">
        {/* DM restriction */}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="slice-meta" style={{ marginBottom: "0.5rem" }}>
            who can send you direct messages?
          </legend>
          <div className="create-stepper-world-grid">
            {DM_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`create-stepper-world-card${dmRestriction === option.value ? " selected" : ""}`}
                style={{ cursor: "pointer", textAlign: "left" }}
              >
                <input
                  type="radio"
                  name="dmRestriction"
                  value={option.value}
                  checked={dmRestriction === option.value}
                  onChange={() => setDmRestriction(option.value)}
                  style={{ marginRight: "0.5rem" }}
                />
                <span className="create-stepper-world-title">{option.label}</span>
                <span className="slice-meta">{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* keyword filters */}
        <label className="slice-field">
          <span className="slice-meta">keyword filters (comma-separated)</span>
          <textarea
            className="slice-input"
            value={keywordFiltersText}
            onChange={(e) => setKeywordFiltersText(e.target.value)}
            placeholder="word1, word2, phrase three..."
            rows={2}
            style={{ resize: "vertical", fontFamily: "inherit" }}
          />
          <span className="slice-meta">
            comments matching these words will be auto-hidden
          </span>
        </label>

        {/* toggle controls */}
        <label className="identity-discovery-card" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem" }}>
          <input
            type="checkbox"
            checked={onlineStatusVisible}
            onChange={(e) => setOnlineStatusVisible(e.target.checked)}
          />
          <div>
            <span className="slice-copy">show online status</span>
            <span className="slice-meta" style={{ display: "block" }}>
              others can see when you are active
            </span>
          </div>
        </label>

        <label className="identity-discovery-card" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem" }}>
          <input
            type="checkbox"
            checked={hideLikeCounts}
            onChange={(e) => setHideLikeCounts(e.target.checked)}
          />
          <div>
            <span className="slice-copy">hide like counts</span>
            <span className="slice-meta" style={{ display: "block" }}>
              like counts on your drops will be hidden from public view
            </span>
          </div>
        </label>

        <label className="identity-discovery-card" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem" }}>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          <div>
            <span className="slice-copy">private studio</span>
            <span className="slice-meta" style={{ display: "block" }}>
              new followers must be approved before they can see your drops
            </span>
          </div>
        </label>
      </div>

      <div className="slice-button-row" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="slice-button"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? "saving…" : "save safety settings"}
        </button>
      </div>
    </section>
  );
}
