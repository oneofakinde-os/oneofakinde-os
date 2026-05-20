"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export type ShortcutEntry = {
  keys: string;
  label: string;
  section: string;
  action: () => void;
};

function isInputFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

/**
 * Registers global keyboard shortcuts for navigation.
 * Two-key combos use a "leader" model: press g, then within 800ms press the second key.
 * Single-key shortcuts fire immediately.
 */
export function useKeyboardShortcuts(onToggleHelp: () => void) {
  const router = useRouter();
  const leaderRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearLeader() {
      leaderRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Single-key shortcuts
      if (key === "?" && !leaderRef.current) {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      // Leader key
      if (key === "g" && !leaderRef.current) {
        leaderRef.current = "g";
        timerRef.current = setTimeout(clearLeader, 800);
        return;
      }

      // g + second key combos
      if (leaderRef.current === "g") {
        clearLeader();
        const route = G_COMBOS[key];
        if (route) {
          e.preventDefault();
          router.push(route as Parameters<typeof router.push>[0]);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearLeader();
    };
  }, [router, onToggleHelp]);
}

const G_COMBOS: Record<string, string> = {
  h: "/",
  t: "/townhall",
  c: "/collect",
  l: "/library",
  m: "/messages",
  w: "/workshop",
  n: "/notifications",
  s: "/settings/account",
  o: "/my-collection",
  d: "/worlds",
};

export const SHORTCUT_SECTIONS: { section: string; items: { keys: string; label: string }[] }[] = [
  {
    section: "navigation",
    items: [
      { keys: "g h", label: "go to home" },
      { keys: "g t", label: "go to townhall" },
      { keys: "g c", label: "go to collect" },
      { keys: "g o", label: "go to my collection" },
      { keys: "g l", label: "go to library" },
      { keys: "g m", label: "go to messages" },
      { keys: "g w", label: "go to workshop" },
      { keys: "g n", label: "go to notifications" },
      { keys: "g s", label: "go to settings" },
      { keys: "g d", label: "go to worlds" },
    ],
  },
  {
    section: "global",
    items: [
      { keys: "/", label: "open search" },
      { keys: "⌘ K", label: "open search" },
      { keys: "?", label: "show keyboard shortcuts" },
    ],
  },
];
