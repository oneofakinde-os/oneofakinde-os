import { forbidden, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";

type CommentRestrictRouteParams = {
  drop_id: string;
  comment_id: string;
};

export async function POST(
  request: Request,
  context: RouteContext<CommentRestrictRouteParams>
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

  const result = await commerceBffService.restrictTownhallComment(
    guard.session.accountId,
    dropId,
    commentId
  );
  if (!result.ok) {
    return result.reason === "forbidden"
      ? forbidden("not allowed to restrict this comment")
      : notFound("comment not found");
  }

  return ok({ social: result.social });
}
