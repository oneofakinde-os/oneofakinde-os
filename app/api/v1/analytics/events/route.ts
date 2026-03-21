import { getRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type {
  SurfaceActionVerb,
  SurfaceName,
  SurfaceTelemetryEvent,
  TownhallTelemetryEventType,
  TownhallTelemetryMetadata
} from "@/lib/domain/contracts";

const VALID_SURFACES = new Set<SurfaceName>([
  "showroom", "townhall", "watch", "listen", "read", "photos",
  "live", "connect", "collect", "drop_detail", "my_collection",
  "library", "workshop"
]);

const VALID_ACTIONS = new Set<SurfaceActionVerb>([
  "view", "impression", "open", "close", "play", "pause",
  "complete", "seek", "collect", "save", "unsave", "like",
  "unlike", "comment", "share", "follow", "unfollow",
  "report", "appeal", "search", "filter", "navigate"
]);

function mapToTownhallEventType(
  action: SurfaceActionVerb,
  surface: SurfaceName
): TownhallTelemetryEventType | null {
  switch (action) {
    case "impression":
      return surface === "showroom" ? "showroom_impression" : "impression";
    case "view":
      return "drop_opened";
    case "open":
      return "drop_opened";
    case "play":
      return "preview_start";
    case "complete":
      return "completion";
    case "collect":
      return "collect_intent";
    case "like":
      return "interaction_like";
    case "comment":
      return "interaction_comment";
    case "share":
      return "interaction_share";
    case "save":
      return "interaction_save";
    default:
      return null;
  }
}

function mapSurfaceToMetadataSurface(
  surface: SurfaceName
): TownhallTelemetryMetadata["surface"] | undefined {
  switch (surface) {
    case "townhall":
    case "watch":
    case "listen":
    case "read":
    case "photos":
    case "live":
      return surface;
    default:
      return undefined;
  }
}

type AnalyticsEventBody = {
  surface?: string;
  action?: string;
  dropId?: string;
  objectType?: string;
  objectId?: string;
  durationMs?: number;
  completionPercent?: number;
  position?: number;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function POST(request: Request) {
  const payload = await safeJson<AnalyticsEventBody>(request);
  const body = payload as Record<string, unknown> | null;

  const surface = body?.surface as string | undefined;
  const action = body?.action as string | undefined;

  if (!surface || !VALID_SURFACES.has(surface as SurfaceName)) {
    return badRequest("surface is required and must be a valid surface name");
  }

  if (!action || !VALID_ACTIONS.has(action as SurfaceActionVerb)) {
    return badRequest("action is required and must be a valid action verb");
  }

  const dropId = typeof body?.dropId === "string" ? body.dropId : undefined;
  const durationMs = typeof body?.durationMs === "number" && Number.isFinite(body.durationMs) ? body.durationMs : undefined;
  const completionPercent = typeof body?.completionPercent === "number" && Number.isFinite(body.completionPercent) ? body.completionPercent : undefined;
  const position = typeof body?.position === "number" && Number.isFinite(body.position) ? body.position : undefined;

  const session = await getRequestSession(request);

  // Bridge to existing townhall telemetry when we have a dropId
  if (dropId) {
    const townhallEventType = mapToTownhallEventType(
      action as SurfaceActionVerb,
      surface as SurfaceName
    );

    if (townhallEventType) {
      const metadata: TownhallTelemetryMetadata = {
        surface: mapSurfaceToMetadataSurface(surface as SurfaceName),
        source: surface === "showroom" ? "showroom" : "drop",
        position
      };

      await commerceBffService.recordTownhallTelemetryEvent({
        accountId: session?.accountId ?? null,
        dropId,
        eventType: townhallEventType,
        watchTimeSeconds: durationMs ? durationMs / 1000 : undefined,
        completionPercent,
        metadata
      });
    }
  }

  return ok({
    accepted: true,
    surface,
    action,
    bridged: Boolean(dropId)
  }, 202);
}
