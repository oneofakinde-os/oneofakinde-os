export type WalletConnection = {
  accountId: string;
  walletAddress: string;
  chain: "ethereum" | "base_l2" | "polygon";
  connectedAt: string;
  status: "connected" | "disconnected";
};

export type OnChainAnchoringRequest = {
  receiptId: string;
  accountId: string;
  chain: "base_l2";
  status: "pending" | "submitted" | "confirmed" | "failed";
  txHash: string | null;
  requestedAt: string;
  confirmedAt: string | null;
};

export function isAnchoringComplete(request: OnChainAnchoringRequest): boolean {
  return request.status === "confirmed" && request.txHash !== null;
}

export type Web3BridgeCapability =
  | "wallet_connection"
  | "receipt_signing"
  | "receipt_export"
  | "certificate_verification"
  | "on_chain_anchoring";

export const WEB3_BRIDGE_CAPABILITIES: readonly Web3BridgeCapability[] = [
  "wallet_connection",
  "receipt_signing",
  "receipt_export",
  "certificate_verification",
  "on_chain_anchoring",
] as const;

export const WEB3_BRIDGE_LATENT_NOTE =
  "web3 bridge capabilities are built as latent web2 features first. " +
  "wallet connection exists but does not gate any functionality. " +
  "on-chain anchoring is collector-initiated and optional.";
