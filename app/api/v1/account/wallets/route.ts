import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { WalletChain } from "@/lib/domain/contracts";

const VALID_CHAINS: WalletChain[] = ["ethereum", "tezos", "polygon"];

/**
 * GET /api/v1/account/wallets
 *
 * Returns all active wallet connections for the authenticated user.
 */
export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const wallets = await commerceBffService.listWalletConnections(guard.session.accountId);
  return ok({ wallets });
}

type WalletActionBody = {
  action: "connect" | "verify" | "disconnect";
  address?: string;
  chain?: string;
  label?: string;
  walletId?: string;
  signature?: string;
};

/**
 * POST /api/v1/account/wallets
 *
 * Manages wallet connections: connect, verify, or disconnect.
 */
export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const body = await safeJson<WalletActionBody>(request);
  if (!body || !body.action) {
    return badRequest("JSON body with action (connect | verify | disconnect) is required");
  }

  const { accountId } = guard.session;

  if (body.action === "connect") {
    if (typeof body.address !== "string" || body.address.length < 10) {
      return badRequest("address must be a valid wallet address");
    }
    if (!body.chain || !VALID_CHAINS.includes(body.chain as WalletChain)) {
      return badRequest(`chain must be one of: ${VALID_CHAINS.join(", ")}`);
    }
    const wallet = await commerceBffService.connectWallet(accountId, {
      address: body.address,
      chain: body.chain as WalletChain,
      label: body.label
    });
    if (!wallet) {
      return badRequest("could not connect wallet — address may already be linked");
    }
    return ok({ wallet });
  }

  if (body.action === "verify") {
    if (typeof body.walletId !== "string") {
      return badRequest("walletId is required");
    }
    if (typeof body.signature !== "string" || body.signature.length < 3) {
      return badRequest("signature is required");
    }
    const wallet = await commerceBffService.verifyWalletConnection(
      accountId,
      body.walletId,
      body.signature
    );
    if (!wallet) {
      return badRequest("verification failed — wallet may not be pending or signature is invalid");
    }
    return ok({ wallet });
  }

  if (body.action === "disconnect") {
    if (typeof body.walletId !== "string") {
      return badRequest("walletId is required");
    }
    const disconnected = await commerceBffService.disconnectWallet(accountId, body.walletId);
    if (!disconnected) {
      return badRequest("could not disconnect wallet — no active connection found");
    }
    return ok({ disconnected: true });
  }

  return badRequest("unknown action");
}
