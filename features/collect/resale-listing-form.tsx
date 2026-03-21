"use client";

import { formatUsd } from "@/features/shared/format";
import { useState } from "react";

type ResaleListingFormProps = {
  dropId: string;
  dropTitle: string;
  originalPriceUsd: number;
};

type FormState = "idle" | "submitting" | "success" | "error";

export function ResaleListingForm({
  dropId,
  dropTitle,
  originalPriceUsd
}: ResaleListingFormProps) {
  const [askingPrice, setAskingPrice] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const suggestedMin = originalPriceUsd;
  const suggestedMax = Number((originalPriceUsd * 1.5).toFixed(2));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = Number(askingPrice);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormState("error");
      setErrorMessage("please enter a valid price greater than zero.");
      return;
    }

    setFormState("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/collect/offers/${encodeURIComponent(dropId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_resale_fixed_offer",
          amountUsd: parsed
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "request failed" }));
        setFormState("error");
        setErrorMessage((body as { error?: string }).error ?? "failed to list for resale.");
        return;
      }

      setFormState("success");
    } catch {
      setFormState("error");
      setErrorMessage("network error. please try again.");
    }
  }

  if (formState === "success") {
    return (
      <section className="slice-panel" data-testid="resale-listing-success">
        <p className="slice-label">resale listing</p>
        <p className="slice-copy">
          {dropTitle} has been listed for resale at {formatUsd(Number(askingPrice))}.
        </p>
      </section>
    );
  }

  return (
    <section className="slice-panel" data-testid="resale-listing-form">
      <p className="slice-label">list for resale</p>
      <h2 className="slice-title">{dropTitle}</h2>
      <p className="slice-copy">
        original price: {formatUsd(originalPriceUsd)}
      </p>
      <p className="slice-meta">
        suggested range: {formatUsd(suggestedMin)} &ndash; {formatUsd(suggestedMax)} (1x&ndash;1.5x original)
      </p>

      <form onSubmit={handleSubmit} className="slice-form">
        <label className="slice-label" htmlFor="resale-asking-price">
          asking price (USD)
        </label>
        <input
          id="resale-asking-price"
          className="slice-input"
          type="number"
          min="0.01"
          step="0.01"
          placeholder={String(originalPriceUsd)}
          value={askingPrice}
          onChange={(e) => setAskingPrice(e.target.value)}
          disabled={formState === "submitting"}
          required
        />

        {formState === "error" && errorMessage ? (
          <p className="slice-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="slice-button-row">
          <button
            type="submit"
            className="slice-button alt"
            disabled={formState === "submitting"}
          >
            {formState === "submitting" ? "listing..." : "confirm listing"}
          </button>
        </div>
      </form>
    </section>
  );
}
