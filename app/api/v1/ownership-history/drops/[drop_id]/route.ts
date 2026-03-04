import { commerceBffService } from "@/lib/bff/service";
import {
  badRequest,
  getRequiredRouteParam,
  notFound,
  ok,
  type RouteContext
} from "@/lib/bff/http";

type Params = {
  drop_id: string;
};

export async function GET(_request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  const history = await commerceBffService.getDropOwnershipHistory(dropId);
  if (!history) {
    return notFound("drop ownership history not found");
  }

  return ok({ history });
}
