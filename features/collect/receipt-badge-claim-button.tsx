"use client";

import type { ReceiptBadge } from "@/lib/domain/contracts";
import { useState } from "react";

type ReceiptBadgeClaimButtonProps = {
  receiptId: string;
  existingBadge?: ReceiptBadge | null;
  onBadgeClaimed?: (badge: ReceiptBadge) => void;
};

export function ReceiptBadgeClaimButton({
  receiptId,
  existingBadge = null,
  onBadgeClaimed
}: ReceiptBadgeClaimButtonProps) {
  const [badge, setBadge] = useState<ReceiptBadge | null>(existingBadge);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState("");

  if (badge) {
    return (
      <div className="receipt-badge-claim-done" data-testid="receipt-badge-claim-done">
        <span className="receipt-badge-claim-check" aria-hidden="true">◆</span>
        <span>badge claimed</span>
      </div>
    );
  }

  async function handleClaim() {
    setIsClaiming(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/receipts/${receiptId}/badge`, {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "failed to claim badge");
      }
      const data = (await response.json()) as { badge: ReceiptBadge };
      setBadge(data.badge);
      onBadgeClaimed?.(data.badge);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to claim badge");
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <div className="receipt-badge-claim" data-testid="receipt-badge-claim">
      <button
        type="button"
        className="receipt-badge-claim-button"
        onClick={() => { void handleClaim(); }}
        disabled={isClaiming}
      >
        {isClaiming ? "claiming..." : "claim collect badge"}
      </button>
      {error ? <p className="receipt-badge-claim-error">{error}</p> : null}
    </div>
  );
}
