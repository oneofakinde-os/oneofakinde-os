"use client";

import { useEffect, useRef, useState } from "react";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

type UseSupabaseRealtimeOptions = {
  /** Postgres table name to subscribe to (e.g. "bff_notification_entries"). */
  table: string;
  /** Optional schema name (default: "public"). */
  schema?: string;
  /** Which events to listen for (default: all). */
  events?: RealtimeEvent[];
  /** Optional row-level filter (e.g. "account_id=eq.abc123"). */
  filter?: string;
  /** Called whenever a matching change is received. */
  onChange: () => void;
  /** Whether the subscription is active (default: true). */
  enabled?: boolean;
};

type RealtimeState = "connecting" | "subscribed" | "closed" | "unavailable";

/**
 * Subscribes to Supabase Realtime postgres changes on a table.
 *
 * When Supabase env vars are not configured, returns state "unavailable"
 * so the caller can fall back to SSE / polling.
 *
 * The `onChange` callback is intentionally fire-and-forget — callers
 * should refetch from their API when notified rather than trying to
 * apply row-level diffs client-side.
 */
export function useSupabaseRealtime(options: UseSupabaseRealtimeOptions): {
  state: RealtimeState;
} {
  const {
    table,
    schema = "public",
    events = ["*"],
    filter,
    onChange,
    enabled = true
  } = options;

  const [state, setState] = useState<RealtimeState>("closed");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) {
      setState("closed");
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !key) {
      setState("unavailable");
      return;
    }

    let cancelled = false;

    async function subscribe() {
      // Dynamic import keeps the Supabase client out of bundles that don't need it.
      const { createBrowserClient } = await import("@supabase/ssr");
      if (cancelled) return;

      const supabase = createBrowserClient(url!, key!);

      setState("connecting");

      const channelName = `realtime:${table}:${filter ?? "all"}`;
      const channel = supabase.channel(channelName);

      for (const event of events) {
        const pgEvent = event === "*" ? "postgres_changes" : "postgres_changes";
        channel.on(
          pgEvent as "postgres_changes",
          {
            event: event as "INSERT" | "UPDATE" | "DELETE" | "*",
            schema,
            table,
            ...(filter ? { filter } : {})
          },
          () => {
            onChangeRef.current();
          }
        );
      }

      channel.subscribe((status) => {
        if (cancelled) {
          supabase.removeChannel(channel);
          return;
        }
        if (status === "SUBSCRIBED") {
          setState("subscribed");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setState("closed");
        }
      });

      // Return cleanup
      return () => {
        cancelled = true;
        supabase.removeChannel(channel);
      };
    }

    let cleanup: (() => void) | undefined;
    subscribe().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [table, schema, filter, enabled, events.join(",")]);

  return { state };
}
