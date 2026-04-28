/**
 * Wallet signature verification.
 *
 * Verifies that a signature over the given challenge message was produced by
 * the holder of the claimed wallet address.
 *
 * Currently real verification is implemented for ethereum and polygon (both
 * use secp256k1 / EIP-191 `personal_sign`). Tezos remains a mock until we
 * add a tezos verifier (likely via @taquito/utils).
 *
 * Tests can opt into a mock-friendly mode by setting OOK_WALLET_SIGNATURES=mock,
 * which preserves the previous "any signature longer than 3 chars verifies"
 * behaviour. This keeps the existing wallet-connection lifecycle proof tests
 * working without forcing every call site to produce a valid sig.
 */

import { verifyMessage, isAddress, getAddress } from "viem";
import type { WalletChain } from "@/lib/domain/contracts";

export type WalletSignatureMode = "real" | "mock";

/**
 * Resolve which signature mode to use.
 * - `real` (default): real cryptographic verification for chains we support.
 * - `mock` (opt-in via env): permissive verification used by legacy proof tests.
 */
export function resolveWalletSignatureMode(): WalletSignatureMode {
  const raw = process.env.OOK_WALLET_SIGNATURES?.trim().toLowerCase();
  return raw === "mock" ? "mock" : "real";
}

/**
 * Mock verification: matches the legacy behaviour. Used when running in mock
 * mode, or as the implementation for chains we don't yet support cryptographically.
 */
export function mockVerifySignature(signature: string): boolean {
  return typeof signature === "string" && signature.length >= 3;
}

/**
 * Verify a `personal_sign` signature for an Ethereum-style wallet.
 *
 * Returns `true` only when the recovered address from the signed message
 * exactly matches `address` (case-insensitive — addresses are normalised
 * via EIP-55 checksum casing for comparison).
 *
 * Any malformed input (bad hex, wrong length, etc.) returns `false` rather
 * than throwing — callers treat this as a verification failure.
 */
export async function verifyEthereumSignature(input: {
  address: string;
  message: string;
  signature: string;
}): Promise<boolean> {
  const { address, message, signature } = input;
  if (!isAddress(address)) {
    return false;
  }
  if (typeof signature !== "string" || !signature.startsWith("0x")) {
    return false;
  }
  try {
    return await verifyMessage({
      address: getAddress(address),
      message,
      signature: signature as `0x${string}`
    });
  } catch {
    return false;
  }
}

/**
 * Top-level verification entry point used by the BFF.
 *
 * Dispatches per chain and per mode. Returns `true` when the signature is
 * valid for the given wallet+challenge, `false` otherwise.
 */
export async function verifyWalletSignature(input: {
  chain: WalletChain;
  address: string;
  message: string;
  signature: string;
  mode?: WalletSignatureMode;
}): Promise<boolean> {
  const mode = input.mode ?? resolveWalletSignatureMode();

  // Mock mode is a single permissive check across every chain.
  if (mode === "mock") {
    return mockVerifySignature(input.signature);
  }

  // Real mode: dispatch by chain.
  switch (input.chain) {
    case "ethereum":
    case "polygon":
      return verifyEthereumSignature({
        address: input.address,
        message: input.message,
        signature: input.signature
      });

    case "tezos":
      // TODO: implement tezos signature verification (ed25519 via @taquito/utils
      // or noble/curves). For now fall back to the permissive mock so we don't
      // break verified tezos wallets that were stored before this change.
      return mockVerifySignature(input.signature);
  }
}
