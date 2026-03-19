import { requireRequestSession } from "@/lib/bff/auth";
import type {
  WorkshopLiveSessionArtifactResponse,
  WorkshopLiveSessionArtifactsResponse
} from "@/lib/bff/contracts";
import { badRequest, forbidden, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type {
  CaptureWorkshopLiveSessionArtifactInput,
  LiveSessionArtifactKind
} from "@/lib/domain/contracts";

const LIVE_SESSION_ARTIFACT_KINDS = new Set<LiveSessionArtifactKind>([
  "recording",
  "transcript",
  "highlight"
]);

type PostWorkshopLiveSessionArtifactBody = {
  liveSessionId?: string;
  artifactKind?: string;
  title?: string;
  synopsis?: string;
  worldId?: string | null;
  sourceDropId?: string | null;
};

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

function parseCaptureLiveSessionArtifactInput(
  body: Record<string, unknown> | null
):
  | {
      ok: true;
      input: CaptureWorkshopLiveSessionArtifactInput;
    }
  | {
      ok: false;
      response: Response;
    } {
  const liveSessionId = getRequiredBodyString(body, "liveSessionId");
  if (!liveSessionId) {
    return {
      ok: false,
      response: badRequest("liveSessionId is required")
    };
  }

  const title = getRequiredBodyString(body, "title");
  if (!title) {
    return {
      ok: false,
      response: badRequest("title is required")
    };
  }

  const artifactKind = normalizeOptionalBodyString(body, "artifactKind") ?? "highlight";
  if (!LIVE_SESSION_ARTIFACT_KINDS.has(artifactKind as LiveSessionArtifactKind)) {
    return {
      ok: false,
      response: badRequest("artifactKind must be recording, transcript, or highlight")
    };
  }

  return {
    ok: true,
    input: {
      liveSessionId,
      artifactKind: artifactKind as LiveSessionArtifactKind,
      title,
      synopsis: normalizeOptionalBodyString(body, "synopsis") ?? "",
      worldId: normalizeOptionalBodyString(body, "worldId"),
      sourceDropId: normalizeOptionalBodyString(body, "sourceDropId")
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

  const artifacts = await commerceBffService.listWorkshopLiveSessionArtifacts(
    guard.session.accountId
  );

  return ok<WorkshopLiveSessionArtifactsResponse>({
    artifacts
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

  const body = (await safeJson<PostWorkshopLiveSessionArtifactBody>(request)) as
    | Record<string, unknown>
    | null;
  const parsed = parseCaptureLiveSessionArtifactInput(body);
  if (!parsed.ok) {
    return parsed.response;
  }

  const artifact = await commerceBffService.captureWorkshopLiveSessionArtifact(
    guard.session.accountId,
    parsed.input
  );
  if (!artifact) {
    return badRequest("workshop live session artifact could not be captured");
  }

  return ok<WorkshopLiveSessionArtifactResponse>(
    {
      artifact
    },
    201
  );
}
