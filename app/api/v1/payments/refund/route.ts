import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import {
  badRequest,
  conflict,
  forbidden,
  getOptionalBodyString,
  notFound,
  ok,
  safeJson
} from "@/lib/bff/http";
import { emitOperationalEvent } from "@/lib/ops/observability";

type RefundPaymentBody = {
  paymentId?: string;
  receiptId?: string;
};

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const payload = (await safeJson<RefundPaymentBody>(request)) as Record<string, unknown> | null;
  const paymentId = getOptionalBodyString(payload, "paymentId") ?? "";
  const receiptId = getOptionalBodyString(payload, "receiptId") ?? "";

  if (!paymentId && !receiptId) {
    return badRequest("paymentId or receiptId is required");
  }

  const result = await commerceBffService.refundPaymentForCreator(guard.session.accountId, {
    paymentId,
    receiptId
  });

  if (!result.ok) {
    emitOperationalEvent("payment_refund_failed", {
      reason: result.reason,
      paymentId,
      receiptId
    });

    if (result.reason === "forbidden") {
      return forbidden("you cannot refund this payment");
    }
    if (result.reason === "not_found") {
      return notFound("payment not found");
    }
    if (result.reason === "not_refundable") {
      return conflict("payment is not refundable");
    }
    return badRequest("paymentId or receiptId is required");
  }

  emitOperationalEvent("payment_refunded_by_creator", {
    paymentId: result.paymentId,
    receiptId: result.receiptId,
    dropId: result.dropId,
    alreadyRefunded: result.alreadyRefunded,
    ownershipRevoked: result.ownershipRevoked
  });

  return ok({
    refund: result
  });
}
