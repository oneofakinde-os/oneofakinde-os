import { getRequiredRouteParam, notFound, ok, safeJson, type RouteContext } from "@/lib/bff/http";
import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import { isReportCategory } from "@/lib/domain/social-engagement";

type CommentReportRouteParams = {
  drop_id: string;
  comment_id: string;
};

type CommentReportBody = {
  category?: string;
};

export async function POST(
  request: Request,
  context: RouteContext<CommentReportRouteParams>
) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const dropId = await getRequiredRouteParam(context, "drop_id");
  const commentId = await getRequiredRouteParam(context, "comment_id");
  if (!dropId || !commentId) {
    return notFound("comment not found");
  }

  const payload = await safeJson<CommentReportBody>(request);
  const category = isReportCategory(payload?.category) ? payload.category : undefined;

  const social = await commerceBffService.reportTownhallComment(
    guard.session.accountId,
    dropId,
    commentId,
    category
  );
  if (!social) {
    return notFound("comment not found");
  }

  return ok({ social }, 201);
}
