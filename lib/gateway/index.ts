import type { CommerceGateway } from "@/lib/domain/ports";
import { createBffGateway } from "@/lib/gateway/bff-client";
import { mockGateway } from "@/lib/gateway/mock-gateway";

export type GatewayProvider = "mock" | "bff";

// Fail-safe provider selection. The ungated mock is used ONLY when we can
// positively confirm a non-production runtime. If the environment is ambiguous
// (e.g. a production deploy missing its env vars), default to "bff" — the gated
// path — rather than silently exposing the ungated mock in production.
function isNonProductionRuntime(): boolean {
  const app = process.env.OOK_APP_ENV?.trim().toLowerCase();
  const vercel = process.env.VERCEL_ENV?.trim().toLowerCase();
  const node = process.env.NODE_ENV?.trim().toLowerCase();
  return (
    app === "development" ||
    app === "test" ||
    app === "preview" ||
    vercel === "preview" ||
    vercel === "development" ||
    (node === "development" && app !== "production" && vercel !== "production")
  );
}

export function resolveProvider(): GatewayProvider {
  const input = process.env.OOK_GATEWAY_PROVIDER?.trim().toLowerCase();
  if (input === "bff" || input === "mock") {
    return input; // explicit override always wins
  }

  return isNonProductionRuntime() ? "mock" : "bff"; // gated unless positively non-prod
}

export const gatewayProvider = resolveProvider();

export const gateway: CommerceGateway =
  gatewayProvider === "bff" ? createBffGateway() : mockGateway;
