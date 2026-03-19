import { WorkshopRootScreen } from "@/features/workshop/workshop-root-screen";
import { requireSessionRoles } from "@/lib/server/session";
import { loadWorkshopContext } from "@/lib/server/workshop";
import {
  approveWorkshopLiveSessionArtifactAction,
  captureWorkshopLiveSessionArtifactAction,
  createAuthorizedDerivativeAction,
  createDropVersionAction,
  upsertWorkshopPatronTierConfigAction,
  validateWorkshopPublishGateAction,
  createWorkshopWorldReleaseAction,
  createWorkshopLiveSessionAction,
  transitionWorkshopProStateAction,
  updateWorkshopWorldReleaseStatusAction,
  resolveWorkshopModerationCaseAction
} from "./actions";

type WorkshopPageProps = {
  searchParams: Promise<{
    event_status?: string | string[];
    event_id?: string | string[];
    release_status?: string | string[];
    release_id?: string | string[];
    version_status?: string | string[];
    version_id?: string | string[];
    derivative_status?: string | string[];
    derivative_id?: string | string[];
    patron_status?: string | string[];
    patron_config_id?: string | string[];
    artifact_status?: string | string[];
    artifact_id?: string | string[];
    pro_status?: string | string[];
    pro_state?: string | string[];
    moderation_status?: string | string[];
    moderation_comment_id?: string | string[];
    compose?: string | string[];
    culture_complete?: string | string[];
    access_complete?: string | string[];
    economics_complete?: string | string[];
    visibility?: string | string[];
    preview_policy?: string | string[];
    collaborator_splits?: string | string[];
    splits_total?: string | string[];
    world_visual_identity_complete?: string | string[];
    world_lore_complete?: string | string[];
    world_entry_rule_complete?: string | string[];
    publish_status?: string | string[];
    publish_missing?: string | string[];
    publish_blockers?: string | string[];
    world_missing?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

function parseFlag(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

function toEventNotice(eventStatus: string | null, eventId: string | null): string | null {
  if (!eventStatus) {
    return null;
  }

  if (eventStatus === "created") {
    return eventId
      ? `live session created: ${eventId}. it is now visible in collect gated events.`
      : "live session created. it is now visible in collect gated events.";
  }

  if (eventStatus === "invalid_input") {
    return "live session could not be created. check title, time fields, and eligibility requirements.";
  }

  if (eventStatus === "create_failed") {
    return "live session could not be created for this creator/workshop scope.";
  }

  return "workshop live-session status updated.";
}

function toModerationNotice(
  moderationStatus: string | null,
  moderationCommentId: string | null
): string | null {
  if (!moderationStatus) {
    return null;
  }

  if (moderationStatus === "resolved") {
    return moderationCommentId
      ? `moderation case resolved: ${moderationCommentId}.`
      : "moderation case resolved.";
  }

  if (moderationStatus === "invalid_input") {
    return "moderation action failed: missing or invalid resolution input.";
  }

  if (moderationStatus === "forbidden") {
    return "moderation action blocked: creator authorization is required.";
  }

  if (moderationStatus === "not_found") {
    return "moderation case not found.";
  }

  return "workshop moderation status updated.";
}

function toVersionNotice(versionStatus: string | null, versionId: string | null): string | null {
  if (!versionStatus) {
    return null;
  }

  if (versionStatus === "created") {
    return versionId ? `drop version created: ${versionId}.` : "drop version created.";
  }

  if (versionStatus === "invalid_input") {
    return "drop version create failed: check drop, label, and release timestamp.";
  }

  if (versionStatus === "create_failed") {
    return "drop version create failed: verify creator scope and lineage policy constraints.";
  }

  return "drop version status updated.";
}

function toDerivativeNotice(
  derivativeStatus: string | null,
  derivativeId: string | null
): string | null {
  if (!derivativeStatus) {
    return null;
  }

  if (derivativeStatus === "created") {
    return derivativeId
      ? `authorized derivative created: ${derivativeId}.`
      : "authorized derivative created.";
  }

  if (derivativeStatus === "invalid_input") {
    return "authorized derivative create failed: check source, target, kind, attribution, and split format.";
  }

  if (derivativeStatus === "create_failed") {
    return "authorized derivative create failed: verify creator scope, uniqueness, and split policy.";
  }

  return "authorized derivative status updated.";
}

function toReleaseNotice(releaseStatus: string | null, releaseId: string | null): string | null {
  if (!releaseStatus) {
    return null;
  }

  if (releaseStatus === "scheduled") {
    return releaseId
      ? `world release scheduled: ${releaseId}.`
      : "world release scheduled.";
  }

  if (releaseStatus === "published") {
    return releaseId
      ? `world release published: ${releaseId}.`
      : "world release published.";
  }

  if (releaseStatus === "canceled") {
    return releaseId
      ? `world release canceled: ${releaseId}.`
      : "world release canceled.";
  }

  if (releaseStatus === "invalid_input") {
    return "world release action failed: check world, drop, schedule, and pacing values.";
  }

  if (releaseStatus === "update_failed" || releaseStatus === "create_failed") {
    return "world release action failed: check world ownership, drop scope, and pacing conflicts.";
  }

  return "workshop world release queue updated.";
}

function toPatronNotice(patronStatus: string | null, patronConfigId: string | null): string | null {
  if (!patronStatus) {
    return null;
  }

  if (patronStatus === "saved") {
    return patronConfigId
      ? `patron tier config saved: ${patronConfigId}.`
      : "patron tier config saved.";
  }

  if (patronStatus === "invalid_input") {
    return "patron tier config failed: check title, amount, period, and status.";
  }

  if (patronStatus === "save_failed") {
    return "patron tier config failed: verify creator scope and world ownership.";
  }

  return "patron tier config updated.";
}

function toArtifactNotice(artifactStatus: string | null, artifactId: string | null): string | null {
  if (!artifactStatus) {
    return null;
  }

  if (artifactStatus === "captured") {
    return artifactId
      ? `live session artifact captured for review: ${artifactId}.`
      : "live session artifact captured for review.";
  }

  if (artifactStatus === "approved") {
    return artifactId
      ? `live session artifact approved and promoted to catalog drop: ${artifactId}.`
      : "live session artifact approved and promoted to catalog drop.";
  }

  if (artifactStatus === "invalid_input") {
    return "artifact action failed: check live session, title, and artifact identifiers.";
  }

  if (artifactStatus === "capture_failed" || artifactStatus === "approve_failed") {
    return "artifact action failed: verify creator scope, live session lineage, and artifact status.";
  }

  return "workshop live-session artifact status updated.";
}

function toProNotice(proStatus: string | null, proState: string | null): string | null {
  if (!proStatus) {
    return null;
  }

  if (proStatus === "updated") {
    return proState
      ? `workshop pro state updated: ${proState.replaceAll("_", " ")}.`
      : "workshop pro state updated.";
  }

  if (proStatus === "invalid_input") {
    return "workshop pro state update failed: invalid transition request.";
  }

  if (proStatus === "update_failed") {
    return "workshop pro state update failed: transition is not allowed for current state.";
  }

  return "workshop pro state updated.";
}

function toPublishNotice(
  publishStatus: string | null,
  missingSections: string | null,
  blockers: string | null,
  missingWorldSections: string | null
): string | null {
  if (!publishStatus) {
    return null;
  }

  if (publishStatus === "ready") {
    return "publish gate passed: culture, access, and economics are complete.";
  }

  if (publishStatus === "blocked") {
    const sectionCopy = missingSections ? ` missing sections: ${missingSections.replaceAll(",", ", ")}.` : "";
    const blockerCopy = blockers ? ` blockers: ${blockers}.` : "";
    return `publish blocked by hard gate.${sectionCopy}${blockerCopy}`;
  }

  if (publishStatus === "world_ready") {
    return "world builder is complete: visual identity, lore, and entry rule are all set.";
  }

  if (publishStatus === "world_incomplete") {
    return missingWorldSections
      ? `world builder is incomplete. missing: ${missingWorldSections.replaceAll(",", ", ")}.`
      : "world builder is incomplete. complete visual identity, lore, and entry rule.";
  }

  return "workshop publish stepper updated.";
}

export default async function WorkshopPage({ searchParams }: WorkshopPageProps) {
  const session = await requireSessionRoles("/workshop", ["creator"]);
  const resolvedSearchParams = await searchParams;
  const eventStatus = firstParam(resolvedSearchParams.event_status);
  const eventId = firstParam(resolvedSearchParams.event_id);
  const releaseStatus = firstParam(resolvedSearchParams.release_status);
  const releaseId = firstParam(resolvedSearchParams.release_id);
  const versionStatus = firstParam(resolvedSearchParams.version_status);
  const versionId = firstParam(resolvedSearchParams.version_id);
  const derivativeStatus = firstParam(resolvedSearchParams.derivative_status);
  const derivativeId = firstParam(resolvedSearchParams.derivative_id);
  const patronStatus = firstParam(resolvedSearchParams.patron_status);
  const patronConfigId = firstParam(resolvedSearchParams.patron_config_id);
  const artifactStatus = firstParam(resolvedSearchParams.artifact_status);
  const artifactId = firstParam(resolvedSearchParams.artifact_id);
  const proStatus = firstParam(resolvedSearchParams.pro_status);
  const proState = firstParam(resolvedSearchParams.pro_state);
  const moderationStatus = firstParam(resolvedSearchParams.moderation_status);
  const moderationCommentId = firstParam(resolvedSearchParams.moderation_comment_id);
  const compose = firstParam(resolvedSearchParams.compose);
  const cultureComplete = parseFlag(firstParam(resolvedSearchParams.culture_complete));
  const accessComplete = parseFlag(firstParam(resolvedSearchParams.access_complete));
  const economicsComplete = parseFlag(firstParam(resolvedSearchParams.economics_complete));
  const visibility = firstParam(resolvedSearchParams.visibility);
  const previewPolicy = firstParam(resolvedSearchParams.preview_policy);
  const collaboratorSplitsRaw = firstParam(resolvedSearchParams.collaborator_splits);
  const splitsTotalRaw = firstParam(resolvedSearchParams.splits_total);
  const worldVisualIdentityComplete = parseFlag(
    firstParam(resolvedSearchParams.world_visual_identity_complete)
  );
  const worldLoreComplete = parseFlag(firstParam(resolvedSearchParams.world_lore_complete));
  const worldEntryRuleComplete = parseFlag(
    firstParam(resolvedSearchParams.world_entry_rule_complete)
  );
  const publishStatus = firstParam(resolvedSearchParams.publish_status);
  const publishMissing = firstParam(resolvedSearchParams.publish_missing);
  const publishBlockers = firstParam(resolvedSearchParams.publish_blockers);
  const worldMissing = firstParam(resolvedSearchParams.world_missing);

  const parsedSplitsTotal = splitsTotalRaw ? Number(splitsTotalRaw) : undefined;
  const context = await loadWorkshopContext(session, {
    compose,
    cultureComplete,
    accessComplete,
    economicsComplete,
    visibility,
    previewPolicy,
    collaboratorSplitsRaw,
    collaboratorSplitsTotal: Number.isFinite(parsedSplitsTotal ?? Number.NaN)
      ? parsedSplitsTotal
      : undefined,
    worldVisualIdentityComplete,
    worldLoreComplete,
    worldEntryRuleComplete
  });

  return (
    <WorkshopRootScreen
      session={session}
      publishNotice={toPublishNotice(publishStatus, publishMissing, publishBlockers, worldMissing)}
      eventNotice={toEventNotice(eventStatus, eventId)}
      releaseNotice={toReleaseNotice(releaseStatus, releaseId)}
      versionNotice={toVersionNotice(versionStatus, versionId)}
      derivativeNotice={toDerivativeNotice(derivativeStatus, derivativeId)}
      patronNotice={toPatronNotice(patronStatus, patronConfigId)}
      artifactNotice={toArtifactNotice(artifactStatus, artifactId)}
      proNotice={toProNotice(proStatus, proState)}
      moderationNotice={toModerationNotice(moderationStatus, moderationCommentId)}
      validatePublishGateAction={validateWorkshopPublishGateAction}
      createLiveSessionAction={createWorkshopLiveSessionAction}
      captureLiveSessionArtifactAction={captureWorkshopLiveSessionArtifactAction}
      approveLiveSessionArtifactAction={approveWorkshopLiveSessionArtifactAction}
      transitionWorkshopProStateAction={transitionWorkshopProStateAction}
      upsertPatronTierConfigAction={upsertWorkshopPatronTierConfigAction}
      createWorldReleaseAction={createWorkshopWorldReleaseAction}
      updateWorldReleaseStatusAction={updateWorkshopWorldReleaseStatusAction}
      createDropVersionAction={createDropVersionAction}
      createAuthorizedDerivativeAction={createAuthorizedDerivativeAction}
      resolveModerationAction={resolveWorkshopModerationCaseAction}
      {...context}
    />
  );
}
