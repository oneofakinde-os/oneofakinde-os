export type WorkshopView = "calendar" | "list" | "board";

export type CreatorDashboardWidget =
  | "recent_activity"
  | "revenue_summary"
  | "follower_growth"
  | "draft_queue"
  | "scheduled_drops"
  | "patron_summary"
  | "world_health";

export type DraftQueue = {
  studioHandle: string;
  drafts: DraftQueueEntry[];
};

export type DraftQueueEntry = {
  draftId: string;
  title: string | null;
  mode: string | null;
  lastEditedAt: string;
  completionPercentage: number;
};

export type CollaboratorInvite = {
  id: string;
  dropId: string;
  inviterAccountId: string;
  inviteeEmail: string;
  role: "co_creator" | "editor" | "reviewer";
  status: "pending" | "accepted" | "declined" | "expired";
  invitedAt: string;
  expiresAt: string;
};

export type BatchPublishJob = {
  id: string;
  studioHandle: string;
  dropIds: string[];
  scheduledAt: string | null;
  status: "pending" | "processing" | "completed" | "partial_failure";
  results: { dropId: string; success: boolean; error: string | null }[];
};

export type ImportExportFormat = "zip" | "json";

export type StudioExport = {
  studioHandle: string;
  format: ImportExportFormat;
  includeMedia: boolean;
  includeAnalytics: boolean;
  generatedAt: string;
  downloadUrl: string;
};

export type ContentCalendarEntry = {
  id: string;
  studioHandle: string;
  type: "draft" | "scheduled" | "published" | "event";
  title: string;
  date: string;
  dropId: string | null;
  eventId: string | null;
};

export function computeDraftCompletion(
  hasTitle: boolean,
  hasMode: boolean,
  hasMedia: boolean,
  hasWorld: boolean,
  hasAltText: boolean
): number {
  const checks = [hasTitle, hasMode, hasMedia, hasWorld, hasAltText];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function isCollaboratorInviteValid(invite: CollaboratorInvite, nowIso: string): boolean {
  return invite.status === "pending" && nowIso <= invite.expiresAt;
}
