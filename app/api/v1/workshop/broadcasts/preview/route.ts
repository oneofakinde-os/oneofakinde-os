/**
 * POST /api/v1/workshop/broadcasts/preview — count an audience scope.
 *
 * Sprint 6 — lets a creator size the audience before sending.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { AudienceScope } from "@/lib/domain/creator-broadcast";

type PreviewBody = {
  audienceScope?: AudienceScope;
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

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) return guard.response;

  const payload = await safeJson<PreviewBody>(request);
  const audienceScope = parseAudienceScope(payload?.audienceScope);
  if (!audienceScope) return badRequest("audienceScope is invalid");

  const preview = await commerceBffService.getBroadcastAudiencePreview(
    guard.session.accountId,
    audienceScope
  );
  if (!preview) return badRequest("could not preview audience — are you a creator?");

  return ok({ preview });
}
