import { requireRequestSession } from "@/lib/bff/auth";
import {
  badRequest,
  getRequiredRouteParam,
  ok,
  type RouteContext
} from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { WorldCollectBundleType } from "@/lib/domain/contracts";

type CollectWorldUpgradePreviewRouteParams = {
  world_id: string;
};

function parseBundleType(value: string | null): WorldCollectBundleType | null {
  if (value === "current_only" || value === "season_pass_window" || value === "full_world") {
    return value;
  }

  return null;
}

export async function GET(
  request: Request,
  context: RouteContext<CollectWorldUpgradePreviewRouteParams>
) {
  const worldId = await getRequiredRouteParam(context, "world_id");
  if (!worldId) {
    return badRequest("world_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const bundleType = parseBundleType(url.searchParams.get("target_bundle_type"));
  if (!bundleType) {
    return badRequest("target_bundle_type is required");
  }

  const snapshot = await commerceBffService.getCollectWorldBundlesForWorld(
    guard.session.accountId,
    worldId
  );
  if (!snapshot) {
    return badRequest("world collect bundles not found");
  }

  const option = snapshot.bundles.find(
    (entry) => entry.bundle.bundleType === bundleType
  );
  if (!option) {
    return badRequest("target_bundle_type is invalid");
  }

  return ok({
    snapshot,
    preview: option.upgradePreview
  });
}
