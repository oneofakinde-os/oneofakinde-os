import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import {
  badRequest,
  conflict,
  forbidden,
  getRequiredRouteParam,
  notFound,
  ok,
  type RouteContext
} from "@/lib/bff/http";

type Params = {
  receipt_id: string;
};

export async function POST(request: Request, context: RouteContext<Params>) {
  const receiptId = await getRequiredRouteParam(context, "receipt_id");
  if (!receiptId) {
    return badRequest("receipt_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("collector")) {
    return forbidden("collector role is required");
  }

  const result = await commerceBffService.createReceiptBadge(guard.session.accountId, receiptId);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return notFound("receipt not found");
    }

    if (result.reason === "conflict") {
      return conflict("badge already exists");
    }

    return forbidden("receipt does not belong to this account");
  }

  return ok({ badge: result.badge }, 201);
}
