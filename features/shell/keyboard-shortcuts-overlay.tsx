"use client";

import { useCallback, useState } from "react";
import { useKeyboardShortcuts, SHORTCUT_SECTIONS } from "@/lib/hooks/use-keyboard-shortcuts";

export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  const toggleHelp = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useKeyboardShortcuts(toggleHelp);

  if (!open) return null;

  return (
    <div className="command-backdrop" onClick={() => setOpen(false)}>
      <div
        className="command-dialog shortcuts-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="keyboard shortcuts"
      >
        <div className="command-input-row">
          <span className="shortcuts-dialog-title">keyboard shortcuts</span>
          <kbd className="command-kbd" onClick={() => setOpen(false)} role="button">
            esc
          </kbd>
        </div>

        <div className="shortcuts-body">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.section} className="command-section">
              <p className="command-section-label">{section.section}</p>
              {section.items.map((item) => (
                <div key={item.keys} className="shortcuts-row">
                  <span className="shortcuts-label">{item.label}</span>
                  <span className="shortcuts-keys">
                    {item.keys.split(" ").map((k) => (
                      <kbd key={k} className="shortcuts-kbd">{k}</kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
