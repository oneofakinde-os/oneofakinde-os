export type VanishingMessageConfig = {
  threadId: string;
  enabled: boolean;
  ttlSeconds: number;
  enabledBy: string;
  enabledAt: string;
};

export type VanishingMessage = {
  messageId: string;
  threadId: string;
  sentAt: string;
  expiresAt: string;
  expired: boolean;
};

export const VANISHING_TTL_OPTIONS: readonly number[] = [
  30, 60, 300, 3600, 86400,
] as const;

export function isVanishingExpired(message: VanishingMessage, nowMs: number): boolean {
  return nowMs >= Date.parse(message.expiresAt);
}

export function computeVanishingExpiry(sentAtIso: string, ttlSeconds: number): string {
  const d = new Date(sentAtIso);
  d.setTime(d.getTime() + ttlSeconds * 1000);
  return d.toISOString();
}

export function isValidTtl(ttlSeconds: number): boolean {
  return (VANISHING_TTL_OPTIONS as readonly number[]).includes(ttlSeconds);
}

export const VANISHING_MESSAGES_COMMITMENT =
  "vanishing messages are deleted from all storage after expiry. " +
  "no server-side copy is retained. the platform cannot recover expired messages.";
