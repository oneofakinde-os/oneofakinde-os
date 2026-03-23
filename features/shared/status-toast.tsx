"use client";

import { useEffect, useRef } from "react";
import { useToast, type ToastVariant } from "./toast-context";

type StatusToastProps = {
  status: string | null;
  messages: Record<string, { message: string; variant: ToastVariant }>;
};

/**
 * Fires a toast on mount when `status` matches a key in `messages`.
 * Renders nothing visible — purely a side-effect component.
 */
export function StatusToast({ status, messages }: StatusToastProps) {
  const { addToast } = useToast();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!status || firedRef.current) return;
    const config = messages[status];
    if (config) {
      addToast(config);
      firedRef.current = true;
    }
  }, [status, messages, addToast]);

  return null;
}
