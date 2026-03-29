"use client";

import { useState } from "react";

type WithdrawListingButtonProps = {
  dropId: string;
  offerId: string;
};

type WithdrawState = "idle" | "confirming" | "submitting" | "withdrawn" | "error";

export function WithdrawListingButton({ dropId, offerId }: WithdrawListingButtonProps) {
  const [state, setState] = useState<WithdrawState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleWithdraw() {
    setState("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/collect/offers/${encodeURIComponent(dropId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdraw_offer",
          offerId
        })
      });

      if (!response.ok) {
        setState("error");
        setErrorMessage("could not withdraw listing. it may have already been settled.");
        return;
      }

      setState("withdrawn");
    } catch {
      setState("error");
      setErrorMessage("network error. please try again.");
    }
  }

  if (state === "withdrawn") {
    return (
      <p className="slice-copy" data-testid="withdraw-success">
        listing withdrawn successfully.
      </p>
    );
  }

  if (state === "confirming") {
    return (
      <div className="slice-button-row" data-testid="withdraw-confirm">
        <button
          type="button"
          className="slice-button"
          onClick={handleWithdraw}
        >
          confirm withdraw
        </button>
        <button
          type="button"
          className="slice-button ghost"
          onClick={() => setState("idle")}
        >
          cancel
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="slice-button ghost"
        onClick={() => setState("confirming")}
        data-testid="withdraw-button"
      >
        withdraw listing
      </button>
      {state === "error" && errorMessage && (
        <p className="slice-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
