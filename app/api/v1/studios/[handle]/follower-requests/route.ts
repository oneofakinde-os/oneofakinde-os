/**
 * POST /api/v1/studios/:handle/follower-requests
 *
 * Sprint 1 — SOC-024: request to follow a private studio.
 * Returns `{ status: "pending" | "approved" | "rejected" }`.
 *
 * PUT /api/v1/studios/:handle/follower-requests
 *
 * Sprint 1 — SOC-024: approve or reject a follower request.
 * Body: `{ requesterId: string, decision: "approved" | "rejected" }`
 *
 * 403 — not a private studio / caller is not the owner (for PUT)
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type FollowerRequestRouteParams = { handle: string };

export async function POST(request: Request, context: RouteContext<FollowerRequestRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const params = await context.params;
  const handle = params.handle;

  const result = await commerceBffService.requestFollowApproval(guard.session.accountId, handle);
  if (!result) {
    return notFound("studio not found or not private");
  }

  return ok(result);
}

export async function PUT(request: Request, context: RouteContext<FollowerRequestRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const params = await context.params;
  const handle = params.handle;
  if (guard.session.handle.toLowerCase() !== handle.toLowerCase()) {
    return forbidden("only the studio owner can manage follower requests");
  }

  const body = (await request.json()) as Record<string, unknown>;
  const requesterId = typeof body.requesterId === "string" ? body.requesterId : "";
  const decision = body.decision === "approved" || body.decision === "rejected" ? body.decision : null;

  if (!requesterId || !decision) {
    return badRequest("requesterId and decision (approved|rejected) are required");
  }

  const result = await commerceBffService.decideFollowerRequest(guard.session.accountId, requesterId, decision);
  if (!result) {
    return notFound("follower request not found");
  }

  return ok(result);
}
