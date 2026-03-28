import { getRequiredRouteParam, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type Params = { session_id: string };

export async function GET(_request: Request, context: RouteContext<Params>) {
  const sessionId = await getRequiredRouteParam(context, "session_id");
  if (!sessionId) return notFound("session_id is required");

  const liveSession = await commerceBffService.getLiveSessionById(sessionId);
  if (!liveSession) return notFound("live session not found");

  return ok({ liveSession });
}
