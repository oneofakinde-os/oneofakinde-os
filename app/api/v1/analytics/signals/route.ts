import { ok, badRequest } from "@/lib/bff/http";
import { gateway } from "@/lib/gateway";
import { commerceBffService } from "@/lib/bff/service";
import {
  resolveEngagementSignals,
  resolveTelemetrySignals
} from "@/lib/ranking/engine";

/**
 * GET /api/v1/analytics/signals?dropIds=id1,id2,...
 *
 * Returns combined engagement + telemetry signals for the requested drops.
 * Uses mock baselines where real pipeline data isn't available yet.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dropIdsParam = url.searchParams.get("dropIds");

  if (!dropIdsParam) {
    return badRequest("dropIds query parameter is required");
  }

  const dropIds = dropIdsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (dropIds.length === 0) {
    return badRequest("at least one drop ID is required");
  }

  if (dropIds.length > 50) {
    return badRequest("max 50 drop IDs per request");
  }

  const allDrops = await gateway.listDrops();
  const dropsById = new Map(allDrops.map((d) => [d.id, d]));

  const telemetryByDropId = await commerceBffService.getTownhallTelemetrySignals(dropIds);

  const signals: Record<
    string,
    {
      engagement: ReturnType<typeof resolveEngagementSignals>;
      telemetry: ReturnType<typeof resolveTelemetrySignals>;
    }
  > = {};

  for (const dropId of dropIds) {
    const drop = dropsById.get(dropId);
    if (!drop) {
      continue;
    }

    signals[dropId] = {
      engagement: resolveEngagementSignals(drop),
      telemetry: resolveTelemetrySignals(telemetryByDropId[dropId])
    };
  }

  return ok({ signals });
}
