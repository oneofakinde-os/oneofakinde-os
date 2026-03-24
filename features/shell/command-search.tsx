"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  id: string;
  title: string;
  studioHandle: string;
  priceUsd: number;
  synopsis: string;
  posterSrc?: string;
};

type QuickLink = {
  label: string;
  href: string;
  section: string;
};

const QUICK_LINKS: QuickLink[] = [
  { label: "showroom", href: "/showroom", section: "navigate" },
  { label: "townhall", href: "/townhall", section: "navigate" },
  { label: "worlds", href: "/worlds", section: "navigate" },
  { label: "my collection", href: "/my-collection", section: "navigate" },
  { label: "library", href: "/library", section: "navigate" },
  { label: "notifications", href: "/notifications", section: "navigate" },
  { label: "settings", href: "/settings/account", section: "navigate" },
  { label: "workshop", href: "/workshop", section: "creator" },
  { label: "dashboard", href: "/dashboard", section: "creator" },
];

function formatPrice(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  // Keyboard shortcut: / or Cmd+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !open) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const res = await fetch(
          `/api/v1/catalog/search?q=${encodeURIComponent(query.trim())}&limit=6`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          const mapped: SearchResult[] = (data.results ?? []).map((drop: Record<string, unknown>) => ({
            id: drop.id as string,
            title: drop.title as string,
            studioHandle: drop.studioHandle as string,
            priceUsd: drop.priceUsd as number,
            synopsis: drop.synopsis as string,
            posterSrc: (drop.previewMedia as Record<string, Record<string, string>> | undefined)
              ?.watch?.posterSrc
              ?? (drop.previewMedia as Record<string, Record<string, string>> | undefined)
                ?.photos?.src
              ?? undefined,
          }));
          setResults(mapped);
          setSelectedIndex(0);
        }
      } catch {
        // Aborted or failed — ignore
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Filtered quick links
  const filteredLinks = query.trim()
    ? QUICK_LINKS.filter((l) => l.label.includes(query.toLowerCase()))
    : QUICK_LINKS;

  const allItems = [
    ...results.map((r) => ({ type: "drop" as const, ...r })),
    ...filteredLinks.map((l) => ({ type: "link" as const, ...l })),
  ];

  const handleSelect = useCallback(
    (index: number) => {
      const item = allItems[index];
      if (!item) return;
      if (item.type === "drop") {
        router.push(`/drops/${item.id}` as Parameters<typeof router.push>[0]);
      } else {
        router.push(item.href as Parameters<typeof router.push>[0]);
      }
      setOpen(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, router]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  }

  if (!open) return null;

  return (
    <div className="command-backdrop" onClick={() => setOpen(false)}>
      <div
        className="command-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="search"
      >
        <div className="command-input-row">
          <span className="command-icon" aria-hidden>⌘</span>
          <input
            ref={inputRef}
            className="command-input"
            type="text"
            placeholder="search drops, navigate pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="command-kbd">esc</kbd>
        </div>

        <div className="command-results">
          {results.length > 0 ? (
            <div className="command-section">
              <p className="command-section-label">drops {loading ? "…" : ""}</p>
              {results.map((result, i) => (
                <button
                  key={result.id}
                  className={`command-item ${i === selectedIndex ? "command-item-active" : ""}`}
                  onClick={() => handleSelect(i)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  type="button"
                >
                  {result.posterSrc ? (
                    <img
                      src={result.posterSrc}
                      alt=""
                      className="command-item-poster"
                    />
                  ) : (
                    <span className="command-item-poster command-item-poster-placeholder">
                      {result.title.charAt(0)}
                    </span>
                  )}
                  <span className="command-item-info">
                    <span className="command-item-title">{result.title}</span>
                    <span className="command-item-meta">
                      {formatPrice(result.priceUsd)} · @{result.studioHandle}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {filteredLinks.length > 0 ? (
            <div className="command-section">
              <p className="command-section-label">pages</p>
              {filteredLinks.map((link, rawI) => {
                const i = results.length + rawI;
                return (
                  <button
                    key={link.href}
                    className={`command-item ${i === selectedIndex ? "command-item-active" : ""}`}
                    onClick={() => handleSelect(i)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    type="button"
                  >
                    <span className="command-item-info">
                      <span className="command-item-title">{link.label}</span>
                      <span className="command-item-meta">{link.section}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {!loading && query.trim() && results.length === 0 && filteredLinks.length === 0 ? (
            <p className="command-empty">no results for "{query}"</p>
          ) : null}
        </div>

        <div className="command-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>/</kbd> or <kbd>⌘K</kbd> to open</span>
        </div>
      </div>
    </div>
  );
}
