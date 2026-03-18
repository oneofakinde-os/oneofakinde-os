import { getRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import { badRequest, getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";

type Params = {
  drop_id: string;
};

export async function GET(request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  const session = await getRequestSession(request);
  const drop = await commerceBffService.getDropById(dropId, session?.accountId ?? null);
  if (!drop) {
    return notFound("drop not found");
  }

  return ok({ drop });
}
