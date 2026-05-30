/**
 * Wave 2.1 — Notification preferences API.
 *
 *   GET   /api/v1/account/notification-preferences  → current preferences
 *   PATCH /api/v1/account/notification-preferences  → partial update
 *
 * Both routes require an authenticated session. The PATCH body accepts any
 * subset of `{ channels, mutedTypes, digestEnabled }`; unspecified fields
 * are left unchanged. Invalid `channels` keys and unknown `mutedTypes`
 * values are silently dropped server-side (defensive parsing) — the
 * response always echoes the merged state so the caller can rely on it
 * for optimistic-UI confirmation.
 */

import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { NotificationChannel, NotificationType } from "@/lib/domain/contracts";

const VALID_CHANNELS: ReadonlySet<NotificationChannel> = new Set([
  "in_app",
  "email",
  "push"
]);

const VALID_TYPES: ReadonlySet<NotificationType> = new Set([
  "drop_collected",
  "receipt_confirmed",
  "resale_completed",
  "resale_royalty_earned",
  "comment_reply",
  "comment_mention",
  "world_update",
  "membership_change",
  "patron_renewal",
  "live_session_starting",
  "featured_lane_alert",
  "weekly_digest"
]);

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const preferences = await commerceBffService.getNotificationPreferences(
    guard.session.accountId
  );
  if (!preferences) {
    return badRequest("account not found");
  }
  return ok({ preferences });
}

type PatchBody = {
  channels?: Partial<Record<string, unknown>>;
  mutedTypes?: unknown;
  digestEnabled?: unknown;
};

export async function PATCH(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const body = (await safeJson<PatchBody>(request)) as PatchBody | null;
  if (!body || typeof body !== "object") {
    return badRequest("JSON body is required");
  }

  // Defensive parse on each field. Any malformed property is dropped from
  // the patch entirely — the service-layer merge keeps the previous value.
  const patch: {
    channels?: Partial<Record<NotificationChannel, boolean>>;
    mutedTypes?: NotificationType[];
    digestEnabled?: boolean;
  } = {};

  if (body.channels && typeof body.channels === "object" && !Array.isArray(body.channels)) {
    const channels: Partial<Record<NotificationChannel, boolean>> = {};
    for (const [key, value] of Object.entries(body.channels)) {
      if (VALID_CHANNELS.has(key as NotificationChannel) && typeof value === "boolean") {
        channels[key as NotificationChannel] = value;
      }
    }
    if (Object.keys(channels).length > 0) {
      patch.channels = channels;
    }
  }

  if (Array.isArray(body.mutedTypes)) {
    const muted = body.mutedTypes.filter(
      (t): t is NotificationType => typeof t === "string" && VALID_TYPES.has(t as NotificationType)
    );
    patch.mutedTypes = muted;
  }

  if (typeof body.digestEnabled === "boolean") {
    patch.digestEnabled = body.digestEnabled;
  }

  const preferences = await commerceBffService.updateNotificationPreferences(
    guard.session.accountId,
    patch
  );
  if (!preferences) {
    return badRequest("account not found");
  }
  return ok({ preferences });
}
