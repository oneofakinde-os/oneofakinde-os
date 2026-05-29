import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const studioHandle = url.searchParams.get("studio") ?? guard.session.handle;

  const marketData = await commerceBffService.getCreatorMarketData(
    guard.session.accountId,
    studioHandle
  );

  if (!marketData) return forbidden("only the studio owner can access market data");
  return ok(marketData);
}
