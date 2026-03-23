"use client";

import { useState, useTransition } from "react";

type Channel = {
  key: string;
  label: string;
  defaultOn: boolean;
};

const CHANNELS: Channel[] = [
  { key: "townhall_replies", label: "townhall replies and mentions", defaultOn: true },
  { key: "drop_purchases", label: "drop purchase and receipt updates", defaultOn: true },
  { key: "campaign_alerts", label: "campaign performance alerts", defaultOn: true },
  { key: "world_updates", label: "world membership and release updates", defaultOn: true },
  { key: "weekly_digest", label: "weekly digest only", defaultOn: false },
];

export function SettingsNotificationsForm() {
  const [channels, setChannels] = useState<Record<string, boolean>>(
    Object.fromEntries(CHANNELS.map((c) => [c.key, c.defaultOn]))
  );
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (key: string) => {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      // Notification preferences are stored client-side for now
      // until the BFF endpoint is wired up
      await new Promise((r) => setTimeout(r, 300));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const dirty = CHANNELS.some((c) => channels[c.key] !== c.defaultOn);

  return (
    <>
      {saved ? (
        <div className="slice-toast slice-toast-success" role="status">
          notification preferences saved
        </div>
      ) : null}

      <section className="slice-panel">
        <p className="slice-label">delivery channels</p>
        <div className="ops-settings-grid">
          {CHANNELS.map((channel) => (
            <label key={channel.key} className="ops-toggle">
              <input
                type="checkbox"
                checked={channels[channel.key] ?? false}
                onChange={() => handleToggle(channel.key)}
              />
              <span>{channel.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">quiet hours</p>
        <div className="ops-settings-grid">
          <label className="slice-field">
            from
            <input className="slice-input" type="time" defaultValue="22:00" />
          </label>
          <label className="slice-field">
            to
            <input className="slice-input" type="time" defaultValue="08:00" />
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
          >
            {isPending ? "saving…" : "save preferences"}
          </button>
        </div>
      ) : null}
    </>
  );
}
