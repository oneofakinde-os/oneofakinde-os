"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * React hook for consuming a Server-Sent Events (SSE) stream.
 *
 * Falls back to interval polling when EventSource is unavailable
 * (e.g. server doesn't support SSE, or connection fails repeatedly).
 *
 * @param url             SSE endpoint URL
 * @param options.onMessage   Callback receiving parsed JSON data on each event
 * @param options.fallbackPollMs  Polling interval in ms when SSE is unavailable (default: 10_000)
 * @param options.fallbackFetchUrl  URL to fetch during polling fallback (defaults to `url`)
 * @param options.enabled  Whether the stream is active (default: true)
 */
export type UseEventStreamOptions<T> = {
  onMessage: (data: T) => void;
  fallbackPollMs?: number;
  fallbackFetchUrl?: string;
  enabled?: boolean;
};

type ConnectionState = "connecting" | "open" | "closed" | "polling";

export function useEventStream<T = unknown>(
  url: string,
  options: UseEventStreamOptions<T>
) {
  const { onMessage, fallbackPollMs = 10_000, fallbackFetchUrl, enabled = true } = options;
  const [connectionState, setConnectionState] = useState<ConnectionState>("closed");
  const retriesRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!enabled) return;

    // If EventSource is not available, go straight to polling
    if (typeof EventSource === "undefined") {
      setConnectionState("polling");
      return;
    }

    setConnectionState("connecting");
    const es = new EventSource(url);

    es.onopen = () => {
      retriesRef.current = 0;
      setConnectionState("open");
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as T;
        onMessageRef.current(data);
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
      retriesRef.current += 1;
      // After 3 failed retries, fall back to polling permanently
      if (retriesRef.current >= 3) {
        setConnectionState("polling");
      } else {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.min(1000 * 2 ** (retriesRef.current - 1), 4000);
        setTimeout(() => {
          setConnectionState("connecting");
        }, delay);
      }
    };

    return es;
  }, [url, enabled]);

  // SSE connection lifecycle
  useEffect(() => {
    if (!enabled) {
      setConnectionState("closed");
      return;
    }

    const es = connect();

    return () => {
      es?.close();
    };
  }, [connect, enabled]);

  // Polling fallback
  useEffect(() => {
    if (connectionState !== "polling" || !enabled) return;

    const pollUrl = fallbackFetchUrl ?? url;
    let active = true;

    async function poll() {
      try {
        const res = await fetch(pollUrl);
        if (res.ok && active) {
          const data = await res.json();
          onMessageRef.current(data as T);
        }
      } catch {
        // Polling failure is non-critical
      }
    }

    // Initial poll immediately
    poll();
    const interval = setInterval(poll, fallbackPollMs);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [connectionState, fallbackPollMs, fallbackFetchUrl, url, enabled]);

  return { connectionState };
}
