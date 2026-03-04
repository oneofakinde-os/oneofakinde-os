"use server";

import type {
  CreateWorkshopWorldReleaseInput,
  CreateWorkshopLiveSessionInput,
  LiveSessionEligibilityRule,
  TownhallModerationCaseResolution,
  WorldReleaseQueuePacingMode,
  WorldReleaseQueueStatus
} from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";
import { requireSessionRoles } from "@/lib/server/session";
import { redirect } from "next/navigation";

const LIVE_ELIGIBILITY_RULES = new Set<LiveSessionEligibilityRule>([
  "public",
  "membership_active",
  "drop_owner"
]);
const MODERATION_RESOLUTIONS = new Set<TownhallModerationCaseResolution>([
  "hide",
  "restrict",
  "delete",
  "restore",
  "dismiss"
]);
const WORLD_RELEASE_PACING_MODES = new Set<WorldReleaseQueuePacingMode>([
  "manual",
  "daily",
  "weekly"
]);
const WORLD_RELEASE_STATUS_ACTIONS = new Set<Exclude<WorldReleaseQueueStatus, "scheduled">>([
  "published",
  "canceled"
]);

function getRequiredFormString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function getOptionalFormString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  if (!value || value === "none") {
    return null;
  }
  return value;
}

function parseCreateLiveSessionInput(formData: FormData): CreateWorkshopLiveSessionInput | null {
  const title = getRequiredFormString(formData, "title");
  const startsAt = getRequiredFormString(formData, "starts_at");
  const eligibilityRule = getRequiredFormString(formData, "eligibility_rule");

  if (!title || !startsAt || !eligibilityRule) {
    return null;
  }

  if (!LIVE_ELIGIBILITY_RULES.has(eligibilityRule as LiveSessionEligibilityRule)) {
    return null;
  }

  const startsAtMs = Date.parse(startsAt);
  if (!Number.isFinite(startsAtMs)) {
    return null;
  }

  const endsAtRaw = getOptionalFormString(formData, "ends_at");
  if (endsAtRaw) {
    const endsAtMs = Date.parse(endsAtRaw);
    if (!Number.isFinite(endsAtMs) || endsAtMs <= startsAtMs) {
      return null;
    }
  }

  const dropId = getOptionalFormString(formData, "drop_id");
  if (eligibilityRule === "drop_owner" && !dropId) {
    return null;
  }

  return {
    title,
    synopsis: getOptionalFormString(formData, "synopsis") ?? "",
    worldId: getOptionalFormString(formData, "world_id"),
    dropId,
    startsAt: new Date(startsAtMs).toISOString(),
    endsAt: endsAtRaw ? new Date(Date.parse(endsAtRaw)).toISOString() : null,
    eligibilityRule: eligibilityRule as LiveSessionEligibilityRule
  };
}

function parseCreateWorldReleaseInput(formData: FormData): CreateWorkshopWorldReleaseInput | null {
  const worldId = getRequiredFormString(formData, "world_id");
  const dropId = getRequiredFormString(formData, "drop_id");
  const scheduledFor = getRequiredFormString(formData, "scheduled_for");
  const pacingMode = getRequiredFormString(formData, "pacing_mode");

  if (!worldId || !dropId || !scheduledFor || !pacingMode) {
    return null;
  }

  if (!WORLD_RELEASE_PACING_MODES.has(pacingMode as WorldReleaseQueuePacingMode)) {
    return null;
  }

  const scheduledForMs = Date.parse(scheduledFor);
  if (!Number.isFinite(scheduledForMs)) {
    return null;
  }

  return {
    worldId,
    dropId,
    scheduledFor: new Date(scheduledForMs).toISOString(),
    pacingMode: pacingMode as WorldReleaseQueuePacingMode
  };
}

function parseWorldReleaseStatus(
  value: FormDataEntryValue | null
): Exclude<WorldReleaseQueueStatus, "scheduled"> | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!WORLD_RELEASE_STATUS_ACTIONS.has(normalized as Exclude<WorldReleaseQueueStatus, "scheduled">)) {
    return null;
  }

  return normalized as Exclude<WorldReleaseQueueStatus, "scheduled">;
}

export async function createWorkshopLiveSessionAction(formData: FormData): Promise<void> {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const input = parseCreateLiveSessionInput(formData);
  if (!input) {
    redirect("/workshop?event_status=invalid_input");
  }

  const created = await gateway.createWorkshopLiveSession(session.accountId, input);
  if (!created) {
    redirect("/workshop?event_status=create_failed");
  }

  redirect(
    `/workshop?event_status=created&event_id=${encodeURIComponent(created.id)}`
  );
}

export async function createWorkshopWorldReleaseAction(formData: FormData): Promise<void> {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const input = parseCreateWorldReleaseInput(formData);
  if (!input) {
    redirect("/workshop?release_status=invalid_input");
  }

  const created = await gateway.createWorkshopWorldRelease(session.accountId, input);
  if (!created) {
    redirect("/workshop?release_status=create_failed");
  }

  redirect(`/workshop?release_status=scheduled&release_id=${encodeURIComponent(created.id)}`);
}

export async function updateWorkshopWorldReleaseStatusAction(formData: FormData): Promise<void> {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const releaseId = getRequiredFormString(formData, "release_id");
  const status = parseWorldReleaseStatus(formData.get("status"));
  if (!releaseId || !status) {
    redirect("/workshop?release_status=invalid_input");
  }

  const updated = await gateway.updateWorkshopWorldReleaseStatus(session.accountId, releaseId, status);
  if (!updated) {
    redirect("/workshop?release_status=update_failed");
  }

  redirect(
    `/workshop?release_status=${encodeURIComponent(updated.status)}&release_id=${encodeURIComponent(updated.id)}`
  );
}

function parseModerationResolution(value: FormDataEntryValue | null): TownhallModerationCaseResolution | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (!MODERATION_RESOLUTIONS.has(normalized as TownhallModerationCaseResolution)) {
    return null;
  }

  return normalized as TownhallModerationCaseResolution;
}

export async function resolveWorkshopModerationCaseAction(formData: FormData): Promise<void> {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const dropId = getRequiredFormString(formData, "drop_id");
  const commentId = getRequiredFormString(formData, "comment_id");
  const resolution = parseModerationResolution(formData.get("resolution"));

  if (!dropId || !commentId || !resolution) {
    redirect("/workshop?moderation_status=invalid_input");
  }

  const result = await gateway.resolveTownhallModerationCase(
    session.accountId,
    dropId,
    commentId,
    resolution
  );

  if (!result.ok) {
    const status =
      result.reason === "forbidden" ? "forbidden" : "not_found";
    redirect(`/workshop?moderation_status=${status}`);
  }

  redirect(
    `/workshop?moderation_status=resolved&moderation_comment_id=${encodeURIComponent(commentId)}`
  );
}
