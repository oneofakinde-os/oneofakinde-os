import { getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type Params = {
  handle: string;
};

export async function GET(_request: Request, context: RouteContext<Params>) {
  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return notFound("handle is required");
  }

  const collector = await commerceBffService.getCollectorPublic(handle);
  if (!collector) {
    return notFound("collector not found");
  }

  return ok({ collector });
}
