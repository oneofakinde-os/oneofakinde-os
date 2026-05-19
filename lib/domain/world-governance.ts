export type WorldRole = "owner" | "moderator" | "helper" | "member";

export type WorldMember = {
  accountId: string;
  worldId: string;
  role: WorldRole;
  joinedAt: string;
  displayInRoster: boolean;
};

export type WorldModerationPolicy = {
  worldId: string;
  guidelines: string;
  keywordFilters: string[];
  autoModEnabled: boolean;
  publishedAt: string;
};

export type WorldPermission =
  | "manage_members"
  | "moderate_content"
  | "pin_drops"
  | "edit_guidelines"
  | "send_announcements"
  | "manage_events";

export const ROLE_PERMISSIONS: Record<WorldRole, readonly WorldPermission[]> = {
  owner: ["manage_members", "moderate_content", "pin_drops", "edit_guidelines", "send_announcements", "manage_events"],
  moderator: ["moderate_content", "pin_drops", "send_announcements"],
  helper: ["moderate_content"],
  member: [],
};

export function hasWorldPermission(role: WorldRole, permission: WorldPermission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}

export type AutoModerationAction = "hide" | "flag" | "delete";

export type AutoModerationRule = {
  worldId: string;
  type: "keyword" | "spam_pattern" | "new_account";
  value: string;
  action: AutoModerationAction;
};

export function matchesKeywordFilter(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

export type WorldAnnouncement = {
  id: string;
  worldId: string;
  authorId: string;
  title: string;
  body: string;
  pinnedUntil: string | null;
  createdAt: string;
};

export type WorldEvent = {
  id: string;
  worldId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  recurring: boolean;
  rsvpCount: number;
  createdAt: string;
};

export type MemberDirectory = {
  worldId: string;
  members: WorldMember[];
  totalCount: number;
};

export function isWorldModerator(role: WorldRole): boolean {
  return role === "owner" || role === "moderator";
}

export function canManageWorld(role: WorldRole): boolean {
  return role === "owner";
}
