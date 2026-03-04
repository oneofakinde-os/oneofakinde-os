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
  type WatchQualityMode,
  type WatchSessionEndReason
} from "@/lib/domain/contracts";
import { emitOperationalEvent } from "@/lib/ops/observability";

type Params = {
  session_id: string;
};

type EndBody = {
  watchTimeSeconds?: number;
  completionPercent?: number;
  qualityMode?: WatchQualityMode;
  qualityLevel?: WatchQualityLevel;
  qualityReason?: TownhallTelemetryMetadata["qualityReason"];
  rebufferReason?: TownhallTelemetryMetadata["rebufferReason"];
  endReason?: WatchSessionEndReason;
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
  const sessionId = await getRequiredRouteParam(context, "session_id");
  if (!sessionId) {
    return badRequest("session_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await safeJson<EndBody>(request);
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

  const endReason = parseOptionalBodyEnum(payloadRecord, "endReason", [
    "completed",
    "user_exit",
    "network_error",
    "stalled",
    "error"
  ] as const);
  if (endReason === null) {
    return badRequest(
      "endReason must be one of: completed, user_exit, network_error, stalled, error"
    );
  }

  const ended = await commerceBffService.endWatchSession({
    accountId: guard.session.accountId,
    sessionId,
    watchTimeSeconds,
    completionPercent,
    qualityMode,
    qualityLevel,
    qualityReason,
    rebufferReason,
    endReason
  });

  if (!ended.ok) {
    emitOperationalEvent("watch_session_end_denied", {
      accountId: guard.session.accountId,
      watchSessionId: sessionId,
      reason: ended.reason
    });
    if (ended.reason === "session_ended") {
      return conflict("watch session already ended");
    }
    return notFound("watch session not found");
  }

  emitOperationalEvent("watch_session_ended", {
    accountId: guard.session.accountId,
    watchSessionId: sessionId,
    dropId: ended.session.dropId,
    endReason: ended.session.endReason
  });

  return ok({ watchSession: ended.session });
}
