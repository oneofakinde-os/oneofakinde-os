export type DropDraftStatus = "empty" | "in_progress" | "ready" | "scheduled" | "published";

export type DropDraft = {
  id: string;
  studioHandle: string;
  accountId: string;
  status: DropDraftStatus;
  title: string | null;
  description: string | null;
  mode: string | null;
  worldId: string | null;
  altText: string | null;
  captions: CaptionTrack[] | null;
  scheduledAt: string | null;
  scheduledTimezone: string | null;
  createdAt: string;
  updatedAt: string;
  lastAutoSavedAt: string | null;
  version: number;
};

export type CaptionTrack = {
  language: string;
  label: string;
  url: string;
  format: "vtt" | "srt";
};

export type DropVersion = {
  dropId: string;
  version: number;
  changeSummary: string;
  changedFields: string[];
  createdAt: string;
  createdBy: string;
};

export type DropEditHistory = {
  dropId: string;
  versions: DropVersion[];
};

export type PublishStep =
  | "validation"
  | "transcoding_trigger"
  | "ledger_emission"
  | "notification_fanout"
  | "finalize";

export type PublishAttempt = {
  dropId: string;
  idempotencyToken: string;
  steps: PublishStep[];
  completedSteps: PublishStep[];
  failedStep: PublishStep | null;
  status: "pending" | "in_progress" | "completed" | "failed" | "rolled_back";
  startedAt: string;
  completedAt: string | null;
};

export type ScheduledDrop = {
  dropId: string;
  scheduledAt: string;
  timezone: string;
  status: "scheduled" | "published" | "cancelled" | "rescheduled";
  originalScheduledAt: string | null;
};

export type PublishRetryEntry = {
  dropId: string;
  attemptNumber: number;
  failedStep: PublishStep;
  error: string;
  nextRetryAt: string;
  status: "pending" | "retrying" | "exhausted";
};

export const MAX_PUBLISH_RETRIES = 3;

export const PUBLISH_STEPS_ORDER: readonly PublishStep[] = [
  "validation",
  "transcoding_trigger",
  "ledger_emission",
  "notification_fanout",
  "finalize",
] as const;

export type PrePublishCheck =
  | "title_present"
  | "mode_selected"
  | "media_uploaded"
  | "alt_text_present"
  | "world_assigned"
  | "pricing_set"
  | "ai_disclosure_set";

export type ValidationResult = {
  passed: boolean;
  checks: { check: PrePublishCheck; passed: boolean; message: string | null }[];
};

export function validateDraft(draft: DropDraft, requiredChecks: PrePublishCheck[]): ValidationResult {
  const checks = requiredChecks.map((check) => {
    switch (check) {
      case "title_present":
        return { check, passed: !!draft.title, message: draft.title ? null : "title is required" };
      case "mode_selected":
        return { check, passed: !!draft.mode, message: draft.mode ? null : "mode is required" };
      case "alt_text_present":
        return { check, passed: !!draft.altText, message: draft.altText ? null : "alt text is required for accessibility" };
      case "world_assigned":
        return { check, passed: !!draft.worldId, message: draft.worldId ? null : "world assignment is required" };
      default:
        return { check, passed: true, message: null };
    }
  });
  return { passed: checks.every((c) => c.passed), checks };
}

export function isPublishIdempotent(existing: PublishAttempt | null, token: string): boolean {
  return existing !== null && existing.idempotencyToken === token;
}

export function canRollback(attempt: PublishAttempt): boolean {
  return attempt.status === "failed" && attempt.completedSteps.length > 0;
}

export function rollbackSteps(attempt: PublishAttempt): PublishStep[] {
  return [...attempt.completedSteps].reverse();
}

export function canRetryPublish(entry: PublishRetryEntry): boolean {
  return entry.status === "pending" && entry.attemptNumber < MAX_PUBLISH_RETRIES;
}

export function computeVersionDiff(
  oldFields: Record<string, unknown>,
  newFields: Record<string, unknown>
): string[] {
  return Object.keys(newFields).filter(
    (k) => JSON.stringify(oldFields[k]) !== JSON.stringify(newFields[k])
  );
}

export function canReschedule(scheduled: ScheduledDrop): boolean {
  return scheduled.status === "scheduled";
}

export function reschedule(
  scheduled: ScheduledDrop,
  newTime: string,
  newTimezone: string
): ScheduledDrop {
  if (!canReschedule(scheduled)) return scheduled;
  return {
    ...scheduled,
    originalScheduledAt: scheduled.originalScheduledAt ?? scheduled.scheduledAt,
    scheduledAt: newTime,
    timezone: newTimezone,
    status: "rescheduled",
  };
}

export type DropTranscript = {
  dropId: string;
  language: string;
  text: string;
  generatedAt: string;
  source: "auto" | "manual";
};

export type InteractivePostType = "poll" | "qa" | "carousel";

export type PollOption = { id: string; text: string; votes: number };

export type Poll = {
  id: string;
  dropId: string;
  question: string;
  options: PollOption[];
  closesAt: string | null;
  multiSelect: boolean;
};

export type CarouselImage = {
  index: number;
  url: string;
  altText: string | null;
};

export const AUTO_SAVE_INTERVAL_MS = 30_000;

export const ALT_TEXT_REQUIRED_AT_PUBLISH =
  "image drops require alt text before publishing. this is a hard accessibility gate.";
