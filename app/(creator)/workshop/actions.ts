"use server";

import type {
  AuthorizedDerivativeKind,
  CaptureWorkshopLiveSessionArtifactInput,
  CreateAuthorizedDerivativeInput,
  CreateDropVersionInput,
  DropVisibility,
  DropVersionLabel,
  CreateWorkshopWorldReleaseInput,
  CreateWorkshopLiveSessionInput,
  LiveSessionEligibilityRule,
  LiveSessionType,
  PatronTierStatus,
  PreviewPolicy,
  TownhallModerationCaseResolution,
  UpsertWorkshopPatronTierConfigInput,
  WorkshopProState,
  WorldReleaseQueuePacingMode,
  WorldReleaseQueueStatus
} from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";
import { requireSessionRoles } from "@/lib/server/session";
import {
  buildWorkshopPublishValidationSummary,
  normalizeWorkshopComposeTarget,
  resolveWorkshopPublishDraftState,
  resolveWorkshopWorldBuilderState,
  type WorkshopComposeTarget
} from "@/lib/server/workshop";
import type { Route } from "next";
import { redirect } from "next/navigation";

const LIVE_ELIGIBILITY_RULES = new Set<LiveSessionEligibilityRule>([
  "public",
  "membership_active",
  "drop_owner"
]);
const LIVE_SESSION_TYPES = new Set<LiveSessionType>(["opening", "event", "studio_session"]);
const DROP_VERSION_LABELS = new Set<DropVersionLabel>([
  "v1",
  "v2",
  "v3",
  "director_cut",
  "remaster"
]);
const AUTHORIZED_DERIVATIVE_KINDS = new Set<AuthorizedDerivativeKind>([
  "remix",
  "translation",
  "anthology_world",
  "collaborative_season"
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
const PATRON_TIER_STATUSES = new Set<PatronTierStatus>(["active", "disabled"]);
const WORKSHOP_PRO_STATES = new Set<WorkshopProState>(["active", "past_due", "grace", "locked"]);

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

function getFormFlag(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

function parseWorkshopCollaboratorSplits(
  formData: FormData
): {
  raw: string;
  total: number | null;
} {
  const raw = getOptionalFormString(formData, "collaborator_splits") ?? "";
  if (!raw) {
    return {
      raw: "",
      total: 100
    };
  }

  const parsed = parseRevenueSplits(raw);
  if (!parsed) {
    return {
      raw,
      total: null
    };
  }

  return {
    raw,
    total: Number(parsed.reduce((sum, entry) => sum + entry.sharePercent, 0).toFixed(2))
  };
}

function buildWorkshopComposeRedirectPath(input: {
  compose: WorkshopComposeTarget;
  cultureComplete: boolean;
  accessComplete: boolean;
  economicsComplete: boolean;
  visibility: DropVisibility;
  previewPolicy: PreviewPolicy;
  collaboratorSplitsRaw: string;
  collaboratorSplitsTotal: number | null;
  worldVisualIdentityComplete: boolean;
  worldLoreComplete: boolean;
  worldEntryRuleComplete: boolean;
  publishStatus: string;
  missingSections?: string[];
  blockingReasons?: string[];
  missingWorldSections?: string[];
}): string {
  const params = new URLSearchParams();
  params.set("compose", input.compose);
  params.set("culture_complete", input.cultureComplete ? "1" : "0");
  params.set("access_complete", input.accessComplete ? "1" : "0");
  params.set("economics_complete", input.economicsComplete ? "1" : "0");
  params.set("visibility", input.visibility);
  params.set("preview_policy", input.previewPolicy);
  params.set("world_visual_identity_complete", input.worldVisualIdentityComplete ? "1" : "0");
  params.set("world_lore_complete", input.worldLoreComplete ? "1" : "0");
  params.set("world_entry_rule_complete", input.worldEntryRuleComplete ? "1" : "0");
  params.set("publish_status", input.publishStatus);

  if (input.collaboratorSplitsRaw) {
    params.set("collaborator_splits", input.collaboratorSplitsRaw);
  }
  if (typeof input.collaboratorSplitsTotal === "number") {
    params.set("splits_total", String(input.collaboratorSplitsTotal));
  }
  if (input.missingSections && input.missingSections.length > 0) {
    params.set("publish_missing", input.missingSections.join(","));
  }
  if (input.blockingReasons && input.blockingReasons.length > 0) {
    params.set("publish_blockers", input.blockingReasons.join(" | "));
  }
  if (input.missingWorldSections && input.missingWorldSections.length > 0) {
    params.set("world_missing", input.missingWorldSections.join(","));
  }

  return `/workshop?${params.toString()}`;
}

function parseCreateLiveSessionInput(formData: FormData): CreateWorkshopLiveSessionInput | null {
  const title = getRequiredFormString(formData, "title");
  const startsAt = getRequiredFormString(formData, "starts_at");
  const eligibilityRule = getRequiredFormString(formData, "eligibility_rule");
  const sessionType = getOptionalFormString(formData, "session_type");
  const capacityRaw = getOptionalFormString(formData, "capacity");
  const capacity = capacityRaw ? parsePositiveInteger(capacityRaw) : null;

  if (!title || !startsAt || !eligibilityRule) {
    return null;
  }

  if (!LIVE_ELIGIBILITY_RULES.has(eligibilityRule as LiveSessionEligibilityRule)) {
    return null;
  }

  if (sessionType && !LIVE_SESSION_TYPES.has(sessionType as LiveSessionType)) {
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

  if (capacityRaw && !capacity) {
    return null;
  }

  return {
    title,
    synopsis: getOptionalFormString(formData, "synopsis") ?? "",
    worldId: getOptionalFormString(formData, "world_id"),
    dropId,
    startsAt: new Date(startsAtMs).toISOString(),
    endsAt: endsAtRaw ? new Date(Date.parse(endsAtRaw)).toISOString() : null,
    eligibilityRule: eligibilityRule as LiveSessionEligibilityRule,
    type: sessionType ? (sessionType as LiveSessionType) : undefined,
    spatialAudio: getFormFlag(formData, "spatial_audio"),
    capacity: capacity ?? undefined
  };
}

function parseCaptureLiveSessionArtifactInput(
  formData: FormData
): CaptureWorkshopLiveSessionArtifactInput | null {
  const liveSessionId = getRequiredFormString(formData, "live_session_id");
  const title = getRequiredFormString(formData, "artifact_title");
  if (!liveSessionId || !title) {
    return null;
  }

  return {
    liveSessionId,
    title,
    synopsis: getOptionalFormString(formData, "artifact_synopsis") ?? "",
    worldId: getOptionalFormString(formData, "artifact_world_id"),
    sourceDropId: getOptionalFormString(formData, "artifact_source_drop_id")
  };
}

function parsePositiveInteger(input: string): number | null {
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseUpsertPatronTierConfigInput(
  formData: FormData
): UpsertWorkshopPatronTierConfigInput | null {
  const title = getRequiredFormString(formData, "patron_title");
  const amountCentsRaw = getRequiredFormString(formData, "patron_amount_cents");
  const periodDaysRaw = getRequiredFormString(formData, "patron_period_days");
  const status = getRequiredFormString(formData, "patron_status");
  if (!title || !amountCentsRaw || !periodDaysRaw || !status) {
    return null;
  }

  if (!PATRON_TIER_STATUSES.has(status as PatronTierStatus)) {
    return null;
  }

  const amountCents = parsePositiveInteger(amountCentsRaw);
  const periodDays = parsePositiveInteger(periodDaysRaw);
  if (!amountCents || !periodDays) {
    return null;
  }

  return {
    worldId: getOptionalFormString(formData, "patron_world_id"),
    title,
    amountCents,
    periodDays,
    benefitsSummary: getOptionalFormString(formData, "patron_benefits_summary") ?? "",
    status: status as PatronTierStatus
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

function parseCreateDropVersionInput(formData: FormData): {
  dropId: string;
  input: CreateDropVersionInput;
} | null {
  const dropId = getRequiredFormString(formData, "drop_id");
  const label = getRequiredFormString(formData, "label");

  if (!dropId || !label) {
    return null;
  }

  if (!DROP_VERSION_LABELS.has(label as DropVersionLabel)) {
    return null;
  }

  const releasedAt = getOptionalFormString(formData, "released_at");
  if (releasedAt && !Number.isFinite(Date.parse(releasedAt))) {
    return null;
  }

  return {
    dropId,
    input: {
      label: label as DropVersionLabel,
      notes: getOptionalFormString(formData, "notes"),
      releasedAt: releasedAt ? new Date(Date.parse(releasedAt)).toISOString() : null
    }
  };
}

function parseRevenueSplits(raw: string): CreateAuthorizedDerivativeInput["revenueSplits"] | null {
  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [recipientHandleRaw, sharePercentRaw] = entry.split(":").map((part) => part.trim());
      if (!recipientHandleRaw || !sharePercentRaw) {
        return null;
      }

      const sharePercent = Number(sharePercentRaw);
      if (!Number.isFinite(sharePercent) || sharePercent <= 0 || sharePercent > 100) {
        return null;
      }

      return {
        recipientHandle: recipientHandleRaw,
        sharePercent: Number(sharePercent.toFixed(2))
      };
    })
    .filter(
      (entry): entry is { recipientHandle: string; sharePercent: number } => entry !== null
    );

  if (entries.length === 0) {
    return null;
  }

  const total = Number(entries.reduce((sum, entry) => sum + entry.sharePercent, 0).toFixed(2));
  if (total !== 100) {
    return null;
  }

  return entries;
}

function parseCreateDerivativeInput(formData: FormData): {
  sourceDropId: string;
  input: CreateAuthorizedDerivativeInput;
} | null {
  const sourceDropId = getRequiredFormString(formData, "source_drop_id");
  const derivativeDropId = getRequiredFormString(formData, "derivative_drop_id");
  const kind = getRequiredFormString(formData, "kind");
  const attribution = getRequiredFormString(formData, "attribution");
  const revenueSplitsRaw = getRequiredFormString(formData, "revenue_splits");

  if (!sourceDropId || !derivativeDropId || !kind || !attribution || !revenueSplitsRaw) {
    return null;
  }

  if (!AUTHORIZED_DERIVATIVE_KINDS.has(kind as AuthorizedDerivativeKind)) {
    return null;
  }

  const revenueSplits = parseRevenueSplits(revenueSplitsRaw);
  if (!revenueSplits) {
    return null;
  }

  return {
    sourceDropId,
    input: {
      derivativeDropId,
      kind: kind as AuthorizedDerivativeKind,
      attribution,
      revenueSplits
    }
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

function parseWorkshopProState(value: FormDataEntryValue | null): WorkshopProState | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!WORKSHOP_PRO_STATES.has(normalized as WorkshopProState)) {
    return null;
  }

  return normalized as WorkshopProState;
}

export async function validateWorkshopPublishGateAction(formData: FormData): Promise<void> {
  await requireSessionRoles("/workshop", ["creator"]);

  const compose = normalizeWorkshopComposeTarget(getOptionalFormString(formData, "compose"));
  const collaboratorSplits = parseWorkshopCollaboratorSplits(formData);

  const publishDraft = resolveWorkshopPublishDraftState({
    compose,
    cultureComplete: getFormFlag(formData, "culture_complete"),
    accessComplete: getFormFlag(formData, "access_complete"),
    economicsComplete: getFormFlag(formData, "economics_complete"),
    visibility: getOptionalFormString(formData, "visibility"),
    previewPolicy: getOptionalFormString(formData, "preview_policy"),
    collaboratorSplitsTotal: collaboratorSplits.total,
    collaboratorSplitsRaw: collaboratorSplits.raw
  });
  const publishValidation = buildWorkshopPublishValidationSummary(publishDraft);

  const worldBuilder = resolveWorkshopWorldBuilderState({
    worldVisualIdentityComplete: getFormFlag(formData, "world_visual_identity_complete"),
    worldLoreComplete: getFormFlag(formData, "world_lore_complete"),
    worldEntryRuleComplete: getFormFlag(formData, "world_entry_rule_complete")
  });

  if (compose === "world") {
    redirect(
      buildWorkshopComposeRedirectPath({
        compose,
        cultureComplete: publishDraft.cultureComplete,
        accessComplete: publishDraft.accessComplete,
        economicsComplete: publishDraft.economicsComplete,
        visibility: publishDraft.visibility,
        previewPolicy: publishDraft.previewPolicy,
        collaboratorSplitsRaw: publishDraft.collaboratorSplitsRaw,
        collaboratorSplitsTotal: publishDraft.collaboratorSplitsTotal,
        worldVisualIdentityComplete: worldBuilder.visualIdentityComplete,
        worldLoreComplete: worldBuilder.loreComplete,
        worldEntryRuleComplete: worldBuilder.entryRuleComplete,
        publishStatus: worldBuilder.ready ? "world_ready" : "world_incomplete",
        missingWorldSections: worldBuilder.missingSections
      }) as Route
    );
  }

  redirect(
    buildWorkshopComposeRedirectPath({
      compose,
      cultureComplete: publishDraft.cultureComplete,
      accessComplete: publishDraft.accessComplete,
      economicsComplete: publishDraft.economicsComplete,
      visibility: publishDraft.visibility,
      previewPolicy: publishDraft.previewPolicy,
      collaboratorSplitsRaw: publishDraft.collaboratorSplitsRaw,
      collaboratorSplitsTotal: publishDraft.collaboratorSplitsTotal,
      worldVisualIdentityComplete: worldBuilder.visualIdentityComplete,
      worldLoreComplete: worldBuilder.loreComplete,
      worldEntryRuleComplete: worldBuilder.entryRuleComplete,
      publishStatus: publishValidation.canPublish ? "ready" : "blocked",
      missingSections: publishValidation.missingSections,
      blockingReasons: publishValidation.blockingReasons
    }) as Route
  );
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

export async function captureWorkshopLiveSessionArtifactAction(formData: FormData): Promise<void> {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const input = parseCaptureLiveSessionArtifactInput(formData);
  if (!input) {
    redirect("/workshop?artifact_status=invalid_input");
  }

  const artifact = await gateway.captureWorkshopLiveSessionArtifact(session.accountId, input);
  if (!artifact) {
    redirect("/workshop?artifact_status=capture_failed");
  }

  redirect(
    `/workshop?artifact_status=captured&artifact_id=${encodeURIComponent(artifact.id)}`
  );
}

export async function approveWorkshopLiveSessionArtifactAction(formData: FormData): Promise<void> {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const artifactId = getRequiredFormString(formData, "artifact_id");
  if (!artifactId) {
    redirect("/workshop?artifact_status=invalid_input");
  }

  const artifact = await gateway.approveWorkshopLiveSessionArtifact(session.accountId, artifactId);
  if (!artifact) {
    redirect("/workshop?artifact_status=approve_failed");
  }

  redirect(
    `/workshop?artifact_status=approved&artifact_id=${encodeURIComponent(artifact.id)}`
  );
}

export async function transitionWorkshopProStateAction(formData: FormData): Promise<void> {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const nextState = parseWorkshopProState(formData.get("next_state"));
  if (!nextState) {
    redirect("/workshop?pro_status=invalid_input");
  }

  const updated = await gateway.transitionWorkshopProState(session.accountId, nextState);
  if (!updated) {
    redirect("/workshop?pro_status=update_failed");
  }

  redirect(
    `/workshop?pro_status=updated&pro_state=${encodeURIComponent(updated.state)}`
  );
}

export async function upsertWorkshopPatronTierConfigAction(formData: FormData): Promise<void> {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const input = parseUpsertPatronTierConfigInput(formData);
  if (!input) {
    redirect("/workshop?patron_status=invalid_input");
  }

  const config = await gateway.upsertWorkshopPatronTierConfig(session.accountId, input);
  if (!config) {
    redirect("/workshop?patron_status=save_failed");
  }

  redirect(
    `/workshop?patron_status=saved&patron_config_id=${encodeURIComponent(config.id)}`
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

export async function createDropVersionAction(formData: FormData): Promise<void> {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const parsed = parseCreateDropVersionInput(formData);
  if (!parsed) {
    redirect("/workshop?version_status=invalid_input");
  }

  const created = await gateway.createDropVersion(session.accountId, parsed.dropId, parsed.input);
  if (!created) {
    redirect("/workshop?version_status=create_failed");
  }

  redirect(
    `/workshop?version_status=created&version_id=${encodeURIComponent(created.id)}`
  );
}

export async function createAuthorizedDerivativeAction(formData: FormData): Promise<void> {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const parsed = parseCreateDerivativeInput(formData);
  if (!parsed) {
    redirect("/workshop?derivative_status=invalid_input");
  }

  const created = await gateway.createAuthorizedDerivative(
    session.accountId,
    parsed.sourceDropId,
    parsed.input
  );
  if (!created) {
    redirect("/workshop?derivative_status=create_failed");
  }

  redirect(
    `/workshop?derivative_status=created&derivative_id=${encodeURIComponent(created.id)}`
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
