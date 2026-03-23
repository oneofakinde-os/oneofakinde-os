"use client";

import { useToast, type ToastVariant } from "./toast-context";

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string }> = {
  info: { bg: "var(--panel, #0d1b2a)", border: "var(--accent, #2a6a7a)" },
  success: { bg: "var(--panel, #0d1b2a)", border: "#2a7a4a" },
  error: { bg: "var(--panel, #0d1b2a)", border: "var(--danger, #c33)" },
  warning: { bg: "var(--panel, #0d1b2a)", border: "#c9a227" }
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        maxWidth: 360,
        pointerEvents: "none"
      }}
    >
      {toasts.map((toast) => {
        const style = VARIANT_STYLES[toast.variant];
        return (
          <div
            key={toast.id}
            style={{
              background: style.bg,
              borderLeft: `3px solid ${style.border}`,
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              color: "var(--text, #e0e8f0)",
              fontSize: "0.875rem",
              lineHeight: 1.4,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              pointerEvents: "auto",
              cursor: "pointer",
              animation: "toast-slide-in 0.25s ease-out"
            }}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
