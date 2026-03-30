import { requireRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

/**
 * GET /api/v1/account/offers
 *
 * Returns all offers (listings) submitted by the authenticated collector.
 */
export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const listings = await commerceBffService.listCollectorOffers(guard.session.accountId);
  return ok({ listings });
}
