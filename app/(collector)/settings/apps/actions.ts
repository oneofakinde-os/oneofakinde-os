"use server";

import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import type { WalletChain } from "@/lib/domain/contracts";
import type { Route } from "next";
import { redirect } from "next/navigation";

function appsRedirect(params: string): never {
  redirect(`/settings/apps?${params}` as Route);
}

export async function connectWalletAction(formData: FormData): Promise<void> {
  const session = await requireSession("/settings/apps");
  const address = String(formData.get("address") ?? "").trim();
  const chain = String(formData.get("chain") ?? "").trim() as WalletChain;
  const label = String(formData.get("label") ?? "").trim() || undefined;

  if (!address || address.length < 10) {
    appsRedirect("wallet_status=invalid_address");
  }
  if (!["ethereum", "tezos", "polygon"].includes(chain)) {
    appsRedirect("wallet_status=invalid_chain");
  }

  const wallet = await gateway.connectWallet(session.accountId, { address, chain, label });
  if (!wallet) {
    appsRedirect("wallet_status=connect_failed");
  }
  appsRedirect(`wallet_status=connected&wallet_id=${encodeURIComponent(wallet.id)}`);
}

export async function verifyWalletAction(formData: FormData): Promise<void> {
  const session = await requireSession("/settings/apps");
  const walletId = String(formData.get("wallet_id") ?? "").trim();
  const signature = String(formData.get("signature") ?? "").trim();

  if (!walletId) {
    appsRedirect("wallet_status=missing_wallet_id");
  }
  if (!signature || signature.length < 3) {
    appsRedirect("wallet_status=invalid_signature");
  }

  const wallet = await gateway.verifyWalletConnection(session.accountId, walletId, signature);
  if (!wallet) {
    appsRedirect("wallet_status=verify_failed");
  }
  appsRedirect("wallet_status=verified");
}

export async function disconnectWalletAction(formData: FormData): Promise<void> {
  const session = await requireSession("/settings/apps");
  const walletId = String(formData.get("wallet_id") ?? "").trim();

  if (!walletId) {
    appsRedirect("wallet_status=missing_wallet_id");
  }

  const disconnected = await gateway.disconnectWallet(session.accountId, walletId);
  if (!disconnected) {
    appsRedirect("wallet_status=disconnect_failed");
  }
  appsRedirect("wallet_status=disconnected");
}
