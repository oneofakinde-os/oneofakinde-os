"use client";

import { useState, type FormEvent } from "react";

type RefundPayload = {
  paymentId: string;
  receiptId: string | null;
  dropId: string;
  status: "refunded";
  alreadyRefunded: boolean;
  ownershipRevoked: boolean;
};

type RefundApiResponse = {
  refund: RefundPayload;
};

type RefundErrorResponse = {
  error: string;
};

export function RefundHandlingPanel() {
  const [paymentId, setPaymentId] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RefundPayload | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const normalizedPaymentId = paymentId.trim();
    const normalizedReceiptId = receiptId.trim();
    if (!normalizedPaymentId && !normalizedReceiptId) {
      setError("enter payment id or receipt id");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/v1/payments/refund", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          paymentId: normalizedPaymentId || undefined,
          receiptId: normalizedReceiptId || undefined
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as RefundErrorResponse | null;
        setError(payload?.error ?? "refund request failed");
        return;
      }

      const payload = (await response.json()) as RefundApiResponse;
      setResult(payload.refund);
      setPaymentId(payload.refund.paymentId);
      if (payload.refund.receiptId) {
        setReceiptId(payload.refund.receiptId);
      }
    } catch {
      setError("network error while submitting refund");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="slice-form" onSubmit={onSubmit}>
      <label className="slice-field">
        payment id
        <input
          className="slice-input"
          type="text"
          value={paymentId}
          onChange={(event) => setPaymentId(event.target.value)}
          placeholder="pay_..."
          autoComplete="off"
        />
      </label>

      <label className="slice-field">
        receipt id
        <input
          className="slice-input"
          type="text"
          value={receiptId}
          onChange={(event) => setReceiptId(event.target.value)}
          placeholder="rcpt_..."
          autoComplete="off"
        />
      </label>

      <div className="slice-button-row">
        <button type="submit" className="slice-button" disabled={isSubmitting}>
          {isSubmitting ? "processing..." : "refund payment"}
        </button>
      </div>

      {error ? <p className="slice-error">{error}</p> : null}

      {result ? (
        <>
          <p className="slice-banner">
            {result.alreadyRefunded ? "payment already refunded" : "payment refunded"}
          </p>
          <dl className="slice-list">
            <div>
              <dt>payment id</dt>
              <dd>{result.paymentId}</dd>
            </div>
            <div>
              <dt>receipt id</dt>
              <dd>{result.receiptId ?? "none"}</dd>
            </div>
            <div>
              <dt>entitlement revoked</dt>
              <dd>{result.ownershipRevoked ? "yes" : "no"}</dd>
            </div>
          </dl>
        </>
      ) : null}
    </form>
  );
}
