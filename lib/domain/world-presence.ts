export type PresenceType = "ambient" | "active" | "away" | "invisible";

export type WorldPresence = {
  accountId: string;
  worldId: string;
  presenceType: PresenceType;
  lastActiveAt: string;
  motion: MotionState | null;
};

export type MotionState = {
  type: "idle" | "browsing" | "listening" | "watching" | "reading";
  dropId: string | null;
  startedAt: string;
};

export type PresenceAggregate = {
  worldId: string;
  totalPresent: number;
  byType: Record<PresenceType, number>;
  updatedAt: string;
};

export function isActivePresence(presence: WorldPresence): boolean {
  return presence.presenceType === "active" || presence.presenceType === "ambient";
}

export function computePresenceCount(presences: WorldPresence[]): number {
  return presences.filter((p) => p.presenceType !== "invisible").length;
}

export const PRESENCE_TIMEOUT_MS = 300_000;

export function isPresenceStale(lastActiveIso: string, nowMs: number): boolean {
  return nowMs - Date.parse(lastActiveIso) > PRESENCE_TIMEOUT_MS;
}
