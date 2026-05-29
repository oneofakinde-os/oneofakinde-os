import { requireRequestSession } from "@/lib/bff/auth";
import { notFound, ok } from "@/lib/bff/http";
import { checkRateLimit, RATE_LIMITS } from "@/lib/bff/rate-limit";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const rl = checkRateLimit(request, RATE_LIMITS.authenticated, "viewer-vault-get", guard.session.accountId);
  if (!rl.ok) return rl.response;

  const url = new URL(request.url);
  const targetAccountId =
    url.searchParams.get("accountId")?.trim() || guard.session.accountId;

  const vault = await commerceBffService.getVaultProjection(
    guard.session.accountId,
    targetAccountId
  );

  if (!vault) return notFound();
  return ok({ vault });
}
