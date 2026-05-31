import type { CommerceGateway } from "@/lib/domain/ports";
import { createBffGateway } from "@/lib/gateway/bff-client";
import { mockGateway } from "@/lib/gateway/mock-gateway";

export type GatewayProvider = "mock" | "bff";

// Gated-by-default provider selection. The bff path routes the ENTIRE UI loop through
// commerceBffService (the market-law gates) — in prod via the deployment host, in
// dev/preview by self-calling the app's own API routes. The ungated mock is a
// deliberate opt-in (fast local iteration, adapter tests) requested explicitly via
// OOK_GATEWAY_PROVIDER=mock.
//
// This completes the fail-safe from dd8f6c9: "gated by default" now holds in EVERY
// runtime. Previously non-prod defaulted to the ungated mock — which, because the
// terms-step writes through commerceBffService but mock-mode collect reads a separate
// in-memory store, let a preview report a term-less drop as collectable. There is no
// such silent split now: every runtime defaults to the one gated service.
export function resolveProvider(): GatewayProvider {
  const input = process.env.OOK_GATEWAY_PROVIDER?.trim().toLowerCase();
  if (input === "bff" || input === "mock") {
    return input; // explicit override always wins
  }

  return "bff"; // gated by default everywhere; the ungated mock is opt-in only
}

export const gatewayProvider = resolveProvider();

export const gateway: CommerceGateway =
  gatewayProvider === "bff" ? createBffGateway() : mockGateway;
