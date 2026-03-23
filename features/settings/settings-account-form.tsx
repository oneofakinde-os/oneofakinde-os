"use client";

import { updateProfileAction } from "@/app/(collector)/settings/account/actions";
import type { ProfileUpdateResult } from "@/app/(collector)/settings/account/actions";
import { OptimizedImage } from "@/features/media/optimized-image";
import type { Session } from "@/lib/domain/contracts";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

type SettingsAccountFormProps = {
  session: Session;
};

export function SettingsAccountForm({ session }: SettingsAccountFormProps) {
  const [displayName, setDisplayName] = useState(session.displayName);
  const [bio, setBio] = useState(session.bio ?? "");
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const dirty = displayName !== session.displayName || bio !== (session.bio ?? "");

  function handleCancel() {
    setDisplayName(session.displayName);
    setBio(session.bio ?? "");
    setEditing(false);
    setFeedback(null);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result: ProfileUpdateResult = await updateProfileAction(formData);
      if (result.ok) {
        setFeedback({ type: "success", message: "profile updated" });
        setEditing(false);
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: "error", message: result.error ?? "update failed" });
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      {feedback ? (
        <div
          className={`slice-toast ${feedback.type === "success" ? "slice-toast-success" : "slice-toast-error"}`}
          role="status"
        >
          {feedback.message}
        </div>
      ) : null}

      <section className="slice-panel">
        <p className="slice-label">profile</p>
        <div className="ops-settings-grid">
          <div className="slice-field" style={{ alignItems: "center", display: "flex", gap: 12 }}>
            {session.avatarUrl ? (
              <OptimizedImage
                src={session.avatarUrl}
                alt={`@${session.handle}`}
                className="slice-avatar"
                width={56}
                height={56}
                preset="avatarSettings"
              />
            ) : (
              <span className="slice-avatar-placeholder slice-avatar-placeholder-lg" aria-hidden>
                {session.handle.charAt(0)}
              </span>
            )}
            <span className="slice-meta">
              upload a new avatar from the{" "}
              <Link href="/onboarding/profile-setup" className="slice-link">
                profile setup
              </Link>{" "}
              page
            </span>
          </div>
        </div>
      </section>

      <section className="slice-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="slice-label">identity + contact</p>
          {!editing ? (
            <button
              type="button"
              className="slice-button ghost"
              onClick={() => setEditing(true)}
              style={{ fontSize: "0.8rem", padding: "4px 12px" }}
            >
              edit
            </button>
          ) : null}
        </div>
        <div className="ops-settings-grid">
          <label className="slice-field">
            email
            <input className="slice-input" value={session.email} readOnly tabIndex={-1} />
          </label>
          <label className="slice-field">
            handle
            <input className="slice-input" value={`@${session.handle}`} readOnly tabIndex={-1} />
          </label>
          <label className="slice-field">
            display name
            {editing ? (
              <input
                className="slice-input"
                name="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                autoFocus
              />
            ) : (
              <input className="slice-input" value={displayName} readOnly tabIndex={-1} />
            )}
          </label>
          <label className="slice-field">
            bio
            {editing ? (
              <textarea
                className="slice-input"
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
                style={{ resize: "vertical", fontFamily: "inherit" }}
              />
            ) : (
              <input
                className="slice-input"
                value={bio || "no bio set"}
                readOnly
                tabIndex={-1}
                style={bio ? undefined : { opacity: 0.5, fontStyle: "italic" }}
              />
            )}
          </label>
          {editing ? (
            <div className="slice-field" style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <span className="slice-meta" style={{ flex: 1 }}>
                {bio.length}/500 characters
              </span>
            </div>
          ) : null}
          <label className="slice-field">
            role access
            <input className="slice-input" value={session.roles.join(", ")} readOnly tabIndex={-1} />
          </label>
        </div>
      </section>

      {editing ? (
        <div className="slice-button-row" style={{ marginTop: 8 }}>
          <button
            type="submit"
            className="slice-button"
            disabled={isPending || !dirty}
          >
            {isPending ? "saving…" : "save changes"}
          </button>
          <button
            type="button"
            className="slice-button ghost"
            onClick={handleCancel}
            disabled={isPending}
          >
            cancel
          </button>
        </div>
      ) : null}
    </form>
  );
}
