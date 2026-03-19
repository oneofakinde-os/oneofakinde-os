import { requireRequestSession } from "@/lib/bff/auth";
import type {
  WorkshopLiveSessionResponse,
  WorkshopLiveSessionsResponse
} from "@/lib/bff/contracts";
import { badRequest, forbidden, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type {
  CreateWorkshopLiveSessionInput,
  LiveSessionEligibilityRule,
  LiveSessionType
} from "@/lib/domain/contracts";

type PostWorkshopLiveSessionBody = {
  title?: string;
  synopsis?: string;
  worldId?: string | null;
  dropId?: string | null;
  startsAt?: string;
  endsAt?: string | null;
  eligibilityRule?: string;
  type?: string;
  spatialAudio?: boolean;
  capacity?: number;
};

const LIVE_ELIGIBILITY_RULES = new Set<LiveSessionEligibilityRule>([
  "public",
  "membership_active",
  "drop_owner"
]);
const LIVE_SESSION_TYPES = new Set<LiveSessionType>(["opening", "event", "studio_session"]);

function normalizeOptionalBodyString(
  payload: Record<string, unknown> | null,
  key: string
): string | null {
  const value = payload?.[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseCreateWorkshopLiveSessionInput(
  body: Record<string, unknown> | null
):
  | {
      ok: true;
      input: CreateWorkshopLiveSessionInput;
    }
  | {
      ok: false;
      response: Response;
    } {
  const title = getRequiredBodyString(body, "title");
  if (!title) {
    return {
      ok: false,
      response: badRequest("title is required")
    };
  }

  const startsAt = getRequiredBodyString(body, "startsAt");
  if (!startsAt) {
    return {
      ok: false,
      response: badRequest("startsAt is required")
    };
  }

  const rawRule = getRequiredBodyString(body, "eligibilityRule");
  if (!rawRule || !LIVE_ELIGIBILITY_RULES.has(rawRule as LiveSessionEligibilityRule)) {
    return {
      ok: false,
      response: badRequest(
        "eligibilityRule must be one of: public, membership_active, drop_owner"
      )
    };
  }
  const eligibilityRule = rawRule as LiveSessionEligibilityRule;

  const parsedStartsAt = Date.parse(startsAt);
  if (!Number.isFinite(parsedStartsAt)) {
    return {
      ok: false,
      response: badRequest("startsAt must be a valid ISO datetime")
    };
  }

  const worldId = normalizeOptionalBodyString(body, "worldId");
  const dropId = normalizeOptionalBodyString(body, "dropId");
  const synopsis = normalizeOptionalBodyString(body, "synopsis") ?? "";
  const endsAt = normalizeOptionalBodyString(body, "endsAt");
  const rawType = normalizeOptionalBodyString(body, "type");
  const spatialAudioRaw = body?.spatialAudio;
  const capacityRaw = body?.capacity;

  if (endsAt) {
    const parsedEndsAt = Date.parse(endsAt);
    if (!Number.isFinite(parsedEndsAt) || parsedEndsAt <= parsedStartsAt) {
      return {
        ok: false,
        response: badRequest("endsAt must be after startsAt when provided")
      };
    }
  }

  if (eligibilityRule === "drop_owner" && !dropId) {
    return {
      ok: false,
      response: badRequest("drop_owner eligibility requires dropId")
    };
  }

  if (rawType && !LIVE_SESSION_TYPES.has(rawType as LiveSessionType)) {
    return {
      ok: false,
      response: badRequest("type must be one of: opening, event, studio_session")
    };
  }

  if (spatialAudioRaw !== undefined && typeof spatialAudioRaw !== "boolean") {
    return {
      ok: false,
      response: badRequest("spatialAudio must be a boolean when provided")
    };
  }

  if (
    capacityRaw !== undefined &&
    capacityRaw !== null &&
    (typeof capacityRaw !== "number" || !Number.isFinite(capacityRaw) || capacityRaw <= 0)
  ) {
    return {
      ok: false,
      response: badRequest("capacity must be a positive number when provided")
    };
  }

  return {
    ok: true,
    input: {
      title,
      synopsis,
      worldId,
      dropId,
      startsAt: new Date(parsedStartsAt).toISOString(),
      endsAt: endsAt ? new Date(Date.parse(endsAt)).toISOString() : null,
      eligibilityRule,
      type: rawType ? (rawType as LiveSessionType) : undefined,
      spatialAudio: spatialAudioRaw === true,
      capacity:
        typeof capacityRaw === "number" && Number.isFinite(capacityRaw)
          ? Math.max(1, Math.floor(capacityRaw))
          : undefined
    }
  };
}

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const liveSessions = await commerceBffService.listWorkshopLiveSessions(
    guard.session.accountId
  );

  return ok<WorkshopLiveSessionsResponse>({
    liveSessions
  });
}

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const body = (await safeJson<PostWorkshopLiveSessionBody>(request)) as
    | Record<string, unknown>
    | null;
  const parsed = parseCreateWorkshopLiveSessionInput(body);
  if (!parsed.ok) {
    return parsed.response;
  }

  const liveSession = await commerceBffService.createWorkshopLiveSession(
    guard.session.accountId,
    parsed.input
  );
  if (!liveSession) {
    return badRequest("workshop live session could not be created");
  }

  return ok<WorkshopLiveSessionResponse>(
    {
      liveSession
    },
    201
  );
}
