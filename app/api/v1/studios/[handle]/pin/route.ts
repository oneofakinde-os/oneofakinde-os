/**
 * POST /api/v1/studios/:handle/pin
 *
 * Sprint 1 — MKT-009: pin a drop to the top of the studio page.
 * Body: `{ dropId: string | null }` — null unpins.
 *
 * 403 — caller does not own the studio
 * 404 — studio or drop not found
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { forbidden, notFound, ok, type RouteContext } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type PinRouteParams = { handle: string };

export async function POST(request: Request, context: RouteContext<PinRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const params = await context.params;
  const handle = params.handle;
  if (guard.session.handle.toLowerCase() !== handle.toLowerCase()) {
    return forbidden("you can only pin drops to your own studio");
  }

  const body = (await request.json()) as Record<string, unknown>;
  const dropId = typeof body.dropId === "string" ? body.dropId : null;

  const result = await commerceBffService.pinDropToStudio(guard.session.accountId, dropId);
  if (!result) {
    return notFound("studio or drop not found");
  }

  return ok({ pinnedDropId: result.pinnedDropId ?? null });
}
