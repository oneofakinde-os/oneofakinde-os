import {
  badRequest,
  forbidden,
  getOptionalBodyString,
  getRequiredBodyString,
  getRequiredRouteParam,
  notFound,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";

type CommentRouteParams = {
  drop_id: string;
};

type CommentBody = {
  body?: string;
  parentCommentId?: string;
};

export async function POST(request: Request, context: RouteContext<CommentRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return notFound("drop not found");
  }

  const payload = await safeJson<CommentBody>(request);
  const body = getRequiredBodyString(payload as Record<string, unknown> | null, "body");
  if (!body) {
    return badRequest("comment body is required");
  }
  const parentCommentId = getOptionalBodyString(
    payload as Record<string, unknown> | null,
    "parentCommentId"
  );

  // Sprint 0.2 — block enforcement: blocked viewers cannot post comments.
  if (await commerceBffService.isViewerBlockedByDropStudio(guard.session.accountId, dropId)) {
    return forbidden("blocked");
  }

  const social = await commerceBffService.addTownhallComment(
    guard.session.accountId,
    dropId,
    body,
    parentCommentId
  );
  if (!social) {
    return notFound("drop not found");
  }

  return ok({ social }, 201);
}
