import { requireRequestSession } from "@/lib/bff/auth";
import {
  badRequest,
  getRequiredBodyString,
  getRequiredRouteParam,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { WorldCollectBundleType } from "@/lib/domain/contracts";

type CollectWorldBundleRouteParams = {
  world_id: string;
};

type PostCollectWorldBundleBody = {
  bundleType?: string;
};

function parseBundleType(value: string | null): WorldCollectBundleType | null {
  if (value === "current_only" || value === "season_pass_window" || value === "full_world") {
    return value;
  }

  return null;
}

export async function POST(
  request: Request,
  context: RouteContext<CollectWorldBundleRouteParams>
) {
  const worldId = await getRequiredRouteParam(context, "world_id");
  if (!worldId) {
    return badRequest("world_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const body = (await safeJson<PostCollectWorldBundleBody>(request)) as Record<string, unknown> | null;
  const bundleType = parseBundleType(getRequiredBodyString(body, "bundleType"));
  if (!bundleType) {
    return badRequest("bundleType is required");
  }

  const collected = await commerceBffService.collectWorldBundle({
    accountId: guard.session.accountId,
    worldId,
    bundleType
  });

  if (!collected) {
    return badRequest("world bundle collect rejected");
  }

  const snapshot = await commerceBffService.getCollectWorldBundlesForWorld(
    guard.session.accountId,
    worldId
  );

  return ok(
    {
      snapshot,
      result: collected
    },
    201
  );
}
