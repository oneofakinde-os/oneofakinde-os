/**
 * GET  /api/v1/workshop/broadcasts — list the creator's broadcasts
 * POST /api/v1/workshop/broadcasts — create a broadcast (draft or scheduled)
 *
 * Sprint 6 — creator broadcast (newsletters / announcements).
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { AudienceScope, BroadcastType } from "@/lib/domain/creator-broadcast";

const BROADCAST_TYPES: BroadcastType[] = [
  "newsletter",
  "world_announcement",
  "drop_launch",
  "patron_update",
  "tier_targeted"
];

type CreateBroadcastBody = {
  type?: string;
  subject?: string;
  body?: string;
  audienceScope?: AudienceScope;
  scheduledAt?: string | null;
};

function parseAudienceScope(value: unknown): AudienceScope | null {
  if (!value || typeof value !== "object") return null;
  const scope = value as { kind?: string; worldId?: string; tierIds?: string[] };
  switch (scope.kind) {
    case "all_followers":
      return { kind: "all_followers" };
    case "patrons_only":
      return { kind: "patrons_only" };
    case "world_members":
      return typeof scope.worldId === "string" && scope.worldId
        ? { kind: "world_members", worldId: scope.worldId }
        : null;
    case "tier_targeted":
      return Array.isArray(scope.tierIds)
        ? { kind: "tier_targeted", tierIds: scope.tierIds.filter((t): t is string => typeof t === "string") }
        : null;
    default:
      return null;
  }
}

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const broadcasts = await commerceBffService.listBroadcasts(guard.session.accountId);
  return ok({ broadcasts });
}

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const payload = await safeJson<CreateBroadcastBody>(request);
  if (!payload) return badRequest("invalid body");

  const type = BROADCAST_TYPES.includes(payload.type as BroadcastType)
    ? (payload.type as BroadcastType)
    : null;
  if (!type) return badRequest("type must be a valid broadcast type");

  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!subject || !body) return badRequest("subject and body are required");

  const audienceScope = parseAudienceScope(payload.audienceScope);
  if (!audienceScope) return badRequest("audienceScope is invalid");

  const broadcast = await commerceBffService.createBroadcast(guard.session.accountId, {
    type,
    subject,
    body,
    audienceScope,
    scheduledAt: payload.scheduledAt ?? null
  });
  if (!broadcast) return badRequest("could not create broadcast — are you a creator?");

  return ok({ broadcast }, 201);
}
