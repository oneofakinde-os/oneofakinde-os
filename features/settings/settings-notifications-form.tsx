"use client";

/**
 * Wave 2.1 — Notification preferences form.
 *
 * Pre-Wave 2.1 this was a client-only stub with 5 fake channel toggles. It
 * is now backed by the real `/api/v1/account/notification-preferences`
 * endpoint:
 *
 *   - Three delivery channels (in_app / email / push). The latter two are
 *     opt-in placeholders today — Waves 2.3 and 2.4 add the actual
 *     delivery providers. The toggles persist regardless so a user can
 *     pre-set their preference before delivery ships.
 *   - Per-type mutes, grouped visually for usability but stored as the
 *     underlying `NotificationType` literal in the persistence row.
 *   - Digest opt-in.
 *
 * Quiet-hours UI is intentionally left as a no-op placeholder until Wave
 * 2.2 ships the data model + emit-time deferral.
 */

import { useState, useTransition } from "react";
import type {
  NotificationChannel,
  NotificationPreferences,
  NotificationType
} from "@/lib/domain/contracts";

type SettingsNotificationsFormProps = {
  initialPreferences: NotificationPreferences;
};

type ChannelDescriptor = { key: NotificationChannel; label: string; subtitle?: string };

const CHANNELS: ReadonlyArray<ChannelDescriptor> = [
  {
    key: "in_app",
    label: "in-app",
    subtitle: "show in the bell + /notifications feed."
  },
  {
    key: "email",
    label: "email",
    subtitle: "delivered to your account email. (provider rolls out in wave 2.3)"
  },
  {
    key: "push",
    label: "push",
    subtitle: "browser/device push. (provider rolls out in wave 2.4)"
  }
];

type TypeGroup = {
  legend: string;
  description: string;
  types: ReadonlyArray<{ type: NotificationType; label: string }>;
};

const TYPE_GROUPS: ReadonlyArray<TypeGroup> = [
  {
    legend: "drops + commerce",
    description: "events tied to your drops, receipts, and resales.",
    types: [
      { type: "drop_collected", label: "drop collected" },
      { type: "receipt_confirmed", label: "receipt confirmed" },
      { type: "resale_completed", label: "resale completed" },
      { type: "resale_royalty_earned", label: "royalty earned" }
    ]
  },
  {
    legend: "discourse",
    description: "replies + mentions on townhall and world conversations.",
    types: [
      { type: "comment_reply", label: "comment reply" },
      { type: "comment_mention", label: "@mention" }
    ]
  },
  {
    legend: "worlds + memberships",
    description: "world activity and membership state changes.",
    types: [
      { type: "world_update", label: "world update" },
      { type: "membership_change", label: "membership change" },
      { type: "patron_renewal", label: "patron renewal" },
      { type: "live_session_starting", label: "live session starting" }
    ]
  },
  {
    legend: "platform",
    description: "platform-side announcements.",
    types: [
      { type: "featured_lane_alert", label: "featured lane alert" },
      { type: "weekly_digest", label: "weekly digest" }
    ]
  }
];

export function SettingsNotificationsForm({ initialPreferences }: SettingsNotificationsFormProps) {
  const [channels, setChannels] = useState<Record<NotificationChannel, boolean>>({
    ...initialPreferences.channels
  });
  const [mutedTypes, setMutedTypes] = useState<Set<NotificationType>>(
    new Set(initialPreferences.mutedTypes)
  );
  const [digestEnabled, setDigestEnabled] = useState<boolean>(initialPreferences.digestEnabled);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // The server-rendered initial state is the canonical "clean" baseline.
  // We compare the current edit state to it to enable the save button.
  const dirty =
    CHANNELS.some(({ key }) => channels[key] !== initialPreferences.channels[key]) ||
    mutedTypes.size !== initialPreferences.mutedTypes.length ||
    initialPreferences.mutedTypes.some((t) => !mutedTypes.has(t)) ||
    digestEnabled !== initialPreferences.digestEnabled;

  function toggleChannel(key: NotificationChannel) {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
    setError(null);
  }

  function toggleMute(type: NotificationType) {
    setMutedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
    setSaved(false);
    setError(null);
  }

  function handleSave() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/account/notification-preferences", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            channels,
            mutedTypes: Array.from(mutedTypes),
            digestEnabled
          })
        });
        if (!res.ok) {
          throw new Error(`server returned ${res.status}`);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        setError(`could not save preferences (${message}). please retry.`);
      }
    });
  }

  return (
    <>
      {saved ? (
        <div className="slice-toast slice-toast-success" role="status">
          notification preferences saved
        </div>
      ) : null}
      {error ? (
        <div className="slice-toast slice-toast-error" role="alert">
          {error}
        </div>
      ) : null}

      {/* delivery channels */}
      <section className="slice-panel">
        <p className="slice-label">delivery channels</p>
        <p className="slice-meta">
          where notifications go. in-app is on by default. email and push delivery roll out in
          waves 2.3 and 2.4 — toggling them today persists your choice but does not yet send.
        </p>
        <div className="ops-settings-grid">
          {CHANNELS.map((channel) => (
            <label key={channel.key} className="ops-toggle">
              <input
                type="checkbox"
                checked={channels[channel.key] ?? false}
                onChange={() => toggleChannel(channel.key)}
                data-testid={`pref-channel-${channel.key}`}
              />
              <span>
                <strong>{channel.label}</strong>
                {channel.subtitle ? <em className="slice-meta"> · {channel.subtitle}</em> : null}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* per-type mutes */}
      {TYPE_GROUPS.map((group) => (
        <section className="slice-panel" key={group.legend}>
          <p className="slice-label">{group.legend}</p>
          <p className="slice-meta">{group.description}</p>
          <div className="ops-settings-grid">
            {group.types.map(({ type, label }) => {
              const muted = mutedTypes.has(type);
              return (
                <label key={type} className="ops-toggle">
                  {/* checked = NOT muted (we frame the toggle as opt-in) */}
                  <input
                    type="checkbox"
                    checked={!muted}
                    onChange={() => toggleMute(type)}
                    data-testid={`pref-type-${type}`}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </section>
      ))}

      {/* digest opt-in */}
      <section className="slice-panel">
        <p className="slice-label">digest</p>
        <div className="ops-settings-grid">
          <label className="ops-toggle">
            <input
              type="checkbox"
              checked={digestEnabled}
              onChange={() => {
                setDigestEnabled((v) => !v);
                setSaved(false);
                setError(null);
              }}
              data-testid="pref-digest-enabled"
            />
            <span>weekly summary digest</span>
          </label>
        </div>
      </section>

      {/* quiet hours — placeholder; wave 2.2 wires the data model + deferral */}
      <section className="slice-panel" aria-disabled="true">
        <p className="slice-label">quiet hours</p>
        <p className="slice-meta">
          coming in wave 2.2 — pause delivery during a daily window without losing notifications.
        </p>
        <div className="ops-settings-grid">
          <label className="slice-field">
            from
            <input className="slice-input" type="time" defaultValue="22:00" disabled />
          </label>
          <label className="slice-field">
            to
            <input className="slice-input" type="time" defaultValue="08:00" disabled />
          </label>
        </div>
      </section>

      {dirty ? (
        <div className="slice-button-row" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="slice-button"
            onClick={handleSave}
            disabled={isPending}
            data-testid="save-preferences"
          >
            {isPending ? "saving…" : "save preferences"}
          </button>
        </div>
      ) : null}
    </>
  );
}
