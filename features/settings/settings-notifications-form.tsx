"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

type PreferencesPayload = {
  channels: Record<string, boolean>;
  mutedTypes: string[];
  digestEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursFromHour: number;
  quietHoursFromMinute: number;
  quietHoursToHour: number;
  quietHoursToMinute: number;
  quietHoursTimezone: string;
  digestMode: "none" | "daily" | "weekly";
  frequencyCap: number;
  emailCategories: Record<string, boolean>;
};

type NotificationToggle = {
  key: string;
  label: string;
  channelKey: string;
};

const TOGGLES: NotificationToggle[] = [
  { key: "in_app", label: "in-app notifications", channelKey: "in_app" },
  { key: "email", label: "email notifications", channelKey: "email" },
  { key: "push", label: "push notifications", channelKey: "push" },
];

const DIGEST_OPTIONS: { value: PreferencesPayload["digestMode"]; label: string }[] = [
  { value: "none", label: "real-time (no digest)" },
  { value: "daily", label: "daily digest" },
  { value: "weekly", label: "weekly digest" },
];

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function SettingsNotificationsForm() {
  const [prefs, setPrefs] = useState<PreferencesPayload | null>(null);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/v1/notifications/preferences")
      .then((r) => r.json())
      .then((data) => setPrefs(data))
      .catch(() => setLoadError(true));
  }, []);

  const handleChannelToggle = useCallback((channelKey: string) => {
    setPrefs((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        channels: { ...prev.channels, [channelKey]: !prev.channels[channelKey] },
      };
    });
    setSaved(false);
  }, []);

  const handleDigestChange = useCallback((mode: PreferencesPayload["digestMode"]) => {
    setPrefs((prev) => {
      if (!prev) return prev;
      return { ...prev, digestMode: mode, digestEnabled: mode !== "none" };
    });
    setSaved(false);
  }, []);

  const handleQuietToggle = useCallback(() => {
    setPrefs((prev) => {
      if (!prev) return prev;
      return { ...prev, quietHoursEnabled: !prev.quietHoursEnabled };
    });
    setSaved(false);
  }, []);

  const handleQuietTime = useCallback((field: "from" | "to", value: string) => {
    const [h, m] = value.split(":").map(Number);
    setPrefs((prev) => {
      if (!prev) return prev;
      if (field === "from") {
        return { ...prev, quietHoursFromHour: h, quietHoursFromMinute: m };
      }
      return { ...prev, quietHoursToHour: h, quietHoursToMinute: m };
    });
    setSaved(false);
  }, []);

  const handleSave = () => {
    if (!prefs) return;
    startTransition(async () => {
      const res = await fetch("/api/v1/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  };

  if (loadError) {
    return <p className="slice-muted">failed to load notification preferences.</p>;
  }

  if (!prefs) {
    return <p className="slice-muted">loading preferences…</p>;
  }

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
          {TOGGLES.map((toggle) => (
            <label key={toggle.key} className="ops-toggle">
              <input
                type="checkbox"
                checked={prefs.channels[toggle.channelKey] ?? false}
                onChange={() => handleChannelToggle(toggle.channelKey)}
                disabled={toggle.channelKey === "in_app"}
              />
              <span>{toggle.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">digest mode</p>
        <div className="ops-settings-grid">
          {DIGEST_OPTIONS.map((opt) => (
            <label key={opt.value} className="ops-toggle">
              <input
                type="radio"
                name="digestMode"
                checked={prefs.digestMode === opt.value}
                onChange={() => handleDigestChange(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">quiet hours</p>
        <div className="ops-settings-grid">
          <label className="ops-toggle">
            <input
              type="checkbox"
              checked={prefs.quietHoursEnabled}
              onChange={handleQuietToggle}
            />
            <span>enable quiet hours</span>
          </label>
          {prefs.quietHoursEnabled ? (
            <>
              <label className="slice-field">
                from
                <input
                  className="slice-input"
                  type="time"
                  value={`${pad2(prefs.quietHoursFromHour)}:${pad2(prefs.quietHoursFromMinute)}`}
                  onChange={(e) => handleQuietTime("from", e.target.value)}
                />
              </label>
              <label className="slice-field">
                to
                <input
                  className="slice-input"
                  type="time"
                  value={`${pad2(prefs.quietHoursToHour)}:${pad2(prefs.quietHoursToMinute)}`}
                  onChange={(e) => handleQuietTime("to", e.target.value)}
                />
              </label>
            </>
          ) : null}
        </div>
      </section>

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
    </>
  );
}
