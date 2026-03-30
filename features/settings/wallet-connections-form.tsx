"use client";

import { useState } from "react";
import type { WalletConnection } from "@/lib/domain/contracts";
import {
  connectWalletAction,
  disconnectWalletAction,
  verifyWalletAction
} from "@/app/(collector)/settings/apps/actions";

type WalletConnectionsFormProps = {
  wallets: WalletConnection[];
  statusMessage: string | null;
};

export function WalletConnectionsForm({ wallets, statusMessage }: WalletConnectionsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);

  const pendingWallets = wallets.filter((w) => w.status === "pending");
  const verifiedWallets = wallets.filter((w) => w.status === "verified");

  return (
    <>
      {/* ── Verified wallets ── */}
      {verifiedWallets.length > 0 && (
        <section className="slice-panel">
          <p className="slice-label">connected wallets</p>
          <div className="ops-settings-grid">
            {verifiedWallets.map((wallet) => (
              <div key={wallet.id} data-testid={`wallet-${wallet.id}`}>
                <dl className="slice-dl">
                  <dt>address</dt>
                  <dd className="slice-mono" style={{ wordBreak: "break-all" }}>
                    {wallet.address}
                  </dd>
                  <dt>chain</dt>
                  <dd>{wallet.chain}</dd>
                  {wallet.label && (
                    <>
                      <dt>label</dt>
                      <dd>{wallet.label}</dd>
                    </>
                  )}
                  <dt>verified</dt>
                  <dd>
                    {wallet.verifiedAt
                      ? new Date(wallet.verifiedAt).toLocaleDateString()
                      : "—"}
                  </dd>
                </dl>
                <form
                  action={async (formData: FormData) => {
                    setIsSubmitting(true);
                    try {
                      await disconnectWalletAction(formData);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  <input type="hidden" name="wallet_id" value={wallet.id} />
                  <button
                    type="submit"
                    className="slice-button ghost"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "disconnecting\u2026" : "disconnect"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Pending wallets awaiting verification ── */}
      {pendingWallets.map((wallet) => (
        <section key={wallet.id} className="slice-panel" data-testid={`wallet-pending-${wallet.id}`}>
          <p className="slice-label">verify wallet</p>
          <div className="ops-settings-grid">
            <p className="slice-copy">
              sign the challenge message below with your wallet to prove ownership.
            </p>
            <dl className="slice-dl">
              <dt>address</dt>
              <dd className="slice-mono" style={{ wordBreak: "break-all" }}>
                {wallet.address}
              </dd>
              <dt>chain</dt>
              <dd>{wallet.chain}</dd>
              <dt>challenge</dt>
              <dd className="slice-mono" style={{ wordBreak: "break-all", fontSize: "0.75rem" }}>
                {wallet.challenge}
              </dd>
            </dl>

            <form
              action={async (formData: FormData) => {
                setIsSubmitting(true);
                try {
                  await verifyWalletAction(formData);
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              <input type="hidden" name="wallet_id" value={wallet.id} />
              <label className="slice-label" htmlFor={`sig-${wallet.id}`}>
                signature
              </label>
              <input
                id={`sig-${wallet.id}`}
                name="signature"
                type="text"
                placeholder="0x..."
                required
                minLength={3}
                className="slice-input"
                data-testid="wallet-signature-input"
              />
              <button
                type="submit"
                className="slice-button"
                disabled={isSubmitting}
                data-testid="wallet-verify-button"
              >
                {isSubmitting ? "verifying\u2026" : "verify wallet"}
              </button>
            </form>
          </div>
        </section>
      ))}

      {/* ── Connect new wallet ── */}
      <section className="slice-panel">
        <p className="slice-label">
          {wallets.length === 0 ? "wallet connections" : "add wallet"}
        </p>
        <div className="ops-settings-grid">
          {wallets.length === 0 && (
            <p className="slice-copy">
              no wallets connected. connect a wallet to enable on-chain features
              like certificate verification and resale listings.
            </p>
          )}

          {statusMessage && <p className="slice-meta">{statusMessage}</p>}

          {showConnectForm ? (
            <form
              action={async (formData: FormData) => {
                setIsSubmitting(true);
                try {
                  await connectWalletAction(formData);
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              <label className="slice-label" htmlFor="wallet-chain">
                chain
              </label>
              <select
                id="wallet-chain"
                name="chain"
                required
                className="slice-input"
                data-testid="wallet-chain-select"
              >
                <option value="ethereum">ethereum</option>
                <option value="tezos">tezos</option>
                <option value="polygon">polygon</option>
              </select>

              <label className="slice-label" htmlFor="wallet-address">
                wallet address
              </label>
              <input
                id="wallet-address"
                name="address"
                type="text"
                placeholder="0x..."
                required
                minLength={10}
                className="slice-input"
                data-testid="wallet-address-input"
              />

              <label className="slice-label" htmlFor="wallet-label">
                label (optional)
              </label>
              <input
                id="wallet-label"
                name="label"
                type="text"
                placeholder="e.g. main wallet"
                className="slice-input"
              />

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  className="slice-button"
                  disabled={isSubmitting}
                  data-testid="wallet-connect-submit"
                >
                  {isSubmitting ? "connecting\u2026" : "connect wallet"}
                </button>
                <button
                  type="button"
                  className="slice-button ghost"
                  onClick={() => setShowConnectForm(false)}
                >
                  cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="slice-button"
              onClick={() => setShowConnectForm(true)}
              data-testid="wallet-connect-button"
            >
              connect wallet
            </button>
          )}
        </div>
      </section>
    </>
  );
}
