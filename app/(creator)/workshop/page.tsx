import { WorkshopRootScreen } from "@/features/workshop/workshop-root-screen";
import { requireSessionRoles } from "@/lib/server/session";
import { loadWorkshopContext } from "@/lib/server/workshop";
import {
  createAuthorizedDerivativeAction,
  createDropVersionAction,
  createWorkshopWorldReleaseAction,
  createWorkshopLiveSessionAction,
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
    moderation_status?: string | string[];
    moderation_comment_id?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
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
  const moderationStatus = firstParam(resolvedSearchParams.moderation_status);
  const moderationCommentId = firstParam(resolvedSearchParams.moderation_comment_id);
  const context = await loadWorkshopContext(session);

  return (
    <WorkshopRootScreen
      session={session}
      eventNotice={toEventNotice(eventStatus, eventId)}
      releaseNotice={toReleaseNotice(releaseStatus, releaseId)}
      versionNotice={toVersionNotice(versionStatus, versionId)}
      derivativeNotice={toDerivativeNotice(derivativeStatus, derivativeId)}
      moderationNotice={toModerationNotice(moderationStatus, moderationCommentId)}
      createLiveSessionAction={createWorkshopLiveSessionAction}
      createWorldReleaseAction={createWorkshopWorldReleaseAction}
      updateWorldReleaseStatusAction={updateWorkshopWorldReleaseStatusAction}
      createDropVersionAction={createDropVersionAction}
      createAuthorizedDerivativeAction={createAuthorizedDerivativeAction}
      resolveModerationAction={resolveWorkshopModerationCaseAction}
      {...context}
    />
  );
}
