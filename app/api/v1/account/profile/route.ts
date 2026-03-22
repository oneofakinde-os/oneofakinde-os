import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type ProfileUpdateBody = {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
};

/**
 * PATCH /api/v1/account/profile
 *
 * Updates the authenticated user's profile fields.
 */
export async function PATCH(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const body = (await safeJson<ProfileUpdateBody>(request)) as Record<string, unknown> | null;
  if (!body) {
    return badRequest("JSON body is required");
  }

  const updates: { displayName?: string; avatarUrl?: string; bio?: string } = {};

  if (typeof body.displayName === "string") {
    const trimmed = body.displayName.trim();
    if (trimmed.length === 0 || trimmed.length > 100) {
      return badRequest("displayName must be 1–100 characters");
    }
    updates.displayName = trimmed;
  }

  if (typeof body.avatarUrl === "string") {
    updates.avatarUrl = body.avatarUrl.trim();
  }

  if (typeof body.bio === "string") {
    const trimmed = body.bio.trim();
    if (trimmed.length > 500) {
      return badRequest("bio must be at most 500 characters");
    }
    updates.bio = trimmed;
  }

  if (Object.keys(updates).length === 0) {
    return badRequest("at least one field (displayName, avatarUrl, bio) is required");
  }

  const session = await commerceBffService.updateAccountProfile(
    guard.session.accountId,
    updates
  );

  if (!session) {
    return badRequest("account not found");
  }

  return ok({ profile: { displayName: session.displayName, avatarUrl: session.avatarUrl, bio: session.bio } });
}
