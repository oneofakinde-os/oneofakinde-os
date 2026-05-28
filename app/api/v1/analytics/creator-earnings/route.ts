import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role required");
  }

  const [summary, records] = await Promise.all([
    commerceBffService.getCreatorEarningsSummary(guard.session.handle),
    commerceBffService.getCreatorEarnings(guard.session.handle)
  ]);

  return ok({
    studioHandle: guard.session.handle,
    summary,
    earnings: records.map((r) => ({
      id: r.id,
      dropId: r.dropId,
      receiptId: r.receiptId,
      ledgerTransactionId: r.ledgerTransactionId,
      grossAmountUsd: r.grossAmountUsd,
      platformFeeUsd: r.platformFeeUsd,
      netAmountUsd: r.netAmountUsd,
      payoutStatus: r.payoutStatus,
      createdAt: r.createdAt
    }))
  });
}
