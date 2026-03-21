"use client";

import { useEffect, useState } from "react";

type SentimentLevel = "cold" | "warm" | "hot" | "on_fire";

type SentimentResponse = {
  dropId: string;
  sentiment: SentimentLevel;
  signals: {
    likes: number;
    comments: number;
    collections: number;
    resaleOffers: number;
  };
  score: number;
};

type FetchState = "loading" | "loaded" | "error";

const SENTIMENT_COLORS: Record<SentimentLevel, string> = {
  cold: "#9ca3af",
  warm: "#eab308",
  hot: "#f97316",
  on_fire: "#ef4444"
};

const SENTIMENT_LABELS: Record<SentimentLevel, string> = {
  cold: "cold",
  warm: "warm",
  hot: "hot",
  on_fire: "on fire"
};

type MarketSentimentBadgeProps = {
  dropId: string;
};

export function MarketSentimentBadge({ dropId }: MarketSentimentBadgeProps) {
  const [state, setState] = useState<FetchState>("loading");
  const [data, setData] = useState<SentimentResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/v1/drops/${encodeURIComponent(dropId)}/sentiment`);
        if (!response.ok) {
          if (!cancelled) setState("error");
          return;
        }
        const body = (await response.json()) as SentimentResponse;
        if (!cancelled) {
          setData(body);
          setState("loaded");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [dropId]);

  if (state === "loading") {
    return (
      <span className="dropflow-meta" data-testid="sentiment-badge-loading">
        ...
      </span>
    );
  }

  if (state === "error" || !data) {
    return null;
  }

  const color = SENTIMENT_COLORS[data.sentiment];
  const label = SENTIMENT_LABELS[data.sentiment];

  return (
    <span
      className="dropflow-badge"
      data-testid="market-sentiment-badge"
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: color,
        color: data.sentiment === "cold" ? "#1f2937" : "#fff"
      }}
      title={`sentiment score: ${data.score}`}
    >
      {label} · {data.score}
    </span>
  );
}
