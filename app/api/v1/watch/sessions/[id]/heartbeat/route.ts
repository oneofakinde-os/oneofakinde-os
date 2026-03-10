import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import {
  badRequest,
  conflict,
  getRequiredRouteParam,
  notFound,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import {
  type TownhallTelemetryMetadata,
  type WatchQualityLevel,
  type WatchQualityMode
} from "@/lib/domain/contracts";
import { emitOperationalEvent } from "@/lib/ops/observability";

type Params = {
  id: string;
};

type HeartbeatBody = {
  watchTimeSeconds?: number;
  completionPercent?: number;
  qualityMode?: WatchQualityMode;
  qualityLevel?: WatchQualityLevel;
  qualityReason?: TownhallTelemetryMetadata["qualityReason"];
  rebufferReason?: TownhallTelemetryMetadata["rebufferReason"];
};

function parseOptionalBodyNumber(
  payload: Record<string, unknown> | null,
  key: string
): number | null | undefined {
  const value = payload?.[key];
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function parseOptionalBodyEnum<T extends string>(
  payload: Record<string, unknown> | null,
  key: string,
  allowed: readonly T[]
): T | null | undefined {
  const value = payload?.[key];
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim() as T;
  return allowed.includes(normalized) ? normalized : null;
}

export async function POST(request: Request, context: RouteContext<Params>) {
  const sessionId = await getRequiredRouteParam(context, "id");
  if (!sessionId) {
    return badRequest("session_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await safeJson<HeartbeatBody>(request);
  const payloadRecord = payload as Record<string, unknown> | null;
  const watchTimeSeconds = parseOptionalBodyNumber(payloadRecord, "watchTimeSeconds");
  if (watchTimeSeconds === null) {
    return badRequest("watchTimeSeconds must be a finite number");
  }

  const completionPercent = parseOptionalBodyNumber(payloadRecord, "completionPercent");
  if (completionPercent === null) {
    return badRequest("completionPercent must be a finite number");
  }

  const qualityMode = parseOptionalBodyEnum(payloadRecord, "qualityMode", [
    "auto",
    "high",
    "medium",
    "low"
  ] as const);
  if (qualityMode === null) {
    return badRequest("qualityMode must be one of: auto, high, medium, low");
  }

  const qualityLevel = parseOptionalBodyEnum(payloadRecord, "qualityLevel", [
    "high",
    "medium",
    "low"
  ] as const);
  if (qualityLevel === null) {
    return badRequest("qualityLevel must be one of: high, medium, low");
  }

  const qualityReason = parseOptionalBodyEnum(payloadRecord, "qualityReason", [
    "manual_select",
    "auto_step_down_stalled",
    "auto_step_down_error"
  ] as const);
  if (qualityReason === null) {
    return badRequest(
      "qualityReason must be one of: manual_select, auto_step_down_stalled, auto_step_down_error"
    );
  }

  const rebufferReason = parseOptionalBodyEnum(payloadRecord, "rebufferReason", [
    "waiting",
    "stalled",
    "error"
  ] as const);
  if (rebufferReason === null) {
    return badRequest("rebufferReason must be one of: waiting, stalled, error");
  }

  const heartbeat = await commerceBffService.heartbeatWatchSession({
    accountId: guard.session.accountId,
    sessionId,
    watchTimeSeconds,
    completionPercent,
    qualityMode,
    qualityLevel,
    qualityReason,
    rebufferReason
  });

  if (!heartbeat.ok) {
    emitOperationalEvent("watch_session_heartbeat_denied", {
      accountId: guard.session.accountId,
      watchSessionId: sessionId,
      reason: heartbeat.reason
    });
    if (heartbeat.reason === "session_ended") {
      return conflict("watch session already ended");
    }
    return notFound("watch session not found");
  }

  emitOperationalEvent("watch_session_heartbeat_recorded", {
    accountId: guard.session.accountId,
    watchSessionId: sessionId,
    dropId: heartbeat.session.dropId
  });

  return ok({ watchSession: heartbeat.session });
}
