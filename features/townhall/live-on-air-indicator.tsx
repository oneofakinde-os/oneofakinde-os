"use client";

import { useEffect, useState } from "react";
import "./live-on-air-indicator.css";

type LiveSessionEntry = {
  liveSession: {
    startsAt: string;
    endsAt: string | null;
  };
};

export function LiveOnAirIndicator() {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const response = await fetch("/api/v1/collect/live-sessions");
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;

        const now = Date.now();
        const anyLive = (data.liveSessions ?? []).some((entry: LiveSessionEntry) => {
          const startsAt = Date.parse(entry.liveSession.startsAt);
          const endsAt = entry.liveSession.endsAt
            ? Date.parse(entry.liveSession.endsAt)
            : null;
          return startsAt <= now && (endsAt === null || now <= endsAt);
        });

        setIsLive(anyLive);
      } catch {
        // silently ignore fetch errors
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLive) return null;

  return <span className="live-on-air-dot" data-testid="live-on-air-dot" />;
}
