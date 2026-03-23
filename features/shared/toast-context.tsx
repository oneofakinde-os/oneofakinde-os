"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode
} from "react";

export type ToastVariant = "info" | "success" | "error" | "warning";

export type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
};

type ToastInput = {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  toasts: Toast[];
  addToast: (input: ToastInput) => string;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (input: ToastInput): string => {
      const id = `toast-${++counterRef.current}-${Date.now()}`;
      const duration = input.durationMs ?? DEFAULT_DURATION_MS;
      const toast: Toast = {
        id,
        message: input.message,
        variant: input.variant ?? "info",
        durationMs: duration
      };
      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

const NOOP_CONTEXT: ToastContextValue = {
  toasts: [],
  addToast: () => "",
  removeToast: () => {}
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context ?? NOOP_CONTEXT;
}
