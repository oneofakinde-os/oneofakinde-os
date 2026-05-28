import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import {
  badRequest,
  getRequiredRouteParam,
  notFound,
  ok,
  safeJson,
  unprocessableEntity,
  type RouteContext
} from "@/lib/bff/http";
import { emitOperationalEvent } from "@/lib/ops/observability";

type Params = {
  drop_id: string;
};

type CheckoutSessionBody = {
  successUrl?: string;
  cancelUrl?: string;
};

export async function GET(request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const checkout = await commerceBffService.getCheckoutPreview(guard.session.accountId, dropId);
  if (!checkout) {
    emitOperationalEvent("checkout_preview_missing", { dropId });
    return notFound("checkout not found");
  }

  emitOperationalEvent("checkout_preview_loaded", {
    dropId,
    accountId: guard.session.accountId
  });

  return ok({ checkout });
}

export async function POST(request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await safeJson<CheckoutSessionBody>(request);

  const preconditions = await commerceBffService.validateCollectPreconditions(
    guard.session.accountId,
    dropId
  );
  if (!preconditions.valid) {
    emitOperationalEvent("checkout_preconditions_failed", {
      dropId,
      accountId: guard.session.accountId,
      reasons: preconditions.blockingReasons
    });
    return unprocessableEntity("collect preconditions not met", preconditions.blockingReasons);
  }

  const checkoutSession = await commerceBffService.createCheckoutSession({
    accountId: guard.session.accountId,
    dropId,
    successUrl:
      typeof payload?.successUrl === "string" ? payload.successUrl : undefined,
    cancelUrl:
      typeof payload?.cancelUrl === "string" ? payload.cancelUrl : undefined
  });

  if (!checkoutSession) {
    emitOperationalEvent("checkout_session_unavailable", { dropId });
    return notFound("checkout session not available");
  }

  emitOperationalEvent("checkout_session_created", {
    dropId,
    accountId: guard.session.accountId,
    status: checkoutSession.status,
    provider: checkoutSession.status === "pending" ? checkoutSession.provider : "existing"
  });

  return ok({ checkoutSession }, 201);
}
