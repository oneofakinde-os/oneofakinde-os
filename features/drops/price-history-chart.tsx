"use client";

import { formatUsd } from "@/features/shared/format";
import { useEffect, useState } from "react";

type PriceEvent = {
  timestamp: string;
  priceUsd: number;
  event: "listed" | "resale_listed" | "offer" | "settled";
};

type PriceHistoryResponse = {
  dropId: string;
  history: PriceEvent[];
};

type FetchState = "loading" | "loaded" | "error";

const EVENT_LABELS: Record<PriceEvent["event"], string> = {
  listed: "listed",
  resale_listed: "resale listed",
  offer: "offer",
  settled: "settled"
};

function trendArrow(history: PriceEvent[]): string {
  if (history.length < 2) return "--";
  const first = history[0];
  const last = history[history.length - 1];
  if (!first || !last) return "--";
  if (last.priceUsd > first.priceUsd) return "^";
  if (last.priceUsd < first.priceUsd) return "v";
  return "--";
}

type PriceHistoryChartProps = {
  dropId: string;
};

export function PriceHistoryChart({ dropId }: PriceHistoryChartProps) {
  const [state, setState] = useState<FetchState>("loading");
  const [data, setData] = useState<PriceHistoryResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/v1/drops/${encodeURIComponent(dropId)}/price-history`);
        if (!response.ok) {
          if (!cancelled) setState("error");
          return;
        }
        const body = (await response.json()) as PriceHistoryResponse;
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
      <section className="dropflow-panel" data-testid="price-history-loading">
        <p className="dropflow-meta">loading price history...</p>
      </section>
    );
  }

  if (state === "error" || !data) {
    return (
      <section className="dropflow-panel" data-testid="price-history-error">
        <p className="dropflow-meta">price history unavailable</p>
      </section>
    );
  }

  const history = data.history;
  if (history.length === 0) {
    return (
      <section className="dropflow-panel" data-testid="price-history-empty">
        <p className="dropflow-meta">no price history available</p>
      </section>
    );
  }

  const prices = history.map((entry) => entry.priceUsd);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currentPrice = history[history.length - 1]?.priceUsd ?? 0;
  const trend = trendArrow(history);

  return (
    <section className="dropflow-panel" data-testid="price-history-chart">
      <div className="dropflow-panel-head">
        <p>price history</p>
        <span>
          {trend === "^" ? "trending up" : trend === "v" ? "trending down" : "stable"} {trend}
        </span>
      </div>

      <dl className="dropflow-metadata-grid">
        <div>
          <dt>min</dt>
          <dd>{formatUsd(minPrice)}</dd>
        </div>
        <div>
          <dt>max</dt>
          <dd>{formatUsd(maxPrice)}</dd>
        </div>
        <div>
          <dt>current</dt>
          <dd>{formatUsd(currentPrice)}</dd>
        </div>
      </dl>

      <ul className="dropflow-list" aria-label="price history timeline">
        {history.map((entry, index) => (
          <li key={`${entry.timestamp}-${index}`} className="dropflow-list-row">
            <p className="dropflow-meta">
              {new Date(entry.timestamp).toLocaleDateString()} · {EVENT_LABELS[entry.event]}
            </p>
            <p>{formatUsd(entry.priceUsd)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
