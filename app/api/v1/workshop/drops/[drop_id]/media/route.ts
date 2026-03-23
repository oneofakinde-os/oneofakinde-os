import { requireRequestSession } from "@/lib/bff/auth";
import {
  badRequest,
  forbidden,
  getRequiredRouteParam,
  notFound,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { DropPreviewAssetType, DropPreviewMode, UpdateDropPreviewMediaInput } from "@/lib/domain/contracts";

type Params = {
  drop_id: string;
};

const VALID_MODES = new Set<DropPreviewMode>(["watch", "listen", "read", "photos", "live"]);
const VALID_TYPES = new Set<DropPreviewAssetType>(["video", "audio", "image", "text"]);

type Body = Partial<
  Record<
    string,
    {
      type?: string;
      src?: string;
      posterSrc?: string;
      alt?: string;
      text?: string;
    } | null
  >
>;

function parseInput(
  body: Record<string, unknown> | null
):
  | { ok: true; input: UpdateDropPreviewMediaInput }
  | { ok: false; response: Response } {
  if (!body || typeof body !== "object") {
    return { ok: false, response: badRequest("JSON body is required") };
  }

  const input: UpdateDropPreviewMediaInput = {};
  let count = 0;

  for (const [key, value] of Object.entries(body as Body)) {
    if (!VALID_MODES.has(key as DropPreviewMode)) {
      return { ok: false, response: badRequest(`invalid preview mode: ${key}`) };
    }

    if (value === null) {
      input[key as DropPreviewMode] = null;
      count++;
      continue;
    }

    if (typeof value !== "object") {
      return { ok: false, response: badRequest(`${key} must be an object or null`) };
    }

    if (!value.type || !VALID_TYPES.has(value.type as DropPreviewAssetType)) {
      return {
        ok: false,
        response: badRequest(`${key}.type must be one of: video, audio, image, text`)
      };
    }

    input[key as DropPreviewMode] = {
      type: value.type as DropPreviewAssetType,
      src: typeof value.src === "string" ? value.src : undefined,
      posterSrc: typeof value.posterSrc === "string" ? value.posterSrc : undefined,
      alt: typeof value.alt === "string" ? value.alt : undefined,
      text: typeof value.text === "string" ? value.text : undefined
    };
    count++;
  }

  if (count === 0) {
    return { ok: false, response: badRequest("at least one preview mode is required") };
  }

  return { ok: true, input };
}

/**
 * PATCH /api/v1/workshop/drops/:drop_id/media
 *
 * Attach or update preview media for a drop.
 * Set a mode to `null` to remove it.
 *
 * Body example:
 * {
 *   "watch": { "type": "video", "src": "https://…/video.mp4", "posterSrc": "https://…/poster.jpg" },
 *   "listen": { "type": "audio", "src": "https://…/track.mp3" },
 *   "photos": null
 * }
 */
export async function PATCH(request: Request, context: RouteContext<Params>) {
  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return badRequest("drop_id is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const payload = (await safeJson<Body>(request)) as Record<string, unknown> | null;
  const parsed = parseInput(payload);
  if (!parsed.ok) {
    return parsed.response;
  }

  const previewMedia = await commerceBffService.updateDropPreviewMedia(
    guard.session.accountId,
    dropId,
    parsed.input
  );

  if (!previewMedia) {
    return notFound("drop not found or not owned by this creator");
  }

  return ok({ previewMedia });
}
