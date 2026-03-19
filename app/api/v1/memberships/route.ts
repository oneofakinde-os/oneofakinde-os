import { requireRequestSession } from "@/lib/bff/auth";
import type { MembershipEntitlementsResponse } from "@/lib/bff/contracts";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const entitlements = await commerceBffService.listMembershipEntitlements(
    guard.session.accountId
  );
  const activeEntitlements = entitlements.filter((entry) => entry.isActive);
  const worldScopedEntitlements = activeEntitlements.filter((entry) => entry.worldId !== null);

  return ok<MembershipEntitlementsResponse>({
    entitlements,
    opportunitySummary: {
      totalEntitlements: entitlements.length,
      activeEntitlements: activeEntitlements.length,
      worldScopedEntitlements: worldScopedEntitlements.length,
      studioScopedEntitlements: Math.max(0, activeEntitlements.length - worldScopedEntitlements.length)
    }
  });
}
